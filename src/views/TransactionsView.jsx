import { formatCurrency, todayLabel } from '../utils/formatters'

export function TransactionsView({ sales }) {
  return (
    <section className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-soft">
      <div className="border-b border-zinc-200 p-5">
        <h3 className="text-lg font-semibold">Transactions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-normal text-zinc-500">
            <tr>
              <th className="px-5 py-3">Invoice</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Payment</th>
              <th className="px-5 py-3">Items</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sales.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-5 py-12 text-center text-zinc-500">
                  No transactions yet
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-5 py-4 font-medium">{sale.number}</td>
                  <td className="px-5 py-4">{todayLabel(new Date(sale.date))}</td>
                  <td className="px-5 py-4">{sale.customerName}</td>
                  <td className="px-5 py-4">{sale.paymentMethod}</td>
                  <td className="px-5 py-4">{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td className="px-5 py-4 text-right font-semibold">{formatCurrency(sale.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
