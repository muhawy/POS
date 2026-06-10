import { defaultSettings, seedData, STORAGE_KEY, TAX_RATE } from '../data/seedData'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''
const DATA_MODE = import.meta.env.VITE_DATA_MODE || 'local'
const useRemoteApi = DATA_MODE === 'remote'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeData(data) {
  const productCategories = Array.isArray(data?.products)
    ? data.products.map((product) => String(product.category || '').trim()).filter(Boolean)
    : []
  const settingsCategories = Array.isArray(data?.settings?.categories) ? data.settings.categories : null
  const baseCategories = settingsCategories ?? (productCategories.length > 0 ? productCategories : defaultSettings.categories)
  const categories = [...new Set(baseCategories.map((category) => String(category).trim()).filter(Boolean))]

  return {
    products: Array.isArray(data?.products)
      ? data.products.map((product) => ({ ...product, imageUrl: product.imageUrl || '' }))
      : [],
    customers: Array.isArray(data?.customers) ? data.customers : [],
    sales: Array.isArray(data?.sales)
      ? data.sales.map((sale) => ({
          ...sale,
          items: Array.isArray(sale.items)
            ? sale.items.map((item) => ({ ...item, imageUrl: item.imageUrl || '' }))
            : [],
        }))
      : [],
    settings: {
      ...defaultSettings,
      ...(data?.settings || {}),
      taxEnabled: data?.settings?.taxEnabled ?? defaultSettings.taxEnabled,
      categories,
    },
  }
}

function readLocalData() {
  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    const initialData = clone(seedData)
    writeLocalData(initialData)
    return initialData
  }

  try {
    return normalizeData(JSON.parse(saved))
  } catch {
    const initialData = clone(seedData)
    writeLocalData(initialData)
    return initialData
  }
}

function writeLocalData(data) {
  const normalized = normalizeData(data)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || 'API request failed.')
  }
  return payload
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createInvoiceNumber(sales) {
  return `INV-${String(sales.length + 1).padStart(5, '0')}`
}

function getCustomer(data, customerId) {
  const customer = data.customers.find((item) => item.id === customerId)
  if (!customer) throw new Error('Customer not found.')
  return customer
}

function assertPin(pin, label) {
  if (!/^\d{6}$/.test(String(pin))) {
    throw new Error(`${label} PIN must be exactly 6 numbers.`)
  }
}

function createLocalProduct(input) {
  const data = readLocalData()
  const product = {
    id: createId('p'),
    name: String(input.name ?? '').trim(),
    sku: String(input.sku ?? '').trim().toUpperCase(),
    category: String(input.category ?? '').trim() || 'General',
    price: Number(input.price),
    cost: Number(input.cost) || 0,
    stock: Number(input.stock),
    imageUrl: String(input.imageUrl ?? ''),
  }

  if (!product.name || !product.sku || product.price < 1 || product.stock < 0) {
    throw new Error('Product name, SKU, selling price, and stock are required.')
  }

  if (data.products.some((item) => item.sku === product.sku)) {
    throw new Error('SKU already exists.')
  }

  const nextData = writeLocalData({
    ...data,
    products: [product, ...data.products],
  })
  return { product, data: nextData }
}

function adjustLocalProductStock(productId, amount) {
  const data = readLocalData()
  let updatedProduct = null
  const products = data.products.map((product) => {
    if (product.id !== productId) return product
    updatedProduct = { ...product, stock: Math.max(product.stock + Number(amount), 0) }
    return updatedProduct
  })

  if (!updatedProduct) throw new Error('Product not found.')

  const nextData = writeLocalData({ ...data, products })
  return { product: updatedProduct, data: nextData }
}

function deleteLocalProduct(productId) {
  const data = readLocalData()
  const nextData = writeLocalData({
    ...data,
    products: data.products.filter((product) => product.id !== productId),
  })
  return { data: nextData }
}

