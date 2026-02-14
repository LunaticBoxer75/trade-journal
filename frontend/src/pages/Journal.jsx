import { useState, useEffect } from 'react'
import { Save, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { getJournalEntries, updateJournalEntry } from '../services/api'

const MOODS = ['😤 Frustrated', '😰 Anxious', '😐 Neutral', '😊 Confident', '🔥 In the Zone']

export default function Journal() {
  const [entries, setEntries] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [form, setForm] = useState({
    pre_market_notes: '',
    post_market_notes: '',
    mood: '',
    market_conditions: '',
    lessons_learned: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEntries()
  }, [])

  useEffect(() => {
    loadEntry(selectedDate)
  }, [selectedDate])

  async function loadEntries() {
    try {
      const data = await getJournalEntries({ limit: 60 })
      setEntries(data)
    } catch (err) {
      console.error('Failed to load journal:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadEntry(date) {
    const existing = entries.find((e) => e.date === date)
    if (existing) {
      setForm({
        pre_market_notes: existing.pre_market_notes || '',
        post_market_notes: existing.post_market_notes || '',
        mood: existing.mood || '',
        market_conditions: existing.market_conditions || '',
        lessons_learned: existing.lessons_learned || '',
      })
    } else {
      setForm({
        pre_market_notes: '',
        post_market_notes: '',
        mood: '',
        market_conditions: '',
        lessons_learned: '',
      })
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      await updateJournalEntry(selectedDate, form)
      await loadEntries()
    } catch (err) {
      console.error('Failed to save journal:', err)
    } finally {
      setSaving(false)
    }
  }

  function prevDay() {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  function nextDay() {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const dateDisplay = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Daily Journal</h1>

      {/* Date Selector */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <button onClick={prevDay} className="btn-secondary p-2">
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold">{dateDisplay}</h2>
            <input
              type="date"
              className="input text-sm mt-1"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <button onClick={nextDay} className="btn-secondary p-2">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pre-Market Notes */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">📋 Pre-Market Plan</h3>
          <p className="text-xs text-dark-muted mb-2">What's your plan for today? Key levels, watchlist, strategy.</p>
          <textarea
            className="textarea w-full h-40"
            placeholder="My plan for today..."
            value={form.pre_market_notes}
            onChange={(e) => setForm({ ...form, pre_market_notes: e.target.value })}
          />
        </div>

        {/* Post-Market Review */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">📝 Post-Market Review</h3>
          <p className="text-xs text-dark-muted mb-2">How did the day go? Did you follow your plan?</p>
          <textarea
            className="textarea w-full h-40"
            placeholder="How the day went..."
            value={form.post_market_notes}
            onChange={(e) => setForm({ ...form, post_market_notes: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Mood */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">🧠 Mood</h3>
          <div className="space-y-2">
            {MOODS.map((mood) => (
              <button
                key={mood}
                onClick={() => setForm({ ...form, mood: mood })}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  form.mood === mood
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'bg-dark-bg hover:bg-dark-border/30 text-dark-muted'
                }`}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        {/* Market Conditions */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">📊 Market Conditions</h3>
          <textarea
            className="textarea w-full h-40"
            placeholder="How was the overall market? SPY, QQQ trends..."
            value={form.market_conditions}
            onChange={(e) => setForm({ ...form, market_conditions: e.target.value })}
          />
        </div>

        {/* Lessons Learned */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-3">💡 Lessons Learned</h3>
          <textarea
            className="textarea w-full h-40"
            placeholder="What did you learn today?"
            value={form.lessons_learned}
            onChange={(e) => setForm({ ...form, lessons_learned: e.target.value })}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Journal Entry'}
        </button>
      </div>

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div className="card mt-8">
          <h3 className="text-lg font-semibold mb-4">Recent Entries</h3>
          <div className="space-y-2">
            {entries.slice(0, 10).map((entry) => (
              <button
                key={entry.date}
                onClick={() => setSelectedDate(entry.date)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedDate === entry.date
                    ? 'bg-blue-600/20 border border-blue-500/30'
                    : 'bg-dark-bg hover:bg-dark-border/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-xs text-dark-muted">{entry.mood || '—'}</span>
                </div>
                {entry.pre_market_notes && (
                  <p className="text-xs text-dark-muted mt-1 truncate">{entry.pre_market_notes}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}