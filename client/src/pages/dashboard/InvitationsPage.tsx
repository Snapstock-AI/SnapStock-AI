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
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const statusVariant: Record<Invitation['status'], 'warning' | 'success' | 'secondary' | 'destructive'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  EXPIRED: 'secondary',
  CANCELLED: 'destructive',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function InvitationsPage() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState('')
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
      await sendEmployeeInvitation(user.businessId, {
        email: email.trim(),
        full_name: fullName.trim() || undefined,
      })
      setFullName('')
      setEmail('')
      setMessage('Invitation email sent. They can sign up or sign in, then open the link to join.')
      await loadWorkspace()
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : 'Unable to send invitation.')
    } finally {
      setSending(false)
    }
  }

  async function handleRemoveEmployee(employee: Employee) {
    if (!user?.businessId) return
    if (
      !window.confirm(
        `Remove ${employee.full_name} from this workspace? Their account stays active for other businesses.`,
      )
    )
      return

    setRemovingEmployee(employee.user_id)
    setError('')
    try {
      await removeEmployee(user.businessId, employee.user_id)
      setEmployees((currentEmployees) =>
        currentEmployees.filter((item) => item.user_id !== employee.user_id),
      )
      setMessage(`${employee.full_name} was removed from this workspace.`)
    } catch (removeError: unknown) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove employee.')
    } finally {
      setRemovingEmployee(null)
    }
  }

  if (!user?.businessId) {
    return <p className="text-sm text-muted-foreground">Connect this account to a business to manage invitations.</p>
  }

  if (loading && isOwner === null) {
    return <p className="text-sm text-muted-foreground">Loading team management...</p>
  }

  if (!isOwner) {
    return <p className="text-sm text-muted-foreground">Only the business owner can manage employees and invitations.</p>
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <PageHeader
            className="mt-4 mb-0"
            title="Employee invitations"
            description="Invite people by email. They join this workspace as employees after signing in."
          />
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Users className="h-6 w-6" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send an invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="employee-name">Display name (optional)</Label>
              <Input
                id="employee-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Name used in the email greeting"
              />
            </div>
            <div>
              <Label htmlFor="employee-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="employee-email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="employee@example.com"
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" disabled={sending} className="sm:col-span-2 sm:justify-self-start">
              <Send className="h-4 w-4" />
              {sending ? 'Sending...' : 'Send invitation'}
            </Button>
          </form>
          {message && (
            <Alert variant="success" className="mt-3">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Sent invitations</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {invitations.length} invitation{invitations.length === 1 ? '' : 's'}
            </p>
          </div>
          <Clock3 className="h-5 w-5 text-muted-foreground" />
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading invitations...</p>}
        {!loading && invitations.length === 0 && (
          <EmptyState title="No invitations have been sent yet." />
        )}
        {!loading && invitations.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="hidden grid-cols-[minmax(0,1fr)_auto_auto] gap-4 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:grid">
                <span>Recipient</span><span>Status</span><span>Sent</span>
              </div>
              <div className="divide-y divide-border">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="grid gap-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{invitation.email}</p>
                      <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                        Sent {formatDate(invitation.created_at)}
                      </p>
                    </div>
                    <Badge variant={statusVariant[invitation.status]}>{invitation.status}</Badge>
                    <span className="hidden text-sm text-muted-foreground sm:block">
                      {formatDate(invitation.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Team members</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {employees.length} employee{employees.length === 1 ? '' : 's'} in this workspace
            </p>
          </div>
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>

        {employees.length === 0 && (
          <EmptyState title="No employees have joined this business yet." />
        )}
        {employees.length > 0 && (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {employees.map((employee) => (
                <div key={employee.user_id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{employee.full_name}</p>
                    <p className="truncate text-sm text-muted-foreground">{employee.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveEmployee(employee)}
                    disabled={removingEmployee === employee.user_id}
                    className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {removingEmployee === employee.user_id ? 'Removing...' : 'Remove'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
