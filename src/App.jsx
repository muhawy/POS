import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Boxes,
  ClipboardList,
  CreditCard,
  LogOut,
  Moon,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sun,
  TrendingUp,
} from 'lucide-react'
import { MetricCard } from './components/MetricCard'
import { MobileTab } from './components/MobileTab'
import { NavButton } from './components/NavButton'
import { emptyProductForm, TAX_RATE } from './data/seedData'
import {
  adjustProductStock,
  cancelSale,
  checkoutSale,
  createProduct,
  deleteProduct as deleteProductRequest,
  fetchPosData,
  resetDemoData as resetDemoDataRequest,
  restoreBackupData,
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
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountType, setDiscountType] = useState('amount')
  const [theme, setTheme] = useState(() => window.localStorage.getItem('local-pos-theme') || 'light')
  const [recentSale, setRecentSale] = useState(null)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('local-pos-theme', theme)
  }, [theme])

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
    const completedSales = data.sales.filter((sale) => (sale.status || 'completed') === 'completed')
    const todaySales = completedSales.filter((sale) => new Date(sale.date) >= today)
    const revenue = completedSales.reduce((sum, sale) => sum + sale.total, 0)
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0)
    const lowStock = data.products.filter((product) => product.stock <= 10).length
    const grossProfit = completedSales.reduce((sum, sale) => sum + sale.profit, 0)

    return { revenue, todayRevenue, orders: completedSales.length, lowStock, grossProfit }
  }, [data])

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return data.products
    return data.products.filter((product) =>
      [product.name, product.sku, product.category].join(' ').toLowerCase().includes(normalized),
    )
  }, [data.products, query])

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountValue = Math.max(Number(discountAmount) || 0, 0)
  const discount = calculateDiscount(subtotal, discountType, discountValue)
  const taxEnabled = data.settings?.taxEnabled ?? true
  const taxableSubtotal = subtotal - discount
  const tax = taxEnabled ? Math.round(taxableSubtotal * TAX_RATE) : 0
  const total = taxableSubtotal + tax
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
    setDiscountAmount('')
    setRecentSale(null)
  }

  async function checkout() {
    if (!cart.length || paid < total) return

    try {
      const result = await checkoutSale({
        cart,
        customerId: selectedCustomer,
        discount,
        discountType,
        discountValue,
        paymentMethod,
        paid,
      })
      setData(result.data)
      setCart([])
      setAmountPaid('')
      setDiscountAmount('')
      setSelectedCustomer('c-walkin')
      setRecentSale(result.sale)
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
      category: productForm.category.trim() || data.settings?.categories?.[0] || 'General',
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
      setDiscountAmount('')
      setSelectedCustomer('c-walkin')
      setRecentSale(null)
      setError('')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  function exportData() {
    if (session.role !== 'admin') return

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const workbook = createSalesReportWorkbook(data.sales, metrics)
    downloadBlob(workbook, `sales-report-${timestamp}.xls`, 'application/vnd.ms-excel;charset=utf-8')
  }

  function exportCsvData() {
    if (session.role !== 'admin') return

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadBlob(createSalesReportCsv(data.sales), `sales-report-${timestamp}.csv`, 'text/csv;charset=utf-8')
  }

  function exportBackup() {
    if (session.role !== 'admin') return

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadBlob(JSON.stringify(data, null, 2), `local-pos-backup-${timestamp}.json`, 'application/json;charset=utf-8')
  }

  async function restoreBackup(file) {
    if (session.role !== 'admin' || !file) return

    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      const result = await restoreBackupData(backup)
      setData(result.data)
      setCart([])
      setAmountPaid('')
      setDiscountAmount('')
      setSelectedCustomer('c-walkin')
      setRecentSale(null)
      setError('')
    } catch (apiError) {
      setError(apiError.message || 'Backup file could not be restored.')
    }
  }

  async function updateSaleStatus(sale, type) {
    const label = type === 'refund' ? 'refund' : 'void'
    if (!window.confirm(`Mark ${sale.number} as ${label}ed and return items to stock?`)) return

    try {
      const result = await cancelSale(sale.id, type)
      setData(result.data)
      setError('')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  function printReceipt(sale) {
    const receiptWindow = window.open('', '_blank', 'width=420,height=720')
    if (!receiptWindow) {
      setError('Popup was blocked. Allow popups to print receipts.')
      return
    }

    receiptWindow.document.write(createReceiptHtml(sale))
    receiptWindow.document.close()
    receiptWindow.focus()
    receiptWindow.print()
  }

  async function shareReceipt(sale) {
    const text = createReceiptText(sale)

    try {
      if (navigator.share) {
        await navigator.share({ title: `Receipt ${sale.number}`, text })
        return
      }
      await navigator.clipboard.writeText(text)
      setError('Receipt copied to clipboard.')
    } catch (apiError) {
      setError(apiError.message || 'Receipt could not be shared.')
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
              <p className="mt-1 text-sm text-zinc-500">Data is stored on this device. Export backups regularly.</p>
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
                title={theme === 'dark' ? 'Use light mode' : 'Use dark mode'}
                onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
                className="grid h-10 w-full place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50 sm:w-10"
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
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
              discount={discount}
              discountAmount={discountAmount}
              discountType={discountType}
              filteredProducts={filteredProducts}
              onAddToCart={addToCart}
              onAmountPaid={setAmountPaid}
              onDiscountAmount={setDiscountAmount}
              onDiscountType={setDiscountType}
              onPaymentMethod={setPaymentMethod}
              onPrintReceipt={printReceipt}
              onQuery={setQuery}
              onQuantity={updateQuantity}
              onRemove={removeCartItem}
              onShareReceipt={shareReceipt}
              onSelectedCustomer={setSelectedCustomer}
              paid={paid}
              paymentMethod={paymentMethod}
              query={query}
              recentSale={recentSale}
              selectedCustomer={selectedCustomer}
              subtotal={subtotal}
              tax={tax}
              taxEnabled={taxEnabled}
              total={total}
            />
          )}

          {activeView === 'inventory' && (
            <InventoryView
              categories={data.settings?.categories}
              form={productForm}
              onAdjustStock={adjustStock}
              onDeleteProduct={deleteProduct}
              onFormChange={setProductForm}
              onSaveProduct={saveProduct}
              products={data.products}
            />
          )}

          {activeView === 'transactions' && (
            <TransactionsView
              onPrintReceipt={printReceipt}
              onRefundSale={(sale) => updateSaleStatus(sale, 'refund')}
              onShareReceipt={shareReceipt}
              onVoidSale={(sale) => updateSaleStatus(sale, 'void')}
              sales={data.sales}
            />
          )}

          {session.role === 'admin' && activeView === 'reports' && (
            <ReportsView metrics={metrics} onExportCsvData={exportCsvData} onExportData={exportData} products={data.products} sales={data.sales} />
          )}

          {session.role === 'admin' && activeView === 'settings' && (
            <SettingsView onExportBackup={exportBackup} onRestoreBackup={restoreBackup} onSaveSettings={saveSettings} settings={data.settings} />
          )}
        </div>
      </section>
    </main>
  )
}

function createSalesReportWorkbook(sales, metrics) {
  const transactions = sales.map((sale) => ({
    invoice: sale.number,
    date: todayLabel(new Date(sale.date)),
    customer: sale.customerName,
    payment: sale.paymentMethod,
    status: sale.status || 'completed',
    items: sale.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: sale.subtotal,
    discountType: sale.discountType || 'amount',
    discountValue: sale.discountValue ?? sale.discount ?? 0,
    discount: sale.discount || 0,
    tax: sale.tax,
    total: sale.total,
    paid: sale.paid,
    change: sale.change,
    profit: sale.profit,
  }))
  const saleItems = sales.flatMap((sale) =>
    sale.items.map((item) => ({
      invoice: sale.number,
      date: todayLabel(new Date(sale.date)),
      sku: item.sku,
      product: item.name,
      quantity: item.quantity,
      price: item.price,
      cost: item.cost,
      lineTotal: item.lineTotal,
      profit: (item.price - item.cost) * item.quantity,
    })),
  )

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; margin-bottom: 24px; }
      th { background: #d9ead3; font-weight: 700; }
      th, td { border: 1px solid #999; padding: 6px 8px; }
      .title { background: #111827; color: #fff; font-size: 16px; text-align: left; }
      .number { mso-number-format: "0"; text-align: right; }
    </style>
  </head>
  <body>
    ${createExcelTable('Sales Report Summary', [
      ['Generated At', todayLabel(new Date())],
      ['Revenue', metrics.revenue],
      ['Gross Profit', metrics.grossProfit],
      ['Transactions', metrics.orders],
    ])}
    ${createExcelTable('Transactions', [
      ['Invoice', 'Date', 'Customer', 'Payment', 'Status', 'Items', 'Subtotal', 'Discount Type', 'Discount Value', 'Discount', 'Tax', 'Total', 'Paid', 'Change', 'Profit'],
      ...transactions.map((sale) => [
        sale.invoice,
        sale.date,
        sale.customer,
        sale.payment,
        sale.status,
        sale.items,
        sale.subtotal,
        sale.discountType,
        sale.discountValue,
        sale.discount,
        sale.tax,
        sale.total,
        sale.paid,
        sale.change,
        sale.profit,
      ]),
    ])}
    ${createExcelTable('Sale Items', [
      ['Invoice', 'Date', 'SKU', 'Product', 'Quantity', 'Price', 'Cost', 'Line Total', 'Profit'],
      ...saleItems.map((item) => [
        item.invoice,
        item.date,
        item.sku,
        item.product,
        item.quantity,
        item.price,
        item.cost,
        item.lineTotal,
        item.profit,
      ]),
    ])}
  </body>
</html>`
}

function createSalesReportCsv(sales) {
  const rows = [
    ['Type', 'Invoice', 'Date', 'Customer', 'Payment', 'Status', 'SKU', 'Product', 'Quantity', 'Subtotal', 'Discount Type', 'Discount Value', 'Discount', 'Tax', 'Total', 'Paid', 'Change', 'Profit'],
  ]

  sales.forEach((sale) => {
    rows.push([
      'Sale',
      sale.number,
      todayLabel(new Date(sale.date)),
      sale.customerName,
      sale.paymentMethod,
      sale.status || 'completed',
      '',
      '',
      sale.items.reduce((sum, item) => sum + item.quantity, 0),
      sale.subtotal,
      sale.discountType || 'amount',
      sale.discountValue ?? sale.discount ?? 0,
      sale.discount || 0,
      sale.tax,
      sale.total,
      sale.paid,
      sale.change,
      sale.profit,
    ])

    sale.items.forEach((item) => {
      rows.push([
        'Item',
        sale.number,
        todayLabel(new Date(sale.date)),
        sale.customerName,
        sale.paymentMethod,
        sale.status || 'completed',
        item.sku,
        item.name,
        item.quantity,
        '',
        '',
        '',
        '',
        '',
        item.lineTotal,
        '',
        '',
        (item.price - item.cost) * item.quantity,
      ])
    })
  })

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')
}

function createReceiptText(sale) {
  const lines = [
    'Local POS',
    `Receipt: ${sale.number}`,
    `Date: ${todayLabel(new Date(sale.date))}`,
    `Customer: ${sale.customerName}`,
    `Payment: ${sale.paymentMethod}`,
    `Status: ${sale.status || 'completed'}`,
    '',
    ...sale.items.map((item) => `${item.name} x${item.quantity} - ${formatCurrency(item.lineTotal)}`),
    '',
    `Subtotal: ${formatCurrency(sale.subtotal)}`,
    `Discount: -${formatCurrency(sale.discount || 0)}`,
    `Discount Type: ${formatDiscountType(sale)}`,
    `Tax: ${formatCurrency(sale.tax)}`,
    `Total: ${formatCurrency(sale.total)}`,
    `Paid: ${formatCurrency(sale.paid)}`,
    `Change: ${formatCurrency(sale.change)}`,
    '',
    'Thank you',
  ]

  return lines.join('\n')
}

function createReceiptHtml(sale) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeExcelCell(sale.number)}</title>
    <style>
      body { color: #111827; font-family: Arial, sans-serif; margin: 0; padding: 24px; }
      .receipt { margin: 0 auto; max-width: 360px; }
      h1 { font-size: 20px; margin: 0 0 4px; text-align: center; }
      .muted { color: #52525b; font-size: 12px; margin: 2px 0; text-align: center; }
      table { border-collapse: collapse; margin-top: 18px; width: 100%; }
      td { border-bottom: 1px solid #e4e4e7; font-size: 12px; padding: 8px 0; vertical-align: top; }
      .right { text-align: right; }
      .total td { border-bottom: 0; font-size: 15px; font-weight: 700; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <div class="receipt">
      <h1>Local POS</h1>
      <p class="muted">${escapeExcelCell(sale.number)} · ${escapeExcelCell(todayLabel(new Date(sale.date)))}</p>
      <p class="muted">${escapeExcelCell(sale.customerName)} · ${escapeExcelCell(sale.paymentMethod)}</p>
      <table>
        <tbody>
          ${sale.items
            .map(
              (item) => `<tr>
                <td>${escapeExcelCell(item.name)}<br />${escapeExcelCell(item.quantity)} x ${escapeExcelCell(formatCurrency(item.price))}</td>
                <td class="right">${escapeExcelCell(formatCurrency(item.lineTotal))}</td>
              </tr>`,
            )
            .join('')}
          <tr><td>Subtotal</td><td class="right">${escapeExcelCell(formatCurrency(sale.subtotal))}</td></tr>
          <tr><td>Discount (${escapeExcelCell(formatDiscountType(sale))})</td><td class="right">-${escapeExcelCell(formatCurrency(sale.discount || 0))}</td></tr>
          <tr><td>Tax</td><td class="right">${escapeExcelCell(formatCurrency(sale.tax))}</td></tr>
          <tr class="total"><td>Total</td><td class="right">${escapeExcelCell(formatCurrency(sale.total))}</td></tr>
          <tr><td>Paid</td><td class="right">${escapeExcelCell(formatCurrency(sale.paid))}</td></tr>
          <tr><td>Change</td><td class="right">${escapeExcelCell(formatCurrency(sale.change))}</td></tr>
        </tbody>
      </table>
      <p class="muted">Thank you</p>
    </div>
  </body>
</html>`
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function calculateDiscount(subtotal, discountType, discountValue) {
  const value = Math.max(Number(discountValue) || 0, 0)
  if (discountType === 'percent') {
    return Math.min(Math.round(subtotal * Math.min(value, 100) / 100), subtotal)
  }
  return Math.min(value, subtotal)
}

function formatDiscountType(sale) {
  if (sale.discountType === 'percent') return `${Number(sale.discountValue || 0)}%`
  return 'amount'
}

function createExcelTable(title, rows) {
  const colSpan = Math.max(...rows.map((row) => row.length), 1)

  return `<table>
    <thead>
      <tr><th class="title" colspan="${colSpan}">${escapeExcelCell(title)}</th></tr>
    </thead>
    <tbody>
      ${rows.map((row, index) => createExcelRow(row, index === 0 && rows.length > 1)).join('')}
    </tbody>
  </table>`
}

function createExcelRow(row, isHeader) {
  const tag = isHeader ? 'th' : 'td'

  return `<tr>${row
    .map((cell) => {
      const isNumber = typeof cell === 'number'
      const className = isNumber ? ' class="number"' : ''
      return `<${tag}${className}>${escapeExcelCell(cell)}</${tag}>`
    })
    .join('')}</tr>`
}

function escapeExcelCell(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeCsvCell(value) {
  const text = String(value ?? '')
  if (!/[",\n]/.test(text)) return text
  return `"${text.replace(/"/g, '""')}"`
}
