import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react'
import { getDailyPnl, getTradeGroups } from '../services/api'

export default function CalendarView() {
  const [dailyPnl, setDailyPnl] = useState({})
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null) // "YYYY-MM-DD" or null
  const [dayTrades, setDayTrades] = useState([])
  const [loadingTrades, setLoadingTrades] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getDailyPnl()
        const map = {}
        data.forEach((d) => { map[d.date] = d })
        setDailyPnl(map)
      } catch (err) {
        console.error('Failed to load calendar data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Load trades when a day is selected
  useEffect(() => {
    if (!selectedDay) {
      setDayTrades([])
      return
    }
    async function loadDayTrades() {
      try {
        setLoadingTrades(true)
        // Get all closed trades and filter by exit_date matching selectedDay
        const all = await getTradeGroups({ status: 'CLOSED', limit: 500 })
        const filtered = all.filter((t) => {
          if (!t.exit_date) return false
          return t.exit_date.startsWith(selectedDay)
        })
        setDayTrades(filtered)
      } catch (err) {
        console.error('Failed to load day trades:', err)
      } finally {
        setLoadingTrades(false)
      }
    }
    loadDayTrades()
  }, [selectedDay])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const totalDays = lastDay.getDate()

  const days = []
  for (let i = 0; i < startPad; i++) days.push(null)
  for (let i = 1; i <= totalDays; i++) days.push(i)

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }

  function getDayKey(day) {
    if (!day) return null
    const m = String(month + 1).padStart(2, '0')
    const d = String(day).padStart(2, '0')
    return `${year}-${m}-${d}`
  }

  function getDayColor(day) {
    const key = getDayKey(day)
    if (!key || !dailyPnl[key]) return ''
    const pnl = dailyPnl[key].pnl
    if (pnl > 0) return 'bg-profit/20 border-profit/40'
    if (pnl < 0) return 'bg-loss/20 border-loss/40'
    return 'bg-dark-border/30'
  }

  function handleDayClick(day) {
    if (!day) return
    const key = getDayKey(day)
    if (selectedDay === key) {
      setSelectedDay(null) // toggle off
    } else {
      setSelectedDay(key)
    }
  }

  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  // Monthly totals
  let monthPnl = 0
  let monthTrades = 0
  let monthWins = 0
  let monthLosses = 0
  for (let i = 1; i <= totalDays; i++) {
    const key = getDayKey(i)
    if (key && dailyPnl[key]) {
      monthPnl += dailyPnl[key].pnl
      monthTrades += dailyPnl[key].trades
      monthWins += dailyPnl[key].wins
      monthLosses += dailyPnl[key].losses
    }
  }

  const formatCurrency = (v) => v != null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

  const selectedDayDisplay = selectedDay
    ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Calendar</h1>

      {/* Month Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <span className="stat-label">Month P&L</span>
          <div className={`text-xl font-bold ${monthPnl > 0 ? 'pnl-positive' : monthPnl < 0 ? 'pnl-negative' : ''}`}>
            ${monthPnl.toFixed(2)}
          </div>
        </div>
        <div className="card text-center">
          <span className="stat-label">Trades</span>
          <div className="text-xl font-bold">{monthTrades}</div>
        </div>
        <div className="card text-center">
          <span className="stat-label">Green Days</span>
          <div className="text-xl font-bold text-profit">{monthWins}</div>
        </div>
        <div className="card text-center">
          <span className="stat-label">Red Days</span>
          <div className="text-xl font-bold text-loss">{monthLosses}</div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Calendar */}
        <div className={`card ${selectedDay ? 'flex-1' : 'w-full'} transition-all`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="btn-secondary p-2">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-semibold">{monthName}</h2>
            <button onClick={nextMonth} className="btn-secondary p-2">
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs font-medium text-dark-muted py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              const key = getDayKey(day)
              const data = key ? dailyPnl[key] : null
              const isSelected = key && selectedDay === key
              const hasTrades = data && data.trades > 0
              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[80px] rounded-lg border p-2 transition-all ${
                    day ? 'cursor-pointer hover:border-blue-500/50' : ''
                  } ${
                    isSelected
                      ? 'border-blue-500 ring-1 ring-blue-500/50 bg-blue-500/10'
                      : day ? getDayColor(day) || 'border-dark-border/30' : 'border-transparent'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-xs mb-1 ${isSelected ? 'text-blue-400 font-medium' : 'text-dark-muted'}`}>{day}</div>
                      {data && (
                        <div className="space-y-0.5">
                          <div className={`text-sm font-bold ${data.pnl > 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                            ${data.pnl.toFixed(0)}
                          </div>
                          <div className="text-xs text-dark-muted">{data.trades} trades</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Day Detail Panel */}
        {selectedDay && (
          <div className="w-96 shrink-0">
            <div className="card sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Day Trades</h3>
                <button onClick={() => setSelectedDay(null)} className="text-dark-muted hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <p className="text-sm text-dark-muted mb-4">{selectedDayDisplay}</p>

              {/* Day Summary */}
              {dailyPnl[selectedDay] && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-dark-bg rounded-lg p-2 text-center">
                    <div className="text-xs text-dark-muted">P&L</div>
                    <div className={`text-sm font-bold ${dailyPnl[selectedDay].pnl > 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                      {formatCurrency(dailyPnl[selectedDay].pnl)}
                    </div>
                  </div>
                  <div className="bg-dark-bg rounded-lg p-2 text-center">
                    <div className="text-xs text-dark-muted">Wins</div>
                    <div className="text-sm font-bold text-profit">{dailyPnl[selectedDay].wins}</div>
                  </div>
                  <div className="bg-dark-bg rounded-lg p-2 text-center">
                    <div className="text-xs text-dark-muted">Losses</div>
                    <div className="text-sm font-bold text-loss">{dailyPnl[selectedDay].losses}</div>
                  </div>
                </div>
              )}

              {/* Trade List */}
              {loadingTrades ? (
                <div className="text-dark-muted text-sm text-center py-8">Loading trades...</div>
              ) : dayTrades.length === 0 ? (
                <div className="text-dark-muted text-sm text-center py-8">No closed trades on this day</div>
              ) : (
                <div className="space-y-2">
                  {dayTrades.map((trade) => (
                    <Link
                      key={trade.id}
                      to={`/trades/${trade.id}`}
                      className="block bg-dark-bg rounded-lg p-3 hover:bg-dark-border/30 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{trade.ticker}</span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            trade.side === 'LONG' ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                          }`}>
                            {trade.side}
                          </span>
                        </div>
                        <ExternalLink size={14} className="text-dark-muted group-hover:text-blue-400 transition-colors" />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-dark-muted">{trade.quantity} shares</span>
                        <span className={`font-medium ${trade.pnl > 0 ? 'pnl-positive' : trade.pnl < 0 ? 'pnl-negative' : ''}`}>
                          {formatCurrency(trade.pnl)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-dark-muted mt-1">
                        <span>{formatCurrency(trade.entry_price)} → {formatCurrency(trade.exit_price)}</span>
                        <span className={trade.pnl_percent > 0 ? 'pnl-positive' : trade.pnl_percent < 0 ? 'pnl-negative' : ''}>
                          {trade.pnl_percent != null ? `${trade.pnl_percent.toFixed(2)}%` : ''}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}