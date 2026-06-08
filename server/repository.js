import { db, resetDatabase } from './db.js'
import { defaultSettings, seedData } from './seedData.js'

const TAX_RATE = 0.11

export function getAllData() {
  return {
    products: getProducts(),
    customers: getCustomers(),
    sales: getSales(),
    settings: getSettings(),
  }
}

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const settings = { ...defaultSettings }

  rows.forEach((row) => {
    try {
      settings[row.key] = JSON.parse(row.value)
    } catch {
      settings[row.key] = row.value
    }
  })

  return {
    ...settings,
    taxEnabled: settings.taxEnabled ?? defaultSettings.taxEnabled,
  }
}

function assertPin(pin, label) {
  if (!/^\d{6}$/.test(String(pin))) {
    throw new Error(`${label} PIN must be exactly 6 numbers.`)
  }
}

export function updateSettings(input) {
  const settings = {
    ...getSettings(),
    ...input,
  }

  assertPin(settings.adminPin, 'Admin')
  assertPin(settings.operatorPin, 'Operator')
  if (settings.adminPin === settings.operatorPin) {
    throw new Error('Admin and operator PINs must be different.')
  }
  settings.taxEnabled = Boolean(settings.taxEnabled)

  const statement = db.prepare(`
    INSERT INTO settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `)

  Object.entries(settings).forEach(([key, value]) => {
    statement.run(key, JSON.stringify(value))
  })

  return { settings: getSettings(), data: getAllData() }
}

export function getProducts() {
  return db.prepare('SELECT id, name, sku, category, price, cost, stock, image_url AS imageUrl FROM products ORDER BY rowid DESC').all()
}

export function getCustomers() {
  return db.prepare('SELECT id, name, phone FROM customers ORDER BY rowid ASC').all()
}

export function getSales() {
  const sales = db.prepare(`
    SELECT
      id,
      number,
      date,
      customer_id AS customerId,
      customer_name AS customerName,
      payment_method AS paymentMethod,
      subtotal,
      tax,
      total,
      paid,
      change_amount AS change,
      profit
    FROM sales
    ORDER BY date DESC
  `).all()

  const itemsStatement = db.prepare(`
    SELECT
      product_id AS productId,
      name,
      sku,
      price,
      cost,
      image_url AS imageUrl,
      quantity,
      line_total AS lineTotal
    FROM sale_items
    WHERE sale_id = ?
  `)

  return sales.map((sale) => ({
    ...sale,
    items: itemsStatement.all(sale.id),
  }))
}

export function createProduct(input) {
  const product = {
    id: `p-${Date.now()}`,
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

  db.prepare(`
    INSERT INTO products (id, name, sku, category, price, cost, stock, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(product.id, product.name, product.sku, product.category, product.price, product.cost, product.stock, product.imageUrl)

  return product
}

export function adjustProductStock(productId, amount) {
  const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(productId)
  if (!product) throw new Error('Product not found.')

  const nextStock = Math.max(product.stock + Number(amount), 0)
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(nextStock, productId)
  return db.prepare('SELECT id, name, sku, category, price, cost, stock, image_url AS imageUrl FROM products WHERE id = ?').get(productId)
}

export function deleteProduct(productId) {
  db.prepare('DELETE FROM products WHERE id = ?').run(productId)
}

export function checkoutSale(input) {
  const cart = Array.isArray(input.cart) ? input.cart : []
  const paid = Number(input.paid) || 0
  const paymentMethod = String(input.paymentMethod ?? 'Cash')
  const customerId = String(input.customerId ?? 'c-walkin')

  if (cart.length === 0) throw new Error('Cart is empty.')

  const customer = db.prepare('SELECT id, name FROM customers WHERE id = ?').get(customerId)
  if (!customer) throw new Error('Customer not found.')

  const products = cart.map((cartItem) => {
    const product = db.prepare('SELECT id, name, sku, price, cost, stock, image_url AS imageUrl FROM products WHERE id = ?').get(cartItem.id)
    const quantity = Number(cartItem.quantity)
    if (!product) throw new Error(`Product ${cartItem.id} not found.`)
    if (quantity < 1) throw new Error('Quantity must be at least 1.')
    if (quantity > product.stock) throw new Error(`${product.name} does not have enough stock.`)
    return { ...product, quantity }
  })

  const subtotal = products.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = getSettings().taxEnabled ? Math.round(subtotal * TAX_RATE) : 0
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
  const profit = saleItems.reduce((sum, item) => sum + (item.price - item.cost) * item.quantity, 0)
  const salesCount = db.prepare('SELECT COUNT(*) AS total FROM sales').get().total
  const sale = {
    id: `sale-${Date.now()}`,
    number: `INV-${String(salesCount + 1).padStart(5, '0')}`,
    date: new Date().toISOString(),
    customerId: customer.id,
    customerName: customer.name,
    paymentMethod,
    subtotal,
    tax,
    total,
    paid,
    change: paid - total,
    profit,
    items: saleItems,
  }

  db.exec('BEGIN')
  try {
    db.prepare(`
      INSERT INTO sales (
        id, number, date, customer_id, customer_name, payment_method,
        subtotal, tax, total, paid, change_amount, profit
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sale.id,
      sale.number,
      sale.date,
      sale.customerId,
      sale.customerName,
      sale.paymentMethod,
      sale.subtotal,
      sale.tax,
      sale.total,
      sale.paid,
      sale.change,
      sale.profit,
    )

    const insertItem = db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, name, sku, price, cost, image_url, quantity, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')

    sale.items.forEach((item) => {
      insertItem.run(sale.id, item.productId, item.name, item.sku, item.price, item.cost, item.imageUrl, item.quantity, item.lineTotal)
      updateStock.run(item.quantity, item.productId)
    })

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  return sale
}

export function resetDemoDatabase() {
  resetDatabase(seedData)
  return getAllData()
}
