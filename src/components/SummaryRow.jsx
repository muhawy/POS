export function SummaryRow({ label, strong, value }) {
  return (
    <div className={`flex items-center justify-between text-sm ${strong ? 'text-base font-semibold' : 'text-zinc-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
