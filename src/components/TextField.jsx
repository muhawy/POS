export function TextField({ label, onChange, required, type = 'text', value }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-600">{label}</span>
      <input
        type={type}
        min={type === 'number' ? '0' : undefined}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
      />
    </label>
  )
}
