import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, ArrowUpDown, ExternalLink } from 'lucide-react'
import { getTradeGroups, getUniqueTickers } from '../services/api'

export default function TradeLog({ dateFrom, dateTo }) {
  const [trades, setTrades] = useState([])
  const [tickers, setTickers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    ticker: '',
    side: '',
    sort_by: 'entry_date',
    sort_dir: 'desc',
  })

  useEffect(() => {
    loadTrades()
    getUniqueTickers().then(setTickers).catch(() => {})
  }, [])

  useEffect(() => {
    loadTrades()
  }, [filters, dateFrom, dateTo])

  async function loadTrades() {
    try {
      setLoading(true)
      const params = { ...filters }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const data = await getTradeGroups(params)
      setTrades(data)
    } catch (err) {
      console.error('Failed to load trades:', err)
    } finally {
      setLoading(false)
    }
  }

  function toggleSort(field) {
    setFilters((prev) => ({
      ...prev,
      sort_by: field,
      sort_dir: prev.sort_by === field && prev.sort_dir === 'desc' ? 'asc' : 'desc',
    }))
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatCurrency(val) {
    if (val === null || val === undefined) return '—'
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Trade Log</h1>
        <Link to="/import" className="btn-primary">Import Trades</Link>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-dark-muted" />
            <span className="text-sm text-dark-muted">Filters:</span>
          </div>

          <select
            className="select text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="CLOSED">Closed</option>
            <option value="OPEN">Open</option>
          </select>

          <select
            className="select text-sm"
            value={filters.ticker}
            onChange={(e) => setFilters({ ...filters, ticker: e.target.value })}
          >
            <option value="">All Tickers</option>
            {tickers.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            className="select text-sm"
            value={filters.side}
            onChange={(e) => setFilters({ ...filters, side: e.target.value })}
          >
            <option value="">All Sides</option>
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>
        </div>
      </div>

      {/* Trade Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              {[
                { key: 'ticker', label: 'Ticker' },
                { key: 'side', label: 'Side' },
                { key: 'entry_date', label: 'Entry Date' },
                { key: 'exit_date', label: 'Exit Date' },
                { key: 'entry_price', label: 'Entry' },
                { key: 'exit_price', label: 'Exit' },
                { key: 'quantity', label: 'Qty' },
                { key: 'pnl', label: 'P&L' },
                { key: 'pnl_percent', label: 'P&L %' },
                { key: 'status', label: 'Status' },
              ].map((col) => (
                <th
                  key={col.key}
                  className="text-left text-xs font-medium text-dark-muted uppercase tracking-wider py-3 px-4 cursor-pointer hover:text-dark-text transition-colors"
                  onClick={() => toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {filters.sort_by === col.key && (
                      <ArrowUpDown size={12} className="text-blue-400" />
                    )}
                  </div>
                </th>
              ))}
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-dark-muted">
                  Loading trades...
                </td>
              </tr>
            ) : trades.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-dark-muted">
                  No trades found. Import your trades to get started.
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white">{trade.ticker}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      trade.side === 'LONG'
                        ? 'bg-profit/20 text-profit'
                        : 'bg-loss/20 text-loss'
                    }`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{formatDate(trade.entry_date)}</td>
                  <td className="py-3 px-4 text-sm">{formatDate(trade.exit_date)}</td>
                  <td className="py-3 px-4 text-sm">{formatCurrency(trade.entry_price)}</td>
                  <td className="py-3 px-4 text-sm">{formatCurrency(trade.exit_price)}</td>
                  <td className="py-3 px-4 text-sm">{trade.quantity}</td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${
                      trade.pnl > 0 ? 'pnl-positive' : trade.pnl < 0 ? 'pnl-negative' : ''
                    }`}>
                      {formatCurrency(trade.pnl)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-sm ${
                      trade.pnl_percent > 0 ? 'pnl-positive' : trade.pnl_percent < 0 ? 'pnl-negative' : ''
                    }`}>
                      {trade.pnl_percent !== null ? `${trade.pnl_percent.toFixed(2)}%` : '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      trade.status === 'CLOSED'
                        ? 'bg-dark-border text-dark-muted'
                        : 'bg-blue-600/20 text-blue-400'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      to={`/trades/${trade.id}`}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink size={16} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-sm text-dark-muted">
        Showing {trades.length} trades
      </div>
    </div>
  )
}