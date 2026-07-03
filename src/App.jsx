import React, { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { DataProvider, useData, getLowItems } from './hooks/useData'
import { signOut } from './lib/supabase'
import { Icons, Spinner, initials, ROLES, ROLE_CLS } from './components/UI'
import MyAccountModal from './components/MyAccountModal'
import BrandMark from './components/BrandMark'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MasterList from './pages/MasterList'
import OnHand from './pages/OnHand'
import Locations from './pages/Locations'
import Vendors from './pages/Vendors'
import PurchaseOrders from './pages/PurchaseOrders'
import Receiving from './pages/Receiving'
import Adjustments from './pages/Adjustments'
import Transfers from './pages/Transfers'
import Reports from './pages/Reports'
import Users from './pages/Users'

const NAV = [
  { id: 'dashboard',   label: 'Dashboard',        group: '' },
  { id: 'master',      label: 'Master List',       group: 'Inventory' },
  { id: 'onhand',      label: 'Inventory On Hand', group: 'Inventory' },
  { id: 'locations',   label: 'Locations',         group: 'Inventory' },
  { id: 'vendors',     label: 'Vendors',           group: 'Procurement' },
  { id: 'pos',         label: 'Purchase Orders',   group: 'Procurement' },
  { id: 'receiving',   label: 'Receiving',         group: 'Procurement' },
  { id: 'adjustments', label: 'Adjustments',       group: 'Operations' },
  { id: 'transfers',   label: 'Transfers',         group: 'Operations' },
  { id: 'reports',     label: 'Reports',           group: 'Reports' },
  { id: 'users',       label: 'Users',             group: 'Admin', managerOnly: true },
]

function Shell() {
  const { user, setUser, loading } = useAuth()
  const data = useData()
  const [page, setPage]           = useState('dashboard')
  const [sideOpen, setSideOpen]   = useState(false)
  const [myAccount, setMyAccount] = useState(false)

  if (loading) return <Spinner />
  if (!user)   return <Login />

  const canManage = user.role === 'admin' || user.role === 'manager'
  const lowCount  = data.loading ? 0 : getLowItems(data.items, data.inventory).length
  const visNav    = NAV.filter(n => !n.managerOnly || canManage)
  const groups    = [...new Set(visNav.map(n => n.group))]

  const navigate = p => { setPage(p); setSideOpen(false) }
  const logout   = async () => { await signOut(); setUser(null) }

  if (data.error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:20 }}>
      <div style={{ maxWidth:420, width:'100%' }}>
        <div className="alert alert-danger">{Icons.alert}
          <div>
            <strong>Connection Error</strong>
            <div style={{ marginTop:4, fontSize:13 }}>{data.error}</div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop:10 }} onClick={data.reload}>
              {Icons.refresh} Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  const pageTitle = NAV.find(n => n.id === page)?.label || ''

  return (
    <div className="shell">
      <div className={`overlay${sideOpen ? ' show' : ''}`} onClick={() => setSideOpen(false)} />

      <aside className={`sidebar${sideOpen ? ' open' : ''}`}>

        {/* ── Brand ─────────────────────────── */}
        <div className="sidebar-brand" style={{ padding: '14px 18px 12px' }}>
          <BrandMark size="sm" subtitle={true} />
        </div>

        {/* ── Nav ───────────────────────────── */}
        <nav className="sidebar-nav">
          {groups.map(g => (
            <div key={g}>
              {g && <div className="nav-group-label">{g}</div>}
              {visNav.filter(n => n.group === g).map(n => (
                <div key={n.id}
                  className={`nav-item${page === n.id ? ' active' : ''}`}
                  onClick={() => navigate(n.id)}>
                  {n.label}
                  {n.id === 'dashboard' && lowCount > 0 && (
                    <span className="nav-badge">{lowCount}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Footer ────────────────────────── */}
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="avatar">{initials(user.name)}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="user-name">{user.name}</div>
              <div style={{ marginTop:2 }}>
                <span className={`badge ${ROLE_CLS[user.role] || 'badge-slate'}`} style={{ fontSize:10 }}>
                  {ROLES[user.role] || user.role}
                </span>
              </div>
            </div>
            <button className="logout-btn" onClick={logout} title="Sign out">{Icons.logout}</button>
          </div>
          <button
            className="btn btn-secondary"
            style={{ width:'100%', justifyContent:'center', marginTop:8, fontSize:12, padding:'7px' }}
            onClick={() => setMyAccount(true)}>
            My Account
          </button>
        </div>
      </aside>

      <main className="main-area">
        {/* ── Topbar ────────────────────────── */}
        <div className="topbar">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button className="mobile-menu-btn" onClick={() => setSideOpen(true)}>{Icons.menu}</button>
            <div className="topbar-title">{pageTitle}</div>
          </div>
          <div className="topbar-right">
            {!data.loading && lowCount > 0 && (
              <div className="alert alert-warning" style={{ margin:0, padding:'5px 11px', fontSize:12 }}>
                {Icons.alert}<span>{lowCount} low stock</span>
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--sky-50)', border:'1px solid var(--sky-100)', borderRadius:8, padding:'5px 11px', cursor:'pointer' }}
              onClick={() => setMyAccount(true)} title="My Account">
              <div className="avatar" style={{ width:26, height:26, fontSize:11 }}>{initials(user.name)}</div>
              <span style={{ fontSize:12, fontWeight:600, color:'var(--sky-900)' }} className="hide-mobile">{user.name}</span>
              <span className={`badge ${ROLE_CLS[user.role] || 'badge-slate'}`} style={{ fontSize:10 }}>
                {ROLES[user.role] || user.role}
              </span>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={data.reload} title="Refresh" disabled={data.loading}>
              {data.loading ? <div className="spin" /> : Icons.refresh}
            </button>
          </div>
        </div>

        {/* ── Page content ──────────────────── */}
        <div className="page-content">
          {data.loading ? <Spinner /> : <>
            {page === 'dashboard'   && <Dashboard setPage={navigate} />}
            {page === 'master'      && <MasterList />}
            {page === 'onhand'      && <OnHand />}
            {page === 'locations'   && <Locations user={user} />}
            {page === 'vendors'     && <Vendors user={user} />}
            {page === 'pos'         && <PurchaseOrders user={user} />}
            {page === 'receiving'   && <Receiving />}
            {page === 'adjustments' && <Adjustments />}
            {page === 'transfers'   && <Transfers />}
            {page === 'reports'     && <Reports />}
            {page === 'users'       && canManage && <Users />}
          </>}
        </div>
      </main>

      {myAccount && <MyAccountModal profile={user} onClose={() => setMyAccount(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Shell />
        <Toaster position="top-right" toastOptions={{ style:{ fontFamily:'var(--font)', fontSize:13 } }} />
      </DataProvider>
    </AuthProvider>
  )
}
