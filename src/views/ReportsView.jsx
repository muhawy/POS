import { ProductImage } from '../components/ProductImage'
import { SummaryRow } from '../components/SummaryRow'
import { formatCurrency } from '../utils/formatters'

export function ReportsView({ metrics, products, sales }) {
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

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-soft">
        <h3 className="mb-5 text-lg font-semibold">Business Summary</h3>
        <div className="space-y-4">
          <SummaryRow label="Revenue" value={formatCurrency(metrics.revenue)} strong />
          <SummaryRow label="Gross Profit" value={formatCurrency(metrics.grossProfit)} strong />
          <SummaryRow label="Transactions" value={metrics.orders} />
          <SummaryRow label="Products" value={products.length} />
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
