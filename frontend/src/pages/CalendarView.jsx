import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getDailyPnl } from '../services/api'

export default function CalendarView() {
  const [dailyPnl, setDailyPnl] = useState({})
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)

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
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1))
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

      {/* Calendar */}
      <div className="card">
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
            return (
              <div
                key={idx}
                className={`min-h-[80px] rounded-lg border p-2 ${
                  day ? getDayColor(day) || 'border-dark-border/30' : 'border-transparent'
                }`}
              >
                {day && (
                  <>
                    <div className="text-xs text-dark-muted mb-1">{day}</div>
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
    </div>
  )
}