import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import { getPerformanceByTicker, getPerformanceByDay, getPerformanceBySetup, getEquityCurve, getDrawdown } from '../services/api'

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-card border border-dark-border rounded-lg p-3 shadow-xl">
        <p className="text-dark-muted text-xs mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm font-medium" style={{ color: entry.color || '#e2e8f0' }}>
            {entry.name}: {typeof entry.value === 'number' && entry.name?.includes('$')
              ? `$${entry.value.toFixed(2)}`
              : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Analytics({ dateFrom, dateTo }) {
  const [byTicker, setByTicker] = useState([])
  const [byDay, setByDay] = useState([])
  const [bySetup, setBySetup] = useState([])
  const [equityCurve, setEquityCurve] = useState([])
  const [drawdown, setDrawdown] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [tickerData, dayData, setupData, curveData, ddData] = await Promise.all([
          getPerformanceByTicker(),
          getPerformanceByDay(),
          getPerformanceBySetup(),
          getEquityCurve(),
          getDrawdown(),
        ])
        setByTicker(tickerData)
        setByDay(dayData)
        setBySetup(setupData)
        setEquityCurve(curveData)
        setDrawdown(ddData)
      } catch (err) {
        console.error('Failed to load analytics:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="text-dark-muted">Loading analytics...</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Analytics</h1>

      {/* Equity Curve with Drawdown */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Equity Curve & Drawdown</h3>
        {equityCurve.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={equityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
              <YAxis yAxisId="balance" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <YAxis yAxisId="dd" orientation="right" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="balance" type="monotone" dataKey="balance" name="$ Balance" stroke="#3b82f6" fill="url(#blueGrad)" strokeWidth={2} />
              <Area yAxisId="dd" type="monotone" dataKey="drawdown_pct" name="Drawdown %" stroke="#ef4444" fill="url(#redGrad)" strokeWidth={1} />
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-dark-muted text-center py-16">No trade data yet</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance by Ticker */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">P&L by Ticker</h3>
          {byTicker.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byTicker.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="ticker" tick={{ fill: '#94a3b8', fontSize: 11 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" name="$ P&L" radius={[0, 4, 4, 0]}>
                  {byTicker.slice(0, 10).map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-dark-muted text-center py-16">No data</div>
          )}
        </div>

        {/* Performance by Day of Week */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">P&L by Day of Week</h3>
          {byDay.some(d => d.trades > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(d) => d.slice(0, 3)} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" name="$ P&L" radius={[4, 4, 0, 0]}>
                  {byDay.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-dark-muted text-center py-16">No data</div>
          )}
        </div>
      </div>

      {/* Ticker Stats Table */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Performance by Ticker</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Ticker</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Trades</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">P&L</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Win Rate</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Wins</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Losses</th>
            </tr>
          </thead>
          <tbody>
            {byTicker.map((t) => (
              <tr key={t.ticker} className="border-b border-dark-border/50">
                <td className="py-2 px-3 font-semibold">{t.ticker}</td>
                <td className="py-2 px-3 text-sm">{t.trades}</td>
                <td className={`py-2 px-3 font-medium ${t.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                  ${t.pnl.toFixed(2)}
                </td>
                <td className="py-2 px-3 text-sm">{t.win_rate}%</td>
                <td className="py-2 px-3 text-sm text-profit">{t.wins}</td>
                <td className="py-2 px-3 text-sm text-loss">{t.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Setup Performance */}
      {bySetup.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Performance by Setup</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Setup</th>
                <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Trades</th>
                <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">P&L</th>
                <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {bySetup.map((s) => (
                <tr key={s.setup_id} className="border-b border-dark-border/50">
                  <td className="py-2 px-3 font-semibold">{s.setup_name}</td>
                  <td className="py-2 px-3 text-sm">{s.trades}</td>
                  <td className={`py-2 px-3 font-medium ${s.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                    ${s.pnl.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-sm">{s.win_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}