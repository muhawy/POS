import { useState } from 'react'
import { Download } from 'lucide-react'
import { ProductImage } from '../components/ProductImage'
import { SummaryRow } from '../components/SummaryRow'
import { formatCurrency, todayLabel } from '../utils/formatters'

const chartModes = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]

export function ReportsView({ metrics, onExportData, products, sales }) {
  const [chartMode, setChartMode] = useState('week')
  const bestSellers = products
    .map((product) => ({
      ...product,
      sold: sales.reduce((sum, sale) => {
        const item = sale.items.find((saleItem) => saleItem.productId === product.id)
        return sum + (item?.quantity ?? 0)
      }, 0),
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)
  const salesChart = buildSalesChart(sales, chartMode)
  const maxRevenue = Math.max(...salesChart.points.map((point) => point.revenue), 1)

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Business Summary</h3>
          <button
            type="button"
            onClick={onExportData}
            className="flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-200 px-3 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            <Download size={16} />
            Export Excel
          </button>
        </div>
        <div className="space-y-4">
          <SummaryRow label="Revenue" value={formatCurrency(metrics.revenue)} strong />
          <SummaryRow label="Gross Profit" value={formatCurrency(metrics.grossProfit)} strong />
          <SummaryRow label="Transactions" value={metrics.orders} />
          <SummaryRow label="Products" value={products.length} />
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-soft">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Sales Report</h3>
            <p className="text-sm text-zinc-500">{salesChart.caption}</p>
          </div>
          <div className="inline-grid grid-cols-3 rounded-md border border-zinc-200 bg-zinc-50 p-1">
            {chartModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setChartMode(mode.id)}
                className={`h-8 rounded-md px-3 text-sm font-semibold transition ${
                  chartMode === mode.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-950'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <div
            className="flex h-72 items-end gap-2 border-b border-l border-zinc-200 px-3 pt-4"
            style={{ minWidth: `${Math.max(salesChart.points.length * 44, 560)}px` }}
          >
            {salesChart.points.map((point) => {
              const height = Math.max((point.revenue / maxRevenue) * 100, point.revenue > 0 ? 8 : 0)

              return (
                <div key={point.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                  <div className="flex min-h-12 flex-col justify-end text-center">
                    <span className="truncate text-[11px] font-semibold text-zinc-700 sm:text-xs">{formatCompactCurrency(point.revenue)}</span>
                    <span className="text-[11px] text-zinc-500">{point.orders} orders</span>
                  </div>
                  <div className="flex h-44 items-end">
                    <div
                      className="w-full min-w-3 rounded-t-md bg-emerald-600"
                      style={{ height: `${height}%` }}
                      title={`${point.title}: ${formatCurrency(point.revenue)}`}
                    />
                  </div>
                  <span className="truncate text-center text-xs font-medium text-zinc-500">{point.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-soft">
        <h3 className="mb-5 text-lg font-semibold">Best Sellers</h3>
        <div className="space-y-3">
          {bestSellers.map((product) => (
            <div key={product.id} className="flex items-center justify-between rounded-md border border-zinc-100 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <ProductImage imageUrl={product.imageUrl} name={product.name} size="small" />
                <div className="min-w-0">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-zinc-500">{product.category}</p>
                </div>
              </div>
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-sm font-semibold text-emerald-700">{product.sold} sold</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function buildSalesChart(sales, mode) {
  if (mode === 'day') return buildDailySalesChart(sales)
  if (mode === 'month') return buildMonthlySalesChart(sales)
  return buildWeeklySalesChart(sales)
}

function buildDailySalesChart(sales) {
  const today = new Date()
  const points = Array.from({ length: 24 }, (_, hour) => ({
    key: String(hour).padStart(2, '0'),
    label: hour % 3 === 0 ? `${String(hour).padStart(2, '0')}:00` : '',
    title: `${String(hour).padStart(2, '0')}:00`,
    revenue: 0,
    orders: 0,
  }))

  sales.forEach((sale) => {
    const date = new Date(sale.date)
    if (createLocalDateKey(date) !== createLocalDateKey(today)) return

    const point = points[date.getHours()]
    point.revenue += Number(sale.total) || 0
    point.orders += 1
  })

  return {
    caption: todayLabel(today),
    points,
  }
}

function buildWeeklySalesChart(sales) {
  const points = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))

    return {
      date,
      key: createLocalDateKey(date),
      label: new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date),
      title: todayLabel(date),
      revenue: 0,
      orders: 0,
    }
  })

  const pointsByKey = new Map(points.map((point) => [point.key, point]))

  sales.forEach((sale) => {
    const date = new Date(sale.date)
    const key = createLocalDateKey(date)
    const point = pointsByKey.get(key)
    if (!point) return

    point.revenue += Number(sale.total) || 0
    point.orders += 1
  })

  return {
    caption: 'Last 7 days',
    points,
  }
}

function buildMonthlySalesChart(sales) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const points = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1)

    return {
      date,
      key: createLocalDateKey(date),
      label: String(index + 1),
      title: todayLabel(date),
      revenue: 0,
      orders: 0,
    }
  })

  const pointsByKey = new Map(points.map((point) => [point.key, point]))

  sales.forEach((sale) => {
    const date = new Date(sale.date)
    const point = pointsByKey.get(createLocalDateKey(date))
    if (!point) return

    point.revenue += Number(sale.total) || 0
    point.orders += 1
  })

  return {
    caption: new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(today),
    points,
  }
}

function createLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    maximumFractionDigits: 1,
    notation: 'compact',
    style: 'currency',
  }).format(value)
}
