import { Save, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'

export function SettingsView({ onSaveSettings, settings }) {
  const [form, setForm] = useState(settings)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setForm(settings)
  }, [settings])

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    await onSaveSettings(form)
    setMessage('Settings saved')
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="rounded-md border border-zinc-200 bg-white p-5 shadow-soft">
        <div className="mb-5 flex items-center gap-2">
          <ShieldCheck className="text-emerald-700" size={20} />
          <h3 className="text-lg font-semibold">Admin Settings</h3>
        </div>

        <div className="space-y-4">
          <PinField
            label="Admin PIN"
            value={form.adminPin}
            onChange={(value) => setForm({ ...form, adminPin: value })}
          />
          <PinField
            label="Operator PIN"
            value={form.operatorPin}
            onChange={(value) => setForm({ ...form, operatorPin: value })}
          />

          <label className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 p-3">
            <span>
              <span className="block text-sm font-semibold text-zinc-800">Tax 11%</span>
              <span className="block text-sm text-zinc-500">{form.taxEnabled ? 'Enabled' : 'Disabled'}</span>
            </span>
            <input
              checked={form.taxEnabled}
              className="size-5 accent-emerald-600"
              onChange={(event) => setForm({ ...form, taxEnabled: event.target.checked })}
              type="checkbox"
            />
          </label>
        </div>

        {message && <p className="mt-4 text-sm font-medium text-emerald-700">{message}</p>}

        <button type="submit" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 font-semibold text-white hover:bg-zinc-800">
          <Save size={18} />
          Save Settings
        </button>
      </form>

      <section className="rounded-md border border-zinc-200 bg-white p-5 shadow-soft">
        <h3 className="mb-4 text-lg font-semibold">Access</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-zinc-100 p-4">
            <p className="font-semibold">Admin</p>
            <p className="mt-1 text-sm text-zinc-500">Sales, inventory, transactions, reports, and settings.</p>
          </div>
          <div className="rounded-md border border-zinc-100 p-4">
            <p className="font-semibold">Operator</p>
            <p className="mt-1 text-sm text-zinc-500">Sales, inventory, and transactions.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function PinField({ label, onChange, value }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-600">{label}</span>
      <input
        className="h-11 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none ring-emerald-500 focus:ring-2"
        inputMode="numeric"
        maxLength="6"
        minLength="6"
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
        pattern="[0-9]{6}"
        required
        type="password"
        value={value}
      />
    </label>
  )
}
