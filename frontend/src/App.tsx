import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { whoami } from './api/client'
import { Layout } from './components/Layout'
import { AuditLog } from './pages/AuditLog'
import { CaseList } from './pages/CaseList'
import { CaseWorkspace } from './pages/CaseWorkspace'
import { DraftReport } from './pages/DraftReport'
import { Login } from './pages/Login'
import { PolicyLibrary } from './pages/PolicyLibrary'
import { Setup } from './pages/Setup'

function RequireAuth() {
  const [status, setStatus] = useState<'checking' | 'authed' | 'anon'>('checking')

  useEffect(() => {
    whoami().then((user) => setStatus(user ? 'authed' : 'anon'))
  }, [])

  // Rendering nothing here used to mean a blank white page for as long as the check took —
  // and forever if it never resolved.
  if (status === 'checking') {
    return <div style={{ padding: 40, color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
  }
  if (status === 'anon') return <Navigate to="/login" replace />
  return <Outlet />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<CaseList />} />
            <Route path="/cases/:caseId" element={<CaseWorkspace />} />
            <Route path="/cases/:caseId/report" element={<DraftReport />} />
            <Route path="/policies" element={<PolicyLibrary />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/setup" element={<Setup />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
