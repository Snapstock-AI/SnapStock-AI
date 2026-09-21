import { ArrowRight, Building2 } from 'lucide-react'
import { Link } from 'react-router'

export default function NoBusinessWorkspace() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="rounded-3xl border border-brand-200 bg-brand-50 p-6 dark:border-brand-800 dark:bg-brand-900/20 md:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
          <Building2 className="h-7 w-7" />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-300">Welcome to SnapStock-AI</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Create your business workspace</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
          You are signed in, but your account is not connected to a business yet. Create one to manage inventory, shelves, and freshness scans.
        </p>
        <Link
          to="/onboarding/business"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Create a business
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
