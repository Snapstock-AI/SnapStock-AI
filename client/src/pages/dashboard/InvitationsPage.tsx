import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Clock3, Mail, Send, Trash2, Users } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth, type Business } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api'
import {
  listEmployees,
  listEmployeeInvitations,
  removeEmployee,
  sendEmployeeInvitation,
  type Employee,
  type Invitation,
} from '@/lib/invitation'

const statusStyles: Record<Invitation['status'], string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  ACCEPTED: 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300',
  EXPIRED: 'bg-surface-muted text-muted',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function InvitationsPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isOwner, setIsOwner] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [removingEmployee, setRemovingEmployee] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadWorkspace() {
    if (!user?.businessId) return

    setLoading(true)
    try {
      const businessesResponse = await apiRequest<Business[]>('/businesses/mine', {}, true)
      const business = businessesResponse.data?.find((item) => item.id === user.businessId)
      const owner = business?.role === 'OWNER'
      setIsOwner(owner)

      if (!owner) return

      const [loadedInvitations, loadedEmployees] = await Promise.all([
        listEmployeeInvitations(user.businessId),
        listEmployees(user.businessId),
      ])
      setInvitations(loadedInvitations)
      setEmployees(loadedEmployees)
      setError('')
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load invitations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspace()
  }, [user?.businessId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user?.businessId) return

    setSending(true)
    setError('')
    setMessage('')
    try {
      await sendEmployeeInvitation(user.businessId, email.trim())
      setEmail('')
      setMessage('Invitation sent successfully.')
      await loadWorkspace()
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send invitation.')
    } finally {
      setSending(false)
    }
  }

  async function handleRemoveEmployee(employee: Employee) {
    if (!user?.businessId) return
    if (!window.confirm(`Remove ${employee.full_name} from this business?`)) return

    setRemovingEmployee(employee.user_id)
    setError('')
    try {
      await removeEmployee(user.businessId, employee.user_id)
      setEmployees((currentEmployees) =>
        currentEmployees.filter((item) => item.user_id !== employee.user_id),
      )
      setMessage(`${employee.full_name} was removed from the business.`)
    } catch (removeError: unknown) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove employee.')
    } finally {
      setRemovingEmployee(null)
    }
  }

  if (!user?.businessId) {
    return <p className="text-sm text-muted">Connect this account to a business to manage invitations.</p>
  }

  if (loading && isOwner === null) {
    return <p className="text-sm text-muted">Loading team management...</p>
  }

  if (!isOwner) {
    return <p className="text-sm text-muted">Only the business owner can manage employees and invitations.</p>
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <h1 className="mt-4 font-serif text-2xl font-semibold md:text-3xl">Employee invitations</h1>
          <p className="mt-1 text-sm text-muted">Invite team members and keep track of every invitation.</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
          <Users className="h-6 w-6" />
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-surface-elevated p-5 md:p-6">
        <h2 className="font-medium">Send an invitation</h2>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="employee-email">Employee email</label>
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-muted" />
            <input
              id="employee-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="employee@example.com"
              className="w-full rounded-xl border border-border bg-surface py-2.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending...' : 'Send invitation'}
          </button>
        </form>
        {message && <p className="mt-3 text-sm text-brand-700 dark:text-brand-300">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold">Sent invitations</h2>
            <p className="mt-1 text-sm text-muted">{invitations.length} invitation{invitations.length === 1 ? '' : 's'}</p>
          </div>
          <Clock3 className="h-5 w-5 text-muted" />
        </div>

        {loading && <p className="text-sm text-muted">Loading invitations...</p>}
        {!loading && invitations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No invitations have been sent yet.
          </div>
        )}
        {!loading && invitations.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
            <div className="hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted sm:grid">
              <span>Recipient</span><span>Status</span><span>Sent</span>
            </div>
            <div className="divide-y divide-border">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invitation.email}</p>
                    <p className="mt-1 text-xs text-muted sm:hidden">Sent {formatDate(invitation.created_at)}</p>
                  </div>
                  <span className={`w-fit rounded-lg px-2.5 py-1 text-xs font-medium ${statusStyles[invitation.status]}`}>
                    {invitation.status}
                  </span>
                  <span className="hidden text-sm text-muted sm:block">{formatDate(invitation.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold">Team members</h2>
            <p className="mt-1 text-sm text-muted">{employees.length} employee{employees.length === 1 ? '' : 's'} in this business</p>
          </div>
          <Users className="h-5 w-5 text-muted" />
        </div>

        {employees.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">
            No employees have joined this business yet.
          </div>
        )}
        {employees.length > 0 && (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface-elevated">
            {employees.map((employee) => (
              <div key={employee.user_id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{employee.full_name}</p>
                  <p className="truncate text-sm text-muted">{employee.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEmployee(employee)}
                  disabled={removingEmployee === employee.user_id}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {removingEmployee === employee.user_id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
