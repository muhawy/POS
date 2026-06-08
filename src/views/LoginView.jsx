import { LockKeyhole } from 'lucide-react'

export function LoginView({ error, onLogin }) {
  function submit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    onLogin(String(formData.get('pin') || ''))
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 p-4 text-zinc-950">
      <form onSubmit={submit} className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-emerald-600 text-white">
            <LockKeyhole size={22} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Local POS</h1>
            <p className="text-sm text-zinc-500">Enter your 6 number PIN</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-600">PIN</span>
          <input
            autoComplete="current-password"
            autoFocus
            className="h-12 w-full rounded-md border border-zinc-200 px-3 text-center text-xl font-semibold tracking-[0.35em] outline-none ring-emerald-500 focus:ring-2"
            inputMode="numeric"
            maxLength="6"
            name="pin"
            pattern="[0-9]{6}"
            required
            type="password"
          />
        </label>

        <button type="submit" className="mt-5 flex h-11 w-full items-center justify-center rounded-md bg-zinc-950 font-semibold text-white hover:bg-zinc-800">
          Login
        </button>
      </form>
    </main>
  )
}
