export function MetricCard({ icon: Icon, label, tone = 'emerald', value }) {
  const toneClass = tone === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
        </div>
        <div className={`grid size-10 place-items-center rounded-md ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </article>
  )
}
