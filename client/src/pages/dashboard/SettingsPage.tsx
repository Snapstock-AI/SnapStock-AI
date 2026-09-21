import { useEffect, useState } from 'react'
import { Building2, Mail, MapPin, Pencil, Phone, Save, Trash2, UserRound, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAuth, type Business } from '@/context/AuthContext'
import { apiRequest } from '@/lib/api'
import { useTheme } from '@/hooks/use-theme'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
      <PageHeader
        title="Settings"
        description="Manage your storefront and preferences"
      />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <UserRound className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Profile details</CardTitle>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <CardDescription>Your account information</CardDescription>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <p className="rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                  {user?.full_name || 'Not available'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <p className="rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                  {user?.email || 'Not available'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Account role</Label>
                <p className="rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                  {user?.system_role || 'Not available'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Business details</CardTitle>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <CardDescription>Information for your current business</CardDescription>
                  {business?.role === 'OWNER' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleBusinessDelete}
                      disabled={deletingBusiness}
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingBusiness ? 'Deleting...' : 'Delete business'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {businessError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{businessError}</AlertDescription>
              </Alert>
            )}
            {!businessError && !business && user?.businessId && (
              <p className="text-sm text-muted-foreground">Loading business details...</p>
            )}
            {!user?.businessId && (
              <p className="text-sm text-muted-foreground">No business is connected to this account.</p>
            )}

            {business && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Business name</Label>
                  <Input
                    value={businessForm.business_name}
                    readOnly
                    onChange={(event) => setBusinessForm({ ...businessForm, business_name: event.target.value })}
                    required
                    maxLength={150}
                    className="cursor-default bg-muted"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Business email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={businessForm.business_email}
                      readOnly
                      className="cursor-default bg-muted pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Contact number</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={businessForm.contact_number}
                      readOnly
                      className="cursor-default bg-muted pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <p className="rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                    {business.role}
                  </p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Address</Label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      value={businessForm.address}
                      readOnly
                      className="cursor-default bg-muted pl-10"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {(message || error) && (
          <Alert variant={error ? 'destructive' : 'success'}>
            <AlertDescription>{error || message}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              {(['light', 'dark'] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={theme === t ? 'default' : 'outline'}
                  onClick={() => setTheme(t)}
                  className="capitalize"
                >
                  {t}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alert thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="low-stock">Low stock threshold</Label>
                <Input id="low-stock" type="number" defaultValue={25} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="freshness-alert">Freshness alert below</Label>
                <Input id="freshness-alert" type="number" defaultValue={65} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={editingProfile}
        onOpenChange={(open) => { if (!open) cancelProfileEdit(); }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account
            </p>
            <DialogTitle className="text-2xl">Edit profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                required
                maxLength={100}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <p className="rounded-md border border-border bg-muted px-3 py-2.5 text-sm">
                  {user?.email || 'Not available'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Account role</Label>
                <p className="rounded-md border border-border bg-muted px-3 py-2.5 text-sm">
                  {user?.system_role || 'Not available'}
                </p>
              </div>
            </div>
            {business?.role === 'OWNER' && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="font-medium">Business details</h3>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-business-name">Business name</Label>
                  <Input
                    id="edit-business-name"
                    value={businessForm.business_name}
                    onChange={(event) => setBusinessForm({ ...businessForm, business_name: event.target.value })}
                    required
                    maxLength={150}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-business-email">Business email</Label>
                  <Input
                    id="edit-business-email"
                    type="email"
                    value={businessForm.business_email}
                    onChange={(event) => setBusinessForm({ ...businessForm, business_email: event.target.value })}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-contact">Contact number</Label>
                  <Input
                    id="edit-contact"
                    value={businessForm.contact_number}
                    onChange={(event) => setBusinessForm({ ...businessForm, contact_number: event.target.value })}
                    required
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-address">Address</Label>
                  <Input
                    id="edit-address"
                    value={businessForm.address}
                    onChange={(event) => setBusinessForm({ ...businessForm, address: event.target.value })}
                    required
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={cancelProfileEdit} disabled={savingProfile}>
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button type="submit" disabled={savingProfile}>
                <Save className="h-4 w-4" /> {savingProfile ? 'Saving...' : 'Save profile'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
