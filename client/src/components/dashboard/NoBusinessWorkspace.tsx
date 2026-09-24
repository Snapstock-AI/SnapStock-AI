import { ArrowRight, Building2 } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'

export default function NoBusinessWorkspace() {
  const { user } = useAuth()
  const isEmployee = user?.businessRole === 'EMPLOYEE'

  if (isEmployee) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 md:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Building2 className="h-7 w-7" />
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-primary">
              Waiting for access
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Your workspace is being set up
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              Your account is linked as an employee. Please contact your business owner to ensure
              your invitation is properly configured and your account is connected to the workspace.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 md:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Building2 className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-primary">
            Welcome to SnapStock-AI
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Create your business workspace
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            You are signed in, but your account is not connected to a business yet. Create one to
            manage inventory, shelves, and freshness scans.
          </p>
          <Button asChild className="mt-7">
            <Link to="/onboarding/business">
              Create a business
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
