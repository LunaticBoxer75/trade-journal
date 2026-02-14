import { useState } from 'react'
import { Save, Trash2, AlertTriangle, DollarSign } from 'lucide-react'
import { createAccountSnapshot, deleteAllTrades } from '../services/api'

export default function SettingsPage() {
  const [balance, setBalance] = useState('')
  const [balanceDate, setBalanceDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSaveBalance() {
    if (!balance) return
    try {
      setSaving(true)
      await createAccountSnapshot({
        date: balanceDate,
        balance: parseFloat(balance),
        daily_pnl: null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAll() {
    const confirmed = prompt('Type "DELETE ALL" to confirm deleting all trade data:')
    if (confirmed !== 'DELETE ALL') return
    try {
      await deleteAllTrades()
      alert('All trades deleted.')
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      {/* Account Balance */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <DollarSign size={20} className="text-blue-400" />
          <h3 className="text-lg font-semibold">Account Balance</h3>
        </div>
        <p className="text-sm text-dark-muted mb-4">
          Set your account balance to enable equity curve tracking and drawdown calculations.
        </p>
        <div className="flex items-end gap-4">
          <div>
            <label className="text-sm text-dark-muted block mb-1">Date</label>
            <input
              type="date"
              className="input"
              value={balanceDate}
              onChange={(e) => setBalanceDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="text-sm text-dark-muted block mb-1">Balance ($)</label>
            <input
              type="number"
              className="input w-full"
              placeholder="10000.00"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
            />
          </div>
          <button
            onClick={handleSaveBalance}
            disabled={saving || !balance}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Discord Integration (placeholder) */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">🔗 Discord Integration</h3>
        <p className="text-sm text-dark-muted mb-4">
          Connect your Discord server to pull trade ideas from a channel into your journal.
        </p>
        <div className="bg-dark-bg rounded-lg p-4">
          <p className="text-sm text-dark-muted mb-3">Setup instructions:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-dark-muted">
            <li>Go to <a href="https://discord.com/developers/applications" target="_blank" rel="noopener" className="text-blue-400 hover:underline">Discord Developer Portal</a></li>
            <li>Create an Application → Add a Bot</li>
            <li>Copy the bot token and paste it below</li>
            <li>Invite the bot to your server with message read permissions</li>
          </ol>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm text-dark-muted block mb-1">Bot Token</label>
              <input className="input w-full" type="password" placeholder="Your Discord bot token" disabled />
            </div>
            <div>
              <label className="text-sm text-dark-muted block mb-1">Channel ID</label>
              <input className="input w-full" placeholder="Channel ID to pull messages from" disabled />
            </div>
            <p className="text-xs text-yellow-400">⚠️ Discord integration coming soon — requires bot token setup</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-loss/30">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} className="text-loss" />
          <h3 className="text-lg font-semibold text-loss">Danger Zone</h3>
        </div>
        <p className="text-sm text-dark-muted mb-4">
          These actions are irreversible. Proceed with caution.
        </p>
        <button
          onClick={handleDeleteAll}
          className="btn-danger flex items-center gap-2"
        >
          <Trash2 size={16} />
          Delete All Trades
        </button>
      </div>
    </div>
  )
}