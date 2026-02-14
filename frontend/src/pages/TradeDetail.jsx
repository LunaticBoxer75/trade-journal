import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Star, Save, Trash2, Scissors, Check, X } from 'lucide-react'
import { createChart, ColorType } from 'lightweight-charts'
import { getTradeGroup, updateTradeGroup, deleteTradeGroup, splitTradeGroup, getTags, getSetups, getTradeChartData } from '../services/api'

function TradeChart({ groupId }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const [chartError, setChartError] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current || !groupId) return

    let chart = null

    async function buildChart() {
      try {
        setChartLoading(true)
        setChartError(null)

        const data = await getTradeChartData(groupId)

        if (!data.candles || data.candles.length === 0) {
          setChartError('No price data available for this ticker')
          return
        }

        // Clear previous chart
        if (chartRef.current) {
          chartRef.current.remove()
          chartRef.current = null
        }
        containerRef.current.innerHTML = ''

        chart = createChart(containerRef.current, {
          width: containerRef.current.clientWidth,
          height: 600,
          layout: {
            background: { type: ColorType.Solid, color: '#1a1d29' },
            textColor: '#9ca3af',
          },
          grid: {
            vertLines: { color: '#2a2d3a' },
            horzLines: { color: '#2a2d3a' },
          },
          crosshair: {
            mode: 0,
          },
          rightPriceScale: {
            borderColor: '#2a2d3a',
          },
          timeScale: {
            borderColor: '#2a2d3a',
            timeVisible: false,
          },
        })

        chartRef.current = chart

        // Candlestick series
        const candleSeries = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444',
        })

        candleSeries.setData(data.candles)

        // Volume series
        const volumeSeries = chart.addHistogramSeries({
          color: '#4b5563',
          priceFormat: { type: 'volume' },
          priceScaleId: '',
        })

        volumeSeries.priceScale().applyOptions({
          scaleMargins: { top: 0.8, bottom: 0 },
        })

        const volumeData = data.candles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
        }))
        volumeSeries.setData(volumeData)

        // Add execution markers
        if (data.markers && data.markers.length > 0) {
          candleSeries.setMarkers(data.markers)
        }

        // Fit content
        chart.timeScale().fitContent()

        // Resize handler
        const handleResize = () => {
          if (chart && containerRef.current) {
            chart.applyOptions({ width: containerRef.current.clientWidth })
          }
        }
        window.addEventListener('resize', handleResize)

        return () => window.removeEventListener('resize', handleResize)
      } catch (err) {
        console.error('Chart error:', err)
        setChartError(err.message || 'Failed to load chart data')
      } finally {
        setChartLoading(false)
      }
    }

    buildChart()

    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [groupId])

  return (
    <div>
      {chartLoading && (
        <div className="flex items-center justify-center h-[600px] text-dark-muted">
          Loading chart data...
        </div>
      )}
      {chartError && (
        <div className="flex items-center justify-center h-[600px] text-dark-muted text-sm">
          {chartError}
        </div>
      )}
      <div ref={containerRef} style={{ display: chartLoading || chartError ? 'none' : 'block' }} />
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

  useEffect(() => { loadData() }, [groupId])

  async function loadData() {
    try {
      const [tradeData, tagsData, setupsData] = await Promise.all([
        getTradeGroup(groupId), getTags(), getSetups(),
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
    } catch (err) { console.error('Failed to save:', err) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this trade group?')) return
    try { await deleteTradeGroup(groupId); navigate('/trades') }
    catch (err) { console.error('Failed to delete:', err) }
  }

  function toggleTradeSelection(tradeId) {
    setSelectedTradeIds((prev) => {
      const next = new Set(prev)
      next.has(tradeId) ? next.delete(tradeId) : next.add(tradeId)
      return next
    })
  }

  async function handleSplit() {
    if (selectedTradeIds.size === 0) return
    if (selectedTradeIds.size === trade.trades?.length) {
      alert("Cannot move all executions. Use delete instead."); return
    }
    try {
      setSplitting(true)
      const newGroup = await splitTradeGroup(groupId, Array.from(selectedTradeIds))
      setSplitMode(false); setSelectedTradeIds(new Set())
      navigate(`/trades/${newGroup.id}`)
    } catch (err) { alert('Split failed: ' + err.message) }
    finally { setSplitting(false) }
  }

  function cancelSplit() { setSplitMode(false); setSelectedTradeIds(new Set()) }

  function toggleTag(tagId) {
    setEditForm((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId) ? prev.tag_ids.filter((id) => id !== tagId) : [...prev.tag_ids, tagId],
    }))
  }

  if (loading) return <div className="text-dark-muted">Loading trade...</div>
  if (!trade) return <div className="text-dark-muted">Trade not found</div>

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
  const formatCurrency = (v) => v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/trades" className="text-dark-muted hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{trade.ticker}</h1>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              trade.side === 'LONG' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
            }`}>{trade.side}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded ${
              trade.status === 'CLOSED' ? 'bg-dark-border text-dark-muted' : 'bg-blue-600/20 text-blue-400'
            }`}>{trade.status}</span>
          </div>
          <p className="text-dark-muted text-sm mt-1">
            {formatDate(trade.entry_date)} → {formatDate(trade.exit_date)}
          </p>
        </div>
        <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
          <Trash2 size={16} /> Delete
        </button>
      </div>

      {/* Tradezella-style layout: Stats sidebar + Chart main */}
      <div className="flex gap-6 mb-6">
        {/* Stats Sidebar */}
        <div className="w-64 shrink-0">
          <div className="card sticky top-8 space-y-0">
            {/* Net P&L - prominent */}
            <div className="pb-4 border-b border-dark-border">
              <div className="text-xs text-dark-muted uppercase tracking-wide mb-1">Net P&L</div>
              <div className={`text-3xl font-bold ${trade.pnl > 0 ? 'pnl-positive' : trade.pnl < 0 ? 'pnl-negative' : 'text-white'}`}>
                {formatCurrency(trade.pnl)}
              </div>
            </div>

            {/* Stats list */}
            <div className="pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-dark-muted">Side</span>
                <span className={`text-sm font-medium ${trade.side === 'LONG' ? 'text-profit' : 'text-loss'}`}>{trade.side}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-dark-muted">Shares</span>
                <span className="text-sm font-medium text-white">{trade.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-dark-muted">Avg Entry</span>
                <span className="text-sm font-medium text-white">{formatCurrency(trade.entry_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-dark-muted">Avg Exit</span>
                <span className="text-sm font-medium text-white">{formatCurrency(trade.exit_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-dark-muted">P&L %</span>
                <span className={`text-sm font-medium ${trade.pnl_percent > 0 ? 'pnl-positive' : trade.pnl_percent < 0 ? 'pnl-negative' : ''}`}>
                  {trade.pnl_percent != null ? `${trade.pnl_percent.toFixed(2)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-dark-muted">R-Multiple</span>
                <span className="text-sm font-medium text-white">{trade.r_multiple ?? '—'}</span>
              </div>

              {/* Divider */}
              <div className="border-t border-dark-border pt-3">
                <div className="text-xs text-dark-muted uppercase tracking-wide mb-2">Strategy</div>
                <select
                  className="select w-full text-sm"
                  value={editForm.setup_id || ''}
                  onChange={(e) => setEditForm({ ...editForm, setup_id: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">Select Strategy</option>
                  {allSetups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Rating */}
              <div className="border-t border-dark-border pt-3">
                <div className="text-xs text-dark-muted uppercase tracking-wide mb-2">Trade Rating</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setEditForm({ ...editForm, rating: star })} className="transition-colors">
                      <Star size={20} className={star <= editForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-dark-border'} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="border-t border-dark-border pt-3">
                <div className="text-xs text-dark-muted uppercase tracking-wide mb-2">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.length === 0 ? (
                    <Link to="/tags" className="text-xs text-blue-400 hover:underline">Create tags</Link>
                  ) : (
                    allTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                          editForm.tag_ids.includes(tag.id) ? 'border-transparent text-white' : 'border-dark-border text-dark-muted hover:text-white'
                        }`}
                        style={{ backgroundColor: editForm.tag_ids.includes(tag.id) ? tag.color : 'transparent' }}
                      >
                        {tag.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content: Chart */}
        <div className="flex-1 min-w-0">
          <div className="card">
            <TradeChart groupId={groupId} />
          </div>
        </div>
      </div>

      {/* Executions */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Executions</h3>
          {!splitMode ? (
            <button onClick={() => setSplitMode(true)} className="btn-secondary flex items-center gap-2 text-sm"
              disabled={!trade.trades || trade.trades.length < 2}>
              <Scissors size={14} /> Split Trade
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-yellow-400">Select executions to move ({selectedTradeIds.size} selected)</span>
              <button onClick={handleSplit} disabled={splitting || selectedTradeIds.size === 0} className="btn-primary flex items-center gap-2 text-sm">
                <Check size={14} /> {splitting ? 'Splitting...' : 'Create New Trade'}
              </button>
              <button onClick={cancelSplit} className="btn-secondary flex items-center gap-2 text-sm">
                <X size={14} /> Cancel
              </button>
            </div>
          )}
        </div>
        {splitMode && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 text-sm text-yellow-300">
            Check the executions you want to move to a new trade group.
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
              <tr key={t.id}
                className={`border-b border-dark-border/50 transition-colors ${
                  splitMode && selectedTradeIds.has(t.id) ? 'bg-yellow-500/10' : splitMode ? 'hover:bg-dark-border/20 cursor-pointer' : ''
                }`}
                onClick={splitMode ? () => toggleTradeSelection(t.id) : undefined}>
                {splitMode && (
                  <td className="py-2 px-3">
                    <input type="checkbox" checked={selectedTradeIds.has(t.id)} onChange={() => toggleTradeSelection(t.id)} className="w-4 h-4 rounded accent-yellow-500" />
                  </td>
                )}
                <td className="py-2 px-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${t.action === 'BUY' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'}`}>{t.action}</span>
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

      {/* Notes & Mistakes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Notes</h3>
          <textarea className="textarea w-full h-36" placeholder="What was your thesis? Why did you enter this trade?"
            value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
        </div>
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">Mistakes</h3>
          <textarea className="textarea w-full h-36" placeholder="What did you do wrong? What would you do differently?"
            value={editForm.mistakes} onChange={(e) => setEditForm({ ...editForm, mistakes: e.target.value })} />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}