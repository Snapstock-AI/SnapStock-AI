import { useEffect, useState } from 'react'
import { Building2, Mail, MapPin, Pencil, Phone, Save, Trash2, UserRound, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAuth, type Business } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api'
import { useTheme } from '@/hooks/use-theme'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { user, updateProfile, syncBusinessMembership } = useAuth()
  const [business, setBusiness] = useState<Business | null>(null)
  const [businessError, setBusinessError] = useState('')
  const [profileName, setProfileName] = useState(user?.full_name || '')
  const [businessForm, setBusinessForm] = useState({
    business_name: '',
    business_email: '',
    address: '',
    contact_number: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [deletingBusiness, setDeletingBusiness] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.businessId) {
      setBusiness(null)
      return
    }

    let active = true

    apiRequest<Business[]>('/businesses/mine', {}, true)
      .then((response) => {
        if (!active) return
        const currentBusiness = response.data?.find((item) => item.id === user.businessId) || null
        setBusiness(currentBusiness)
        if (currentBusiness) {
          setBusinessForm({
            business_name: currentBusiness.business_name,
            business_email: currentBusiness.business_email,
            address: currentBusiness.address,
            contact_number: currentBusiness.contact_number,
          })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setBusinessError(error instanceof Error ? error.message : 'Unable to load business details.')
        }
      })

    return () => {
      active = false
    }
  }, [user?.businessId])

  useEffect(() => {
    setProfileName(user?.full_name || '')
  }, [user?.full_name])

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingProfile(true)
    setMessage('')
    setError('')
    try {
      await updateProfile(profileName)
      if (user?.businessId && business?.role === 'OWNER') {
        const response = await apiRequest<Business>(`/businesses/${user.businessId}`, {
          method: 'PATCH',
          body: JSON.stringify(businessForm),
        }, true)
        if (response.data) setBusiness(response.data)
      }
      setMessage('Profile updated successfully.')
      setEditingProfile(false)
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleBusinessDelete() {
    if (!user?.businessId || !window.confirm('Delete this business and all of its inventory, shelves, scans, and memberships?')) return

    setDeletingBusiness(true)
    setMessage('')
    setError('')
    try {
      await apiRequest(`/businesses/${user.businessId}`, { method: 'DELETE' }, true)
      await syncBusinessMembership()
      navigate('/dashboard', { replace: true })
    } catch (deleteError: unknown) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete business.')
    } finally {
      setDeletingBusiness(false)
    }
  }

  function cancelProfileEdit() {
    setProfileName(user?.full_name || '')
    setEditingProfile(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your storefront and preferences</p>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface-elevated p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-medium">Profile details</h2>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="text-sm text-muted">Your account information</p>
                <button type="button" onClick={() => setEditingProfile(true)} className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted"><Pencil className="h-3.5 w-3.5" /> Edit</button>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm text-muted">Full name</p>
              <p className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">{user?.full_name || 'Not available'}</p>
            </div>
            <div>
              <p className="mb-1.5 text-sm text-muted">Email</p>
              <p className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">{user?.email || 'Not available'}</p>
            </div>
            <div>
              <p className="mb-1.5 text-sm text-muted">Account role</p>
              <p className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">{user?.system_role || 'Not available'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-elevated p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-medium">Business details</h2>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="text-sm text-muted">Information for your current business</p>
                {business?.role === 'OWNER' && <button type="button" onClick={handleBusinessDelete} disabled={deletingBusiness} className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"><Trash2 className="h-3.5 w-3.5" /> {deletingBusiness ? 'Deleting...' : 'Delete business'}</button>}
              </div>
            </div>
          </div>

          {businessError && <p className="mt-4 text-sm text-red-700 dark:text-red-300">{businessError}</p>}
          {!businessError && !business && user?.businessId && <p className="mt-4 text-sm text-muted">Loading business details...</p>}
          {!user?.businessId && <p className="mt-4 text-sm text-muted">No business is connected to this account.</p>}

          {business && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-sm text-muted">Business name</p>
                <input value={businessForm.business_name} readOnly onChange={(event) => setBusinessForm({ ...businessForm, business_name: event.target.value })} required maxLength={150} className="w-full cursor-default rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <p className="mb-1.5 text-sm text-muted">Business email</p>
                <div className="relative"><Mail className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-muted" /><input type="email" value={businessForm.business_email} readOnly className="w-full cursor-default rounded-xl border border-border bg-surface-muted py-2.5 pl-11 pr-4 text-sm outline-none" /></div>
              </div>
              <div>
                <p className="mb-1.5 text-sm text-muted">Contact number</p>
                <div className="relative"><Phone className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-muted" /><input value={businessForm.contact_number} readOnly className="w-full cursor-default rounded-xl border border-border bg-surface-muted py-2.5 pl-11 pr-4 text-sm outline-none" /></div>
              </div>
              <div>
                <p className="mb-1.5 text-sm text-muted">Role</p>
                <p className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm">{business.role}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm text-muted">Address</p>
                <div className="relative"><MapPin className="pointer-events-none absolute left-4 top-3 h-4 w-4 shrink-0 text-muted" /><input value={businessForm.address} readOnly className="w-full cursor-default rounded-xl border border-border bg-surface-muted py-2.5 pl-11 pr-4 text-sm outline-none" /></div>
              </div>
              <div className="flex flex-wrap gap-3 sm:col-span-2">
              </div>
            </div>
          )}
        </section>

        {(message || error) && <p className={`text-sm ${error ? 'text-red-700 dark:text-red-300' : 'text-brand-700 dark:text-brand-300'}`}>{error || message}</p>}

      

        <section className="rounded-2xl border border-border bg-surface-elevated p-5">
          <h2 className="font-medium">Appearance</h2>
          <div className="mt-4 flex gap-3">
            {(['light', 'dark'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium capitalize transition ${
                  theme === t
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                    : 'border-border hover:bg-surface-muted'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-elevated p-5">
          <h2 className="font-medium">Alert thresholds</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm text-muted">Low stock threshold</label>
              <input
                type="number"
                defaultValue={25}
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-muted">Freshness alert below</label>
              <input
                type="number"
                defaultValue={65}
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
        </section>
      </div>

      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
          <div className="w-full max-w-lg rounded-2xl bg-surface-elevated p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Account</p>
                <h2 id="edit-profile-title" className="mt-1 font-serif text-2xl font-semibold">Edit profile</h2>
              </div>
              <button type="button" onClick={cancelProfileEdit} className="rounded-full p-2 text-muted hover:bg-surface-muted hover:text-foreground" aria-label="Close edit profile">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="mb-1.5 block text-muted">Full name</span>
                <input value={profileName} onChange={(event) => setProfileName(event.target.value)} required maxLength={100} className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/30" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><p className="mb-1.5 text-sm text-muted">Email</p><p className="rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm">{user?.email || 'Not available'}</p></div>
                <div><p className="mb-1.5 text-sm text-muted">Account role</p><p className="rounded-xl border border-border bg-surface-muted px-4 py-2.5 text-sm">{user?.system_role || 'Not available'}</p></div>
              </div>
              {business?.role === 'OWNER' && (
                <div className="space-y-4 border-t border-border pt-4">
                  <h3 className="font-medium">Business details</h3>
                  <label className="block text-sm"><span className="mb-1.5 block text-muted">Business name</span><input value={businessForm.business_name} onChange={(event) => setBusinessForm({ ...businessForm, business_name: event.target.value })} required maxLength={150} className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/30" /></label>
                  <label className="block text-sm"><span className="mb-1.5 block text-muted">Business email</span><input type="email" value={businessForm.business_email} onChange={(event) => setBusinessForm({ ...businessForm, business_email: event.target.value })} required maxLength={255} className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/30" /></label>
                  <label className="block text-sm"><span className="mb-1.5 block text-muted">Contact number</span><input value={businessForm.contact_number} onChange={(event) => setBusinessForm({ ...businessForm, contact_number: event.target.value })} required maxLength={20} className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/30" /></label>
                  <label className="block text-sm"><span className="mb-1.5 block text-muted">Address</span><input value={businessForm.address} onChange={(event) => setBusinessForm({ ...businessForm, address: event.target.value })} required className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/30" /></label>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={cancelProfileEdit} disabled={savingProfile} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-muted disabled:opacity-60"><X className="h-4 w-4" /> Cancel</button>
                <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" /> {savingProfile ? 'Saving...' : 'Save profile'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
