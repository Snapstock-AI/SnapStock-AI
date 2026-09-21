import { useState, type FormEvent } from 'react'
import { Building2, Check, MapPin, Phone, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router'
import Logo from '@/components/Logo'
import ThemeToggle from '@/components/ThemeToggle'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    <div className="min-h-dvh bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button type="button" variant="ghost" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-10 px-4 py-10 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <section className="max-w-lg">
          <Badge variant="success" className="gap-1.5 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            One last step
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Give your inventory a home.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            Set up your business workspace, then invite your team and start scanning shelves with
            SnapStock-AI.
          </p>

          <div className="mt-8 space-y-4">
            {[
              'You become the business owner automatically',
              'Invite employees from your workspace',
              'Track inventory, shelves, and freshness in one place',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <Card>
          <CardHeader>
            <div className="mb-2 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl">Create your business</CardTitle>
                <CardDescription className="mt-1">
                  Welcome, {user?.full_name?.split(' ')[0] || 'there'}.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="business_name">Business name</Label>
                <Input
                  id="business_name"
                  required
                  maxLength={150}
                  value={form.business_name}
                  onChange={(event) => updateField('business_name', event.target.value)}
                  placeholder="Fresh Mart"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_email">Business email</Label>
                <Input
                  id="business_email"
                  type="email"
                  required
                  value={form.business_email}
                  onChange={(event) => updateField('business_email', event.target.value)}
                  placeholder="hello@freshmart.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Business address</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    required
                    value={form.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    placeholder="123 Main Street, Colombo"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_number">Contact number</Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact_number"
                    required
                    maxLength={20}
                    value={form.contact_number}
                    onChange={(event) => updateField('contact_number', event.target.value)}
                    placeholder="+94 77 123 4567"
                    className="pl-9"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating workspace...' : 'Create business and continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
