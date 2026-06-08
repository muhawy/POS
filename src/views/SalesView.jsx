import { Minus, Plus, ReceiptText, Search, ShoppingCart, X } from 'lucide-react'
import { ProductImage } from '../components/ProductImage'
import { SummaryRow } from '../components/SummaryRow'
import { formatCurrency } from '../utils/formatters'

export function SalesView(props) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input
              value={props.query}
              onChange={(event) => props.onQuery(event.target.value)}
              className="h-11 w-full rounded-md border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none ring-emerald-500 focus:ring-2"
              placeholder="Search product, SKU, or category"
            />
          </div>
          <select
            value={props.selectedCustomer}
            onChange={(event) => props.onSelectedCustomer(event.target.value)}
            className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
          >
            {props.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {props.filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => props.onAddToCart(product)}
              disabled={product.stock <= 0}
              className="rounded-md border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="mb-4 flex gap-3">
                <ProductImage imageUrl={product.imageUrl} name={product.name} size="medium" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="mt-1 text-xs uppercase tracking-normal text-zinc-500">
                    {product.sku} · {product.category}
                  </p>
                </div>
              </div>
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">Stock: {product.stock} pcs</span>
              <p className="text-lg font-semibold text-emerald-700">{formatCurrency(product.price)}</p>
            </button>
          ))}
        </div>
      </section>

      <CartPanel {...props} />
    </div>
  )
}

function CartPanel(props) {
  const canCheckout = props.cart.length > 0 && props.paid >= props.total

  return (
    <aside className="rounded-md border border-zinc-200 bg-white shadow-soft">
      <div className="border-b border-zinc-200 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Current Order</h3>
          <ShoppingCart size={20} className="text-zinc-400" />
        </div>
      </div>

      <div className="max-h-[360px] space-y-3 overflow-auto p-5">
        {props.cart.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500">
            Cart is empty
          </div>
        ) : (
          props.cart.map((item) => (
            <div key={item.id} className="rounded-md border border-zinc-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProductImage imageUrl={item.imageUrl} name={item.name} size="small" />
                  <div className="min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-zinc-500">{formatCurrency(item.price)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  title="Remove item"
                  onClick={() => props.onRemove(item.id)}
                  className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button type="button" title="Decrease quantity" onClick={() => props.onQuantity(item.id, 'decrease')} className="icon-button">
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button type="button" title="Increase quantity" onClick={() => props.onQuantity(item.id, 'increase')} className="icon-button">
                    <Plus size={16} />
                  </button>
                </div>
                <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 border-t border-zinc-200 p-5">
        <SummaryRow label="Subtotal" value={formatCurrency(props.subtotal)} />
        <SummaryRow label={props.taxEnabled ? 'Tax 11%' : 'Tax disabled'} value={formatCurrency(props.tax)} />
        <SummaryRow label="Total" value={formatCurrency(props.total)} strong />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <select
            value={props.paymentMethod}
            onChange={(event) => props.onPaymentMethod(event.target.value)}
            className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
          >
            <option>Cash</option>
            <option>Card</option>
            <option>QRIS</option>
            <option>Transfer</option>
          </select>
          <input
            type="number"
            min="0"
            value={props.amountPaid}
            onChange={(event) => props.onAmountPaid(event.target.value)}
            className="h-11 rounded-md border border-zinc-200 px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
            placeholder="Amount paid"
          />
        </div>

        <SummaryRow label="Change" value={formatCurrency(props.change)} />
        <button
          type="button"
          disabled={!canCheckout}
          onClick={props.checkout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          <ReceiptText size={18} />
          Complete Sale
        </button>
      </div>
    </aside>
  )
}