function checkoutLocalSale(input) {
  const data = readLocalData()
  const cart = Array.isArray(input.cart) ? input.cart : []
  const paid = Number(input.paid) || 0
  const paymentMethod = String(input.paymentMethod ?? 'Cash')
  const customerId = String(input.customerId ?? 'c-walkin')

  if (cart.length === 0) throw new Error('Cart is empty.')

  const customer = getCustomer(data, customerId)
  const products = cart.map((cartItem) => {
    const product = data.products.find((item) => item.id === cartItem.id)
    const quantity = Number(cartItem.quantity)
    if (!product) throw new Error(`Product ${cartItem.id} not found.`)
    if (quantity < 1) throw new Error('Quantity must be at least 1.')
    if (quantity > product.stock) throw new Error(`${product.name} does not have enough stock.`)
    return { ...product, quantity }
  })

  const subtotal = products.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = data.settings.taxEnabled ? Math.round(subtotal * TAX_RATE) : 0
  const total = subtotal + tax
  if (paid < total) throw new Error('Paid amount is lower than total.')

  const saleItems = products.map((item) => ({
    productId: item.id,
    name: item.name,
    sku: item.sku,
    price: item.price,
    cost: item.cost,
    imageUrl: item.imageUrl || '',
    quantity: item.quantity,
    lineTotal: item.price * item.quantity,
  }))
  const sale = {
    id: createId('sale'),
    number: createInvoiceNumber(data.sales),
    date: new Date().toISOString(),
    customerId: customer.id,
    customerName: customer.name,
    paymentMethod,
    subtotal,
    tax,
    total,
    paid,
    change: paid - total,
    profit: saleItems.reduce((sum, item) => sum + (item.price - item.cost) * item.quantity, 0),
    items: saleItems,
  }

  const productsById = new Map(products.map((product) => [product.id, product]))
  const nextProducts = data.products.map((product) => {
    const soldProduct = productsById.get(product.id)
    if (!soldProduct) return product
    return { ...product, stock: product.stock - soldProduct.quantity }
  })
  const nextData = writeLocalData({
    ...data,
    products: nextProducts,
    sales: [sale, ...data.sales],
  })

  return { sale, data: nextData }
}

function resetLocalDemoData() {
  return writeLocalData(clone(seedData))
}

function updateLocalSettings(input) {
  const data = readLocalData()
  const settings = {
    ...data.settings,
    ...input,
  }

  assertPin(settings.adminPin, 'Admin')
  assertPin(settings.operatorPin, 'Operator')
  if (settings.adminPin === settings.operatorPin) {
    throw new Error('Admin and operator PINs must be different.')
  }
  settings.taxEnabled = Boolean(settings.taxEnabled)
  settings.categories = Array.isArray(settings.categories)
    ? [...new Set(settings.categories.map((category) => String(category).trim()).filter(Boolean))]
    : defaultSettings.categories

  const nextData = writeLocalData({ ...data, settings })
  return { settings: nextData.settings, data: nextData }
}

export function fetchPosData() {
  if (useRemoteApi) return request('/api/data')
  return Promise.resolve(readLocalData())
}

export function createProduct(product) {
  if (useRemoteApi) {
    return request('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    })
  }

  return Promise.resolve(createLocalProduct(product))
}

export function adjustProductStock(productId, amount) {
  if (useRemoteApi) {
    return request(`/api/products/${productId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    })
  }

  return Promise.resolve(adjustLocalProductStock(productId, amount))
}

export function deleteProduct(productId) {
  if (useRemoteApi) {
    return request(`/api/products/${productId}`, {
      method: 'DELETE',
    })
  }

  return Promise.resolve(deleteLocalProduct(productId))
}

export function checkoutSale(order) {
  if (useRemoteApi) {
    return request('/api/sales/checkout', {
      method: 'POST',
      body: JSON.stringify(order),
    })
  }

  return Promise.resolve(checkoutLocalSale(order))
}

export function resetDemoData() {
  if (useRemoteApi) {
    return request('/api/reset', {
      method: 'POST',
    })
  }

  return Promise.resolve(resetLocalDemoData())
}

export function updateSettings(settings) {
  if (useRemoteApi) {
    return request('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })
  }

  return Promise.resolve(updateLocalSettings(settings))
}
