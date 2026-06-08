import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  LogOut,
  ReceiptText,
  Settings,
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
  updateSettings,
} from './services/api'
import { startOfToday } from './utils/dates'
import { formatCurrency, todayLabel } from './utils/formatters'
import { InventoryView } from './views/InventoryView'
import { LoginView } from './views/LoginView'
import { ReportsView } from './views/ReportsView'
import { SalesView } from './views/SalesView'
import { SettingsView } from './views/SettingsView'
import { TransactionsView } from './views/TransactionsView'

export function App() {
  const [data, setData] = useState({ products: [], sales: [], customers: [], settings: null })
  const [activeView, setActiveView] = useState('sales')
  const [session, setSession] = useState(null)
  const [loginError, setLoginError] = useState('')
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

  useEffect(() => {
    if (session?.role !== 'admin' && ['reports', 'settings'].includes(activeView)) {
      setActiveView('sales')
    }
  }, [activeView, session])

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
  const taxEnabled = data.settings?.taxEnabled ?? true
  const tax = taxEnabled ? Math.round(subtotal * TAX_RATE) : 0
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

  function login(pin) {
    if (!data.settings) return

    if (pin === data.settings.adminPin) {
      setSession({ role: 'admin', label: 'Admin' })
      setLoginError('')
      return
    }

    if (pin === data.settings.operatorPin) {
      setSession({ role: 'operator', label: 'Operator' })
      setLoginError('')
      return
    }

    setLoginError('PIN is not valid.')
  }

  function logout() {
    setSession(null)
    setActiveView('sales')
    setCart([])
    setAmountPaid('')
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

  async function saveSettings(settings) {
    try {
      const result = await updateSettings(settings)
      setData(result.data)
      setError('')
    } catch (apiError) {
      setError(apiError.message)
      throw apiError
    }
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-100 p-4 text-zinc-950">
        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-600 shadow-soft">
          Loading local data...
        </div>
      </main>
    )
  }

  if (!session) {
    return <LoginView error={loginError || error} onLogin={login} />
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
      imageUrl: productForm.imageUrl,
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
            <p className="text-sm text-zinc-500">{session.label}</p>
          </div>
        </div>

        <nav className="space-y-2">
          <NavButton icon={ShoppingCart} label="Sales" active={activeView === 'sales'} onClick={() => setActiveView('sales')} />
          <NavButton icon={Boxes} label="Inventory" active={activeView === 'inventory'} onClick={() => setActiveView('inventory')} />
          <NavButton icon={ReceiptText} label="Transactions" active={activeView === 'transactions'} onClick={() => setActiveView('transactions')} />
          {session.role === 'admin' && (
            <>
              <NavButton icon={BarChart3} label="Reports" active={activeView === 'reports'} onClick={() => setActiveView('reports')} />
              <NavButton icon={Settings} label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
            </>
          )}
        </nav>

        <div className="absolute bottom-6 left-5 right-5 space-y-2">
          {session.role === 'admin' && (
            <button
              type="button"
              onClick={resetDemoData}
              className="w-full rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Reset Local Data
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <section className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700">{todayLabel()}</p>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-normal">Point of Sales</h2>
                <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-600">{session.label}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <MobileTab label="Sales" active={activeView === 'sales'} onClick={() => setActiveView('sales')} />
                <MobileTab label="Inventory" active={activeView === 'inventory'} onClick={() => setActiveView('inventory')} />
                <MobileTab label="Transactions" active={activeView === 'transactions'} onClick={() => setActiveView('transactions')} />
                {session.role === 'admin' && (
                  <>
                    <MobileTab label="Reports" active={activeView === 'reports'} onClick={() => setActiveView('reports')} />
                    <MobileTab label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')} />
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={logout}
                className="flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 lg:hidden"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {error && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
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
              taxEnabled={taxEnabled}
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

          {session.role === 'admin' && activeView === 'reports' && <ReportsView metrics={metrics} products={data.products} sales={data.sales} />}

          {session.role === 'admin' && activeView === 'settings' && (
            <SettingsView onSaveSettings={saveSettings} settings={data.settings} />
          )}
        </div>
      </section>
    </main>
  )
}
