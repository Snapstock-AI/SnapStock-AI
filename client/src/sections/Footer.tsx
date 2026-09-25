import { Link } from 'react-router'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-xl font-semibold">SnapStock-AI</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Computer vision inventory and freshness monitoring for the corner shop, the fruit
              stall, the neighborhood grocer.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold">Product</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-foreground">
                  How it works
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground">
                  Pricing
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Account</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/login" className="hover:text-foreground">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-foreground">
                  Create account
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-foreground">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SnapStock-AI. Made for small-scale retailers.
        </div>
      </div>
    </footer>
  )
}
