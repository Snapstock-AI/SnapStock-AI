import { useLocation, Outlet } from 'react-router'

/** Soft enter animation when switching dashboard tabs. */
export default function PageTransition() {
  const location = useLocation()

  return (
    <div
      key={location.pathname}
      className="dashboard-page-enter"
      style={{ minHeight: '40vh' }}
    >
      <Outlet />
    </div>
  )
}
