export function NavButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium transition ${
        active ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  )
}
