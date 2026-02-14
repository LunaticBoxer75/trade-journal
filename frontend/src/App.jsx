import { useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  LineChart,
  BookOpen,
  Target,
  Tags,
  Upload,
  BarChart3,
  Calendar,
  Settings,
  TrendingUp,
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import TradeLog from './pages/TradeLog'
import TradeDetail from './pages/TradeDetail'
import Analytics from './pages/Analytics'
import CalendarView from './pages/CalendarView'
import Journal from './pages/Journal'
import Playbook from './pages/Playbook'
import TagsPage from './pages/TagsPage'
import ImportPage from './pages/ImportPage'
import SettingsPage from './pages/SettingsPage'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/trades', icon: LineChart, label: 'Trade Log' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/journal', icon: BookOpen, label: 'Journal' },
  { path: '/playbook', icon: Target, label: 'Playbook' },
  { path: '/tags', icon: Tags, label: 'Tags' },
  { path: '/import', icon: Upload, label: 'Import' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

const DATE_PRESETS = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom', value: 'custom' },
]

function getPresetDates(preset) {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  switch (preset) {
    case 'today':
      return { dateFrom: today, dateTo: today }
    case 'week': {
      const d = new Date(now)
      d.setDate(d.getDate() - d.getDay()) // Sunday
      return { dateFrom: d.toISOString().slice(0, 10), dateTo: today }
    }
    case 'month': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1)
      return { dateFrom: d.toISOString().slice(0, 10), dateTo: today }
    }
    case '30d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      return { dateFrom: d.toISOString().slice(0, 10), dateTo: today }
    }
    case '90d': {
      const d = new Date(now)
      d.setDate(d.getDate() - 90)
      return { dateFrom: d.toISOString().slice(0, 10), dateTo: today }
    }
    case 'year': {
      return { dateFrom: `${now.getFullYear()}-01-01`, dateTo: today }
    }
    default:
      return { dateFrom: '', dateTo: '' }
  }
}

export default function App() {
  const location = useLocation()
  const [datePreset, setDatePreset] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  function handlePresetChange(preset) {
    setDatePreset(preset)
    if (preset !== 'custom') {
      const { dateFrom: df, dateTo: dt } = getPresetDates(preset)
      setDateFrom(df)
      setDateTo(dt)
    }
  }

  // Pages that should show the date filter
  const showDateFilter = ['/', '/trades', '/analytics', '/calendar'].includes(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-card border-r border-dark-border flex flex-col shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">TradeJournal</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-dark-muted hover:text-dark-text hover:bg-dark-border/50'
                }`
              }
              end={item.path === '/'}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-dark-border">
          <p className="text-xs text-dark-muted text-center">TradeJournal v1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Global Date Filter Bar */}
        {showDateFilter && (
          <div className="sticky top-0 z-20 bg-dark-bg border-b border-dark-border px-8 py-3">
            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-dark-muted" />
              <div className="flex items-center gap-1">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePresetChange(p.value)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      datePreset === p.value
                        ? 'bg-blue-600 text-white'
                        : 'text-dark-muted hover:text-white hover:bg-dark-border/50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-dark-card border border-dark-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="text-dark-muted text-xs">to</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-dark-card border border-dark-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              {dateFrom && (
                <span className="text-xs text-dark-muted ml-2">
                  {dateFrom} → {dateTo || 'now'}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard dateFrom={dateFrom} dateTo={dateTo} />} />
            <Route path="/trades" element={<TradeLog dateFrom={dateFrom} dateTo={dateTo} />} />
            <Route path="/trades/:groupId" element={<TradeDetail />} />
            <Route path="/analytics" element={<Analytics dateFrom={dateFrom} dateTo={dateTo} />} />
            <Route path="/calendar" element={<CalendarView dateFrom={dateFrom} dateTo={dateTo} />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/playbook" element={<Playbook />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}