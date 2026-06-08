import { ImagePlus, Minus, PackagePlus, Plus, Trash2, X } from 'lucide-react'
import { ProductImage } from '../components/ProductImage'
import { TextField } from '../components/TextField'
import { formatCurrency } from '../utils/formatters'

export function InventoryView({ form, onAdjustStock, onDeleteProduct, onFormChange, onSaveProduct, products }) {
  async function selectImage(file) {
    if (!file) return

    try {
      const imageUrl = await resizeImage(file)
      onFormChange({ ...form, imageUrl })
    } catch {
      onFormChange({ ...form, imageUrl: '' })
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <form onSubmit={onSaveProduct} className="rounded-md border border-zinc-200 bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-center gap-2">
          <PackagePlus className="text-emerald-700" size={20} />
          <h3 className="text-lg font-semibold">Add Product</h3>
        </div>
        <div className="space-y-3">
          <TextField label="Product Name" value={form.name} onChange={(value) => onFormChange({ ...form, name: value })} required />
          <TextField label="SKU" value={form.sku} onChange={(value) => onFormChange({ ...form, sku: value })} required />
          <TextField label="Category" value={form.category} onChange={(value) => onFormChange({ ...form, category: value })} />
          <TextField label="Selling Price" type="number" value={form.price} onChange={(value) => onFormChange({ ...form, price: value })} required />
          <TextField label="Cost" type="number" value={form.cost} onChange={(value) => onFormChange({ ...form, cost: value })} />
          <TextField label="Stock" type="number" value={form.stock} onChange={(value) => onFormChange({ ...form, stock: value })} required />
          <ProductImagePicker
            imageUrl={form.imageUrl}
            onClear={() => onFormChange({ ...form, imageUrl: '' })}
            onSelect={selectImage}
          />
        </div>
        <button type="submit" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 font-semibold text-white hover:bg-zinc-800">
          <Plus size={18} />
          Save Product
        </button>
      </form>

      <section className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-soft">
        <div className="border-b border-zinc-200 p-5">
          <h3 className="text-lg font-semibold">Inventory List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-normal text-zinc-500">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Cost</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <ProductImage imageUrl={product.imageUrl} name={product.name} size="small" />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-zinc-500">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">{product.category}</td>
                  <td className="px-5 py-4">{formatCurrency(product.price)}</td>
                  <td className="px-5 py-4">{formatCurrency(product.cost)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${product.stock <= 10 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" title="Decrease stock" onClick={() => onAdjustStock(product.id, -1)} className="icon-button">
                        <Minus size={16} />
                      </button>
                      <button type="button" title="Increase stock" onClick={() => onAdjustStock(product.id, 1)} className="icon-button">
                        <Plus size={16} />
                      </button>
                      <button type="button" title="Delete product" onClick={() => onDeleteProduct(product.id)} className="icon-button text-red-600 hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ProductImagePicker({ imageUrl, onClear, onSelect }) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-zinc-600">Product Image</span>
      <div className="flex items-center gap-3 rounded-md border border-zinc-200 p-3">
        <ProductImage imageUrl={imageUrl} name="Product preview" size="medium" />
        <div className="min-w-0 flex-1">
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-semibold text-white hover:bg-zinc-800">
            <ImagePlus size={17} />
            Choose Image
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                onSelect(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
          {imageUrl && (
            <button
              type="button"
              onClick={onClear}
              className="ml-2 inline-flex h-10 items-center justify-center gap-1 rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
            >
              <X size={16} />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const maxSize = 640
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)

        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Image processing is not available.'))
          return
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.72))
      }
      image.onerror = reject
      image.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
