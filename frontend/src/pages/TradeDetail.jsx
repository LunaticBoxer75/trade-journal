import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Star, Save, Trash2, Scissors, Check, X } from 'lucide-react'
import { getTradeGroup, updateTradeGroup, deleteTradeGroup, splitTradeGroup, getTags, getSetups } from '../services/api'

function TradingViewChart({ ticker }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !ticker) return

    // Clear previous widget
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: ticker,
      interval: 'D',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      support_host: 'https://www.tradingview.com',
      backgroundColor: '#1a1d29',
      gridColor: '#2a2d3a',
      hide_volume: false,
    })

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = '100%'
    widgetDiv.style.width = '100%'

    containerRef.current.appendChild(widgetDiv)
    containerRef.current.appendChild(script)
  }, [ticker])

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height: '700px', width: '100%' }}>
      <div className="tradingview-widget-container__widget" style={{ height: '100%', width: '100%' }}></div>
    </div>
  )
}

export default function TradeDetail() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const [trade, setTrade] = useState(null)
  const [allTags, setAllTags] = useState([])
  const [allSetups, setAllSetups] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [splitMode, setSplitMode] = useState(false)
  const [selectedTradeIds, setSelectedTradeIds] = useState(new Set())
  const [splitting, setSplitting] = useState(false)
  const [editForm, setEditForm] = useState({
    notes: '',
    mistakes: '',
    rating: 0,
    setup_id: null,
    tag_ids: [],
  })

  useEffect(() => {
    loadData()
  }, [groupId])

  async function loadData() {
    try {
      const [tradeData, tagsData, setupsData] = await Promise.all([
        getTradeGroup(groupId),
        getTags(),
        getSetups(),
      ])
      setTrade(tradeData)
      setAllTags(tagsData)
      setAllSetups(setupsData)
      setEditForm({
        notes: tradeData.notes || '',
        mistakes: tradeData.mistakes || '',
        rating: tradeData.rating || 0,
        setup_id: tradeData.setup_id,
        tag_ids: tradeData.tags?.map((t) => t.id) || [],
      })
    } catch (err) {
      console.error('Failed to load trade:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      await updateTradeGroup(groupId, editForm)
      await loadData()
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this trade group?')) return
    try {
      await deleteTradeGroup(groupId)
      navigate('/trades')
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  function toggleTradeSelection(tradeId) {
    setSelectedTradeIds((prev) => {
      const next = new Set(prev)
      if (next.has(tradeId)) {
        next.delete(tradeId)
      } else {
        next.add(tradeId)
      }
      return next
    })
  }

  async function handleSplit() {
    if (selectedTradeIds.size === 0) return
    if (selectedTradeIds.size === trade.trades?.length) {
      alert("Cannot move all executions. Use delete instead.")
      return
    }
    try {
      setSplitting(true)
      const newGroup = await splitTradeGroup(groupId, Array.from(selectedTradeIds))
      setSplitMode(false)
      setSelectedTradeIds(new Set())
      navigate(`/trades/${newGroup.id}`)
    } catch (err) {
      alert('Split failed: ' + err.message)
    } finally {
      setSplitting(false)
    }
  }

  function cancelSplit() {
    setSplitMode(false)
    setSelectedTradeIds(new Set())
  }

  function toggleTag(tagId) {
    setEditForm((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter((id) => id !== tagId)
        : [...prev.tag_ids, tagId],
    }))
  }

  if (loading) {
    return <div className="text-dark-muted">Loading trade...</div>
  }

  if (!trade) {
    return <div className="text-dark-muted">Trade not found</div>
  }

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  const formatCurrency = (v) => v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/trades" className="text-dark-muted hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{trade.ticker}</h1>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              trade.side === 'LONG' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
            }`}>
              {trade.side}
            </span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              trade.status === 'CLOSED' ? 'bg-dark-border text-dark-muted' : 'bg-blue-600/20 text-blue-400'
            }`}>
              {trade.status}
            </span>
          </div>
          <p className="text-dark-muted text-sm mt-1">
            {formatDate(trade.entry_date)} → {formatDate(trade.exit_date)}
          </p>
        </div>
        <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
          <Trash2 size={16} />
          Delete
        </button>
      </div>

      {/* Trade Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="card">
          <span className="stat-label">Entry Price</span>
          <div className="text-lg font-semibold">{formatCurrency(trade.entry_price)}</div>
        </div>
        <div className="card">
          <span className="stat-label">Exit Price</span>
          <div className="text-lg font-semibold">{formatCurrency(trade.exit_price)}</div>
        </div>
        <div className="card">
          <span className="stat-label">Quantity</span>
          <div className="text-lg font-semibold">{trade.quantity}</div>
        </div>
        <div className="card">
          <span className="stat-label">P&L</span>
          <div className={`text-lg font-semibold ${trade.pnl > 0 ? 'pnl-positive' : trade.pnl < 0 ? 'pnl-negative' : ''}`}>
            {formatCurrency(trade.pnl)}
          </div>
        </div>
        <div className="card">
          <span className="stat-label">P&L %</span>
          <div className={`text-lg font-semibold ${trade.pnl_percent > 0 ? 'pnl-positive' : trade.pnl_percent < 0 ? 'pnl-negative' : ''}`}>
            {trade.pnl_percent != null ? `${trade.pnl_percent.toFixed(2)}%` : '—'}
          </div>
        </div>
        <div className="card">
          <span className="stat-label">R-Multiple</span>
          <div className="text-lg font-semibold">{trade.r_multiple ?? '—'}</div>
        </div>
      </div>

      {/* TradingView Chart */}
      <div className="card mb-8">
        <h3 className="text-lg font-semibold mb-4">Chart — {trade.ticker}</h3>
        <div className="max-w-3xl mx-auto">
          <TradingViewChart ticker={trade.ticker} />
        </div>
      </div>

      {/* Individual Trades / Executions */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Executions</h3>
          {!splitMode ? (
            <button
              onClick={() => setSplitMode(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
              disabled={!trade.trades || trade.trades.length < 2}
            >
              <Scissors size={14} />
              Split Trade
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-yellow-400">
                Select executions to move ({selectedTradeIds.size} selected)
              </span>
              <button
                onClick={handleSplit}
                disabled={splitting || selectedTradeIds.size === 0}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Check size={14} />
                {splitting ? 'Splitting...' : 'Create New Trade'}
              </button>
              <button onClick={cancelSplit} className="btn-secondary flex items-center gap-2 text-sm">
                <X size={14} />
                Cancel
              </button>
            </div>
          )}
        </div>

        {splitMode && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-sm text-yellow-300">
            Check the executions you want to move to a new trade group. The remaining executions stay in this trade.
          </div>
        )}

        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              {splitMode && <th className="py-2 px-3 w-10"></th>}
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Action</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Date</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Qty</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Price</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase py-2 px-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {trade.trades?.map((t) => (
              <tr
                key={t.id}
                className={`border-b border-dark-border/50 transition-colors ${
                  splitMode && selectedTradeIds.has(t.id)
                    ? 'bg-yellow-500/10'
                    : splitMode ? 'hover:bg-dark-border/20 cursor-pointer' : ''
                }`}
                onClick={splitMode ? () => toggleTradeSelection(t.id) : undefined}
              >
                {splitMode && (
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={selectedTradeIds.has(t.id)}
                      onChange={() => toggleTradeSelection(t.id)}
                      className="w-4 h-4 rounded accent-yellow-500"
                    />
                  </td>
                )}
                <td className="py-2 px-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    t.action === 'BUY' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                  }`}>
                    {t.action}
                  </span>
                </td>
                <td className="py-2 px-3 text-sm">{formatDate(t.trade_date)}</td>
                <td className="py-2 px-3 text-sm">{t.quantity}</td>
                <td className="py-2 px-3 text-sm">{formatCurrency(t.price)}</td>
                <td className="py-2 px-3 text-sm">{formatCurrency(t.total_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Notes & Mistakes */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Notes</h3>
            <textarea
              className="textarea w-full h-32"
              placeholder="What was your thesis? Why did you enter this trade?"
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
            />
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Mistakes</h3>
            <textarea
              className="textarea w-full h-32"
              placeholder="What did you do wrong? What would you do differently?"
              value={editForm.mistakes}
              onChange={(e) => setEditForm({ ...editForm, mistakes: e.target.value })}
            />
          </div>
        </div>

        {/* Rating, Setup, Tags */}
        <div className="space-y-6">
          {/* Rating */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Rating</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setEditForm({ ...editForm, rating: star })}
                  className="transition-colors"
                >
                  <Star
                    size={28}
                    className={star <= editForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-dark-border'}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Setup */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Setup / Strategy</h3>
            <select
              className="select w-full"
              value={editForm.setup_id || ''}
              onChange={(e) => setEditForm({ ...editForm, setup_id: e.target.value ? parseInt(e.target.value) : null })}
            >
              <option value="">No setup selected</option>
              {allSetups.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.length === 0 ? (
                <p className="text-sm text-dark-muted">
                  No tags yet. <Link to="/tags" className="text-blue-400 hover:underline">Create tags</Link>
                </p>
              ) : (
                allTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      editForm.tag_ids.includes(tag.id)
                        ? 'border-transparent text-white'
                        : 'border-dark-border text-dark-muted hover:text-white'
                    }`}
                    style={{
                      backgroundColor: editForm.tag_ids.includes(tag.id) ? tag.color : 'transparent',
                    }}
                  >
                    {tag.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}