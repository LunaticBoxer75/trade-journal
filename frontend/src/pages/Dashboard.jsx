import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Target, Award,
  ArrowUpRight, ArrowDownRight, Activity,
} from 'lucide-react'
import { getDashboardStats, getEquityCurve, getDrawdown, getDailyPnl } from '../services/api'

function StatCard({ label, value, icon: Icon, color = 'text-white', prefix = '', suffix = '' }) {
  const isNegative = typeof value === 'number' && value < 0

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="stat-label">{label}</span>
        <Icon size={18} className={color} />
      </div>
      <div className={`stat-value ${isNegative ? 'pnl-negative' : typeof value === 'number' && value > 0 ? 'pnl-positive' : ''}`}>
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}{suffix}
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-xl">
        <p className="text-dark-muted text-xs mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: ${entry.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard({ dateFrom, dateTo }) {
  const [stats, setStats] = useState(null)
  const [equityCurve, setEquityCurve] = useState([])
  const [drawdown, setDrawdown] = useState(null)
  const [dailyPnl, setDailyPnl] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, curveData, ddData, dailyData] = await Promise.all([
          getDashboardStats(dateFrom, dateTo),
          getEquityCurve(),
          getDrawdown(),
          getDailyPnl(dateFrom, dateTo),
        ])
        setStats(statsData)
        setEquityCurve(curveData)
        setDrawdown(ddData)
        setDailyPnl(dailyData.slice(-30))
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [dateFrom, dateTo])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-muted">Loading dashboard...</div>
      </div>
    )
  }

  if (!stats || stats.total_trades === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Activity size={48} className="text-dark-muted" />
        <h2 className="text-xl font-semibold text-dark-muted">No trades yet</h2>
        <p className="text-dark-muted text-sm">Import your Robinhood trades to get started</p>
        <Link to="/import" className="btn-primary">
          Import Trades
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total P&L"
          value={stats.total_pnl}
          icon={DollarSign}
          prefix="$"
        />
        <StatCard
          label="Win Rate"
          value={stats.win_rate}
          icon={Target}
          suffix="%"
          color="text-blue-400"
        />
        <StatCard
          label="Profit Factor"
          value={stats.profit_factor}
          icon={Award}
          color="text-purple-400"
        />
        <StatCard
          label="Total Trades"
          value={stats.total_trades}
          icon={Activity}
          color="text-yellow-400"
        />
      </div>

      {/* Second row stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Average Win"
          value={stats.avg_win}
          icon={ArrowUpRight}
          prefix="$"
          color="text-profit"
        />
        <StatCard
          label="Average Loss"
          value={stats.avg_loss}
          icon={ArrowDownRight}
          prefix="$"
          color="text-loss"
        />
        <StatCard
          label="Best Trade"
          value={stats.best_trade}
          icon={TrendingUp}
          prefix="$"
          color="text-profit"
        />
        <StatCard
          label="Worst Trade"
          value={stats.worst_trade}
          icon={TrendingDown}
          prefix="$"
          color="text-loss"
        />
      </div>

      {/* Drawdown Stats */}
      {drawdown && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <span className="stat-label">Current Drawdown</span>
            <div className={`stat-value ${drawdown.in_drawdown ? 'pnl-negative' : 'pnl-positive'}`}>
              {drawdown.current_drawdown_pct.toFixed(2)}%
            </div>
            <span className="text-xs text-dark-muted">${drawdown.current_drawdown.toFixed(2)}</span>
          </div>
          <div className="card">
            <span className="stat-label">Max Drawdown</span>
            <div className="stat-value pnl-negative">
              {drawdown.max_drawdown_pct.toFixed(2)}%
            </div>
            <span className="text-xs text-dark-muted">${drawdown.max_drawdown.toFixed(2)}</span>
          </div>
          <div className="card">
            <span className="stat-label">Drawdown Duration</span>
            <div className="stat-value text-yellow-400">
              {drawdown.drawdown_duration_days} days
            </div>
          </div>
          <div className="card">
            <span className="stat-label">Win/Loss Ratio</span>
            <div className="stat-value text-blue-400">
              {stats.total_winning_trades}W / {stats.total_losing_trades}L
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Equity Curve */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Equity Curve</h3>
          {equityCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  stroke="#3b82f6"
                  fill="url(#blueGradient)"
                  strokeWidth={2}
                />
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-dark-muted">
              No data yet
            </div>
          )}
        </div>

        {/* Daily P&L Bar Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Daily P&L (Last 30 Days)</h3>
          {dailyPnl.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyPnl}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="pnl"
                  name="P&L"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  fillOpacity={0.9}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-dark-muted">
              No data yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}