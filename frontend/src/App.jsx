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

export default function App() {
  const location = useLocation()

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
        <div className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trades" element={<TradeLog />} />
            <Route path="/trades/:groupId" element={<TradeDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calendar" element={<CalendarView />} />
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