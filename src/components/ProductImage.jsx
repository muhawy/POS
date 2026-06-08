import { ImageIcon } from 'lucide-react'

export function ProductImage({ imageUrl, name, size = 'medium' }) {
  const sizeClass = {
    small: 'size-12',
    medium: 'size-16',
    large: 'size-20',
  }[size]

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-md border border-zinc-200 object-cover`}
      />
    )
  }

  return (
    <div className={`${sizeClass} grid shrink-0 place-items-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400`}>
      <ImageIcon size={size === 'small' ? 18 : 22} />
    </div>
  )
}
