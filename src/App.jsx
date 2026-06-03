import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import { MetricCard } from './components/MetricCard'
import { MobileTab } from './components/MobileTab'
import { NavButton } from './components/NavButton'
import { emptyProductForm, TAX_RATE } from './data/seedData'
import {
  adjustProductStock,
  checkoutSale,
  createProduct,
  deleteProduct as deleteProductRequest,
  fetchPosData,
  resetDemoData as resetDemoDataRequest,
} from './services/api'
import { startOfToday } from './utils/dates'
import { formatCurrency, todayLabel } from './utils/formatters'
import { InventoryView } from './views/InventoryView'
import { ReportsView } from './views/ReportsView'
import { SalesView } from './views/SalesView'
import { TransactionsView } from './views/TransactionsView'

export function App() {
  const [data, setData] = useState({ products: [], sales: [], customers: [] })
  const [activeView, setActiveView] = useState('sales')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState('c-walkin')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadServerData() {
      try {
        setData(await fetchPosData())
      } catch (apiError) {
        setError(apiError.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadServerData()
  }, [])

  const metrics = useMemo(() => {
    const today = startOfToday()
    const todaySales = data.sales.filter((sale) => new Date(sale.date) >= today)
    const revenue = data.sales.reduce((sum, sale) => sum + sale.total, 0)
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0)
    const lowStock = data.products.filter((product) => product.stock <= 10).length
    const grossProfit = data.sales.reduce((sum, sale) => sum + sale.profit, 0)

    return { revenue, todayRevenue, orders: data.sales.length, lowStock, grossProfit }
  }, [data])

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return data.products
    return data.products.filter((product) =>
      [product.name, product.sku, product.category].join(' ').toLowerCase().includes(normalized),
    )
  }, [data.products, query])

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = Math.round(subtotal * TAX_RATE)
  const total = subtotal + tax
  const paid = Number(amountPaid) || 0
  const change = Math.max(paid - total, 0)

  function addToCart(product) {
    if (product.stock <= 0) return

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return current
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...current, { ...product, quantity: 1 }]
    })
  }

  function updateQuantity(productId, direction) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== productId) return item
          const stock = data.products.find((product) => product.id === productId)?.stock ?? 0
          const nextQuantity = direction === 'increase' ? item.quantity + 1 : item.quantity - 1
          return { ...item, quantity: Math.min(Math.max(nextQuantity, 0), stock) }
        })
        .filter((item) => item.quantity > 0),
    )
  }

  function removeCartItem(productId) {
    setCart((current) => current.filter((item) => item.id !== productId))
  }

  async function checkout() {
    if (!cart.length || paid < total) return

    try {
      const result = await checkoutSale({
        cart,
        customerId: selectedCustomer,
        paymentMethod,
        paid,
      })
      setData(result.data)
      setCart([])
      setAmountPaid('')
      setSelectedCustomer('c-walkin')
      setError('')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  async function saveProduct(event) {
    event.preventDefault()
    const cleanProduct = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim().toUpperCase(),
      category: productForm.category.trim() || 'General',
      price: Number(productForm.price),
      cost: Number(productForm.cost),
      stock: Number(productForm.stock),
    }

    if (!cleanProduct.name || !cleanProduct.sku || cleanProduct.price < 1 || cleanProduct.stock < 0) return

    try {
      const result = await createProduct(cleanProduct)
      setData(result.data)
      setProductForm(emptyProductForm)
      setError('')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  async function adjustStock(productId, amount) {
    try {
      const result = await adjustProductStock(productId, amount)
      setData(result.data)
      setError('')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  async function deleteProduct(productId) {
    try {
      const result = await deleteProductRequest(productId)
      setData(result.data)
      setCart((current) => current.filter((item) => item.id !== productId))
      setError('')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  async function resetDemoData() {
    try {
      setData(await resetDemoDataRequest())
      setCart([])
      setAmountPaid('')
      setSelectedCustomer('c-walkin')
      setError('')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white px-5 py-6 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-emerald-600 text-white">
            <CreditCard size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Local POS</h1>
            <p className="text-sm text-zinc-500">Offline store manager</p>
          </div>
        </div>

        <nav className="space-y-2">
          <NavButton icon={ShoppingCart} label="Sales" active={activeView === 'sales'} onClick={() => setActiveView('sales')} />
          <NavButton icon={Boxes} label="Inventory" active={activeView === 'inventory'} onClick={() => setActiveView('inventory')} />
          <NavButton icon={ReceiptText} label="Transactions" active={activeView === 'transactions'} onClick={() => setActiveView('transactions')} />
          <NavButton icon={BarChart3} label="Reports" active={activeView === 'reports'} onClick={() => setActiveView('reports')} />
        </nav>

        <button
          type="button"
          onClick={resetDemoData}
          className="absolute bottom-6 left-5 right-5 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Reset Local Data
        </button>
      </aside>

      <section className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">{todayLabel()}</p>
              <h2 className="text-2xl font-semibold tracking-normal">Point of Sales</h2>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <MobileTab label="Sales" active={activeView === 'sales'} onClick={() => setActiveView('sales')} />
              <MobileTab label="Inventory" active={activeView === 'inventory'} onClick={() => setActiveView('inventory')} />
              <MobileTab label="Transactions" active={activeView === 'transactions'} onClick={() => setActiveView('transactions')} />
              <MobileTab label="Reports" active={activeView === 'reports'} onClick={() => setActiveView('reports')} />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="mb-6 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-600">
              Loading server data...
            </div>
          )}

          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Today Sales" value={formatCurrency(metrics.todayRevenue)} icon={TrendingUp} />
            <MetricCard label="Total Revenue" value={formatCurrency(metrics.revenue)} icon={CreditCard} />
            <MetricCard label="Orders" value={metrics.orders} icon={ClipboardList} />
            <MetricCard label="Low Stock" value={metrics.lowStock} icon={Boxes} tone="amber" />
          </section>

          {activeView === 'sales' && (
            <SalesView
              amountPaid={amountPaid}
              cart={cart}
              change={change}
              checkout={checkout}
              customers={data.customers}
              filteredProducts={filteredProducts}
              onAddToCart={addToCart}
              onAmountPaid={setAmountPaid}
              onPaymentMethod={setPaymentMethod}
              onQuery={setQuery}
              onQuantity={updateQuantity}
              onRemove={removeCartItem}
              onSelectedCustomer={setSelectedCustomer}
              paid={paid}
              paymentMethod={paymentMethod}
              query={query}
              selectedCustomer={selectedCustomer}
              subtotal={subtotal}
              tax={tax}
              total={total}
            />
          )}

          {activeView === 'inventory' && (
            <InventoryView
              form={productForm}
              onAdjustStock={adjustStock}
              onDeleteProduct={deleteProduct}
              onFormChange={setProductForm}
              onSaveProduct={saveProduct}
              products={data.products}
            />
          )}

          {activeView === 'transactions' && <TransactionsView sales={data.sales} />}

          {activeView === 'reports' && <ReportsView metrics={metrics} products={data.products} sales={data.sales} />}
        </div>
      </section>
    </main>
  )
}
