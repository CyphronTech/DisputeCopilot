import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { logout, whoami } from '../api/client'
import { Icon } from './Icon'

const CRUMBS: Record<string, string> = {
  '/': 'Cases',
  '/policies': 'Your policies',
  '/audit': 'Activity log',
  '/setup': 'Setup',
}

const NAV = [
  { to: '/', label: 'Cases', icon: 'cases', end: true },
  { to: '/policies', label: 'Your policies', icon: 'policy' },
  { to: '/audit', label: 'Activity log', icon: 'audit' },
  { to: '/setup', label: 'Setup', icon: 'setup' },
]

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    whoami().then((session) => setEmail(session?.email ?? null))
  }, [])

  const initials = email ? email.slice(0, 2).toUpperCase() : '—'

  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand-row">
          <img className="brand-mark" src="/favicon.svg" alt="" />
          <div className="brand-text">
            <div className="brand-name">DisputeCopilot</div>
            <div className="brand-sub">Dispute evidence assistant</div>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} title={item.label} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={item.icon} />
              <span className="label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="profile-row">
            <div className="avatar">{initials}</div>
            <div className="profile-text">
              <div className="profile-name">{email ?? 'Not signed in'}</div>
              <div className="profile-role">Admin</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="content">
        <Topbar onToggleSidebar={() => setCollapsed((c) => !c)} initials={initials} />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Topbar({ onToggleSidebar, initials }: { onToggleSidebar: () => void; initials: string }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(pathname === '/' ? searchParams.get('q') ?? '' : '')

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function handleSearch(value: string) {
    setQuery(value)
    navigate(value ? `/?q=${encodeURIComponent(value)}` : '/', { replace: pathname === '/' })
  }

  const crumb = CRUMBS[pathname] ?? Object.entries(CRUMBS).find(([path]) => pathname.startsWith(path) && path !== '/')?.[1] ?? 'Cases'
  return (
    <div className="topbar">
      <button className="icon-btn" onClick={onToggleSidebar} title="Show or hide the menu" aria-label="Show or hide the menu">
        <Icon name="menu" />
      </button>
      <div className="crumbs">
        <span className="cur">{crumb}</span>
      </div>
      <div className="topbar-spacer" />
      <div className="search-box">
        <Icon name="search" />
        <input
          type="search"
          aria-label="Search cases by order ID, customer name or email"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search cases…"
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', width: '100%', font: 'inherit' }}
        />
      </div>
      <div className="topbar-divider" />
      <button className="btn btn-ghost btn-sm topbar-profile" onClick={handleLogout}>
        <div className="avatar" aria-hidden="true">{initials}</div>
        Sign out
      </button>
    </div>
  )
}
