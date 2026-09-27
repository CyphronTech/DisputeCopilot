import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { logout, whoami } from '../api/client'
import { Icon } from './Icon'

const CRUMBS: Record<string, string> = {
  '/': 'Cases',
  '/policies': 'Policy Library',
  '/audit': 'Audit',
  '/setup': 'Setup',
}

const NAV = [
  { to: '/', label: 'Cases', icon: 'cases', end: true },
  { to: '/policies', label: 'Policy Library', icon: 'policy' },
  { to: '/audit', label: 'Audit', icon: 'audit' },
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
            <div className="brand-sub">Northwind Retail</div>
          </div>
        </div>
        <div className="workspace-pick" style={{ cursor: 'default' }}>
          Production
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? 'active' : '')}>
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
      <button className="icon-btn" onClick={onToggleSidebar} title="Toggle sidebar">
        <Icon name="menu" />
      </button>
      <div className="crumbs">
        <span className="cur">{crumb}</span>
      </div>
      <div className="topbar-spacer" />
      <div className="search-box">
        <Icon name="search" />
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search order ID, customer…"
          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', width: '100%' }}
        />
      </div>
      <div className="topbar-divider" />
      <div className="topbar-profile" onClick={handleLogout} title="Sign out" style={{ cursor: 'pointer' }}>
        <div className="avatar">{initials}</div>
        <Icon name="chevron-down" />
      </div>
    </div>
  )
}
