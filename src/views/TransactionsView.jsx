import { Printer, RotateCcw, Share2, Undo2 } from 'lucide-react'
import { formatCurrency, todayLabel } from '../utils/formatters'

export function TransactionsView({ onPrintReceipt, onRefundSale, onShareReceipt, onVoidSale, sales }) {
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
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Items</th>
              <th className="px-5 py-3 text-right">Discount</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {sales.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-5 py-12 text-center text-zinc-500">
                  No transactions yet
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const status = sale.status || 'completed'
                const canCancel = status === 'completed'

                return (
                  <tr key={sale.id}>
                    <td className="px-5 py-4 font-medium">{sale.number}</td>
                    <td className="px-5 py-4">{todayLabel(new Date(sale.date))}</td>
                    <td className="px-5 py-4">{sale.customerName}</td>
                    <td className="px-5 py-4">{sale.paymentMethod}</td>
                    <td className="px-5 py-4">
                      <span className={createStatusClassName(status)}>{status}</span>
                    </td>
                    <td className="px-5 py-4">{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td className="px-5 py-4 text-right">{formatCurrency(sale.discount || 0)}</td>
                    <td className="px-5 py-4 text-right font-semibold">{formatCurrency(sale.total)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" title="Print receipt" onClick={() => onPrintReceipt(sale)} className="icon-button">
                          <Printer size={15} />
                        </button>
                        <button type="button" title="Share receipt" onClick={() => onShareReceipt(sale)} className="icon-button">
                          <Share2 size={15} />
                        </button>
                        <button type="button" title="Refund sale" disabled={!canCancel} onClick={() => onRefundSale(sale)} className="icon-button disabled:cursor-not-allowed disabled:opacity-40">
                          <RotateCcw size={15} />
                        </button>
                        <button type="button" title="Void sale" disabled={!canCancel} onClick={() => onVoidSale(sale)} className="icon-button disabled:cursor-not-allowed disabled:opacity-40">
                          <Undo2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function createStatusClassName(status) {
  const baseClass = 'inline-flex rounded-md px-2 py-1 text-xs font-semibold capitalize'
  if (status === 'completed') return `${baseClass} bg-emerald-100 text-emerald-700`
  if (status === 'refunded') return `${baseClass} bg-amber-100 text-amber-700`
  return `${baseClass} bg-zinc-100 text-zinc-600`
}
