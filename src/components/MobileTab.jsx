export function MobileTab({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium lg:hidden ${
        active ? 'bg-zinc-950 text-white' : 'border border-zinc-200 bg-white text-zinc-600'
      }`}
    >
      {label}
    </button>
  )
}
