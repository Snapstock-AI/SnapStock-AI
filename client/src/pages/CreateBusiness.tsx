import { useState, type FormEvent } from 'react'
import { Building2, Check, MapPin, Phone, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { useAuth, type CreateBusinessInput } from '@/context/AuthContext'

const initialForm: CreateBusinessInput = {
  business_name: '',
  business_email: '',
  address: '',
  contact_number: '',
}

export default function CreateBusiness() {
  const navigate = useNavigate()
  const { user, createBusiness, logout } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function updateField(field: keyof CreateBusinessInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await createBusiness(form)
      navigate('/dashboard', { replace: true })
    } catch (submitError: any) {
      setError(submitError.message || 'We could not create your business.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-surface">
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface-elevated px-4 md:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm font-medium text-muted transition hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <section className="max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            One last step
          </div>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight md:text-5xl">
            Give your inventory a home.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted">
            Set up your business workspace, then invite your team and start scanning shelves with SnapStock-AI.
          </p>

          <div className="mt-8 space-y-4">
            {[
              'You become the business owner automatically',
              'Invite employees from your workspace',
              'Track inventory, shelves, and freshness in one place',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-surface-elevated p-5 shadow-sm md:p-8">
          <div className="mb-7 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold">Create your business</h2>
              <p className="mt-1 text-sm text-muted">Welcome, {user?.full_name?.split(' ')[0] || 'there'}.</p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="business_name" className="mb-1.5 block text-sm font-medium">Business name</label>
              <input
                id="business_name"
                required
                maxLength={150}
                value={form.business_name}
                onChange={(event) => updateField('business_name', event.target.value)}
                placeholder="Fresh Mart"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
              />
            </div>

            <div>
              <label htmlFor="business_email" className="mb-1.5 block text-sm font-medium">Business email</label>
              <input
                id="business_email"
                type="email"
                required
                value={form.business_email}
                onChange={(event) => updateField('business_email', event.target.value)}
                placeholder="hello@freshmart.com"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
              />
            </div>

            <div>
              <label htmlFor="address" className="mb-1.5 block text-sm font-medium">Business address</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted" />
                <input
                  id="address"
                  required
                  value={form.address}
                  onChange={(event) => updateField('address', event.target.value)}
                  placeholder="123 Main Street, Colombo"
                  className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact_number" className="mb-1.5 block text-sm font-medium">Contact number</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted" />
                <input
                  id="contact_number"
                  required
                  maxLength={20}
                  value={form.contact_number}
                  onChange={(event) => updateField('contact_number', event.target.value)}
                  placeholder="+94 77 123 4567"
                  className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none ring-brand-500/30 transition focus:ring-2"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-brand-500 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating workspace...' : 'Create business and continue'}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}