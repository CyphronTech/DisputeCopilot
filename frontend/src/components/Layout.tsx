import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { logout } from '../api/client'
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
  return (
    <div className={`shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark">DC</div>
          <div className="brand-text">
            <div className="brand-name">DisputeCopilot</div>
            <div className="brand-sub">Northwind Retail</div>
          </div>
        </div>
        <div className="workspace-pick">
          Production
          <Icon name="chevron-down" />
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
            <div className="avatar">AR</div>
            <div className="profile-text">
              <div className="profile-name">Aditi Rao</div>
              <div className="profile-role">Dispute Analyst</div>
            </div>
          </div>
        </div>
      </aside>
      <div className="content">
        <Topbar onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
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
        <div className="avatar">AR</div>
        <Icon name="chevron-down" />
      </div>
    </div>
  )
}
