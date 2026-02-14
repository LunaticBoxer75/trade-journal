import { useState, useEffect } from 'react'
import { Plus, Edit3, Trash2, Save, X } from 'lucide-react'
import { getSetups, createSetup, updateSetup, deleteSetup } from '../services/api'

export default function Playbook() {
  const [setups, setSetups] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', rules: '' })

  useEffect(() => { loadSetups() }, [])

  async function loadSetups() {
    try {
      const data = await getSetups()
      setSetups(data)
    } catch (err) {
      console.error('Failed to load setups:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!form.name.trim()) return
    try {
      await createSetup(form)
      setForm({ name: '', description: '', rules: '' })
      setShowNew(false)
      await loadSetups()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleUpdate(id) {
    try {
      await updateSetup(id, form)
      setEditing(null)
      await loadSetups()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this setup?')) return
    try {
      await deleteSetup(id)
      await loadSetups()
    } catch (err) {
      alert(err.message)
    }
  }

  function startEdit(setup) {
    setEditing(setup.id)
    setForm({ name: setup.name, description: setup.description || '', rules: setup.rules || '' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Playbook / Setups</h1>
        <button onClick={() => { setShowNew(true); setForm({ name: '', description: '', rules: '' }) }} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Setup
        </button>
      </div>

      <p className="text-dark-muted mb-6">
        Define your trading strategies here. Link them to trades to track which setups perform best.
      </p>

      {/* New Setup Form */}
      {showNew && (
        <div className="card mb-6 border-blue-500/30">
          <h3 className="text-lg font-semibold mb-4">New Setup</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-dark-muted block mb-1">Name *</label>
              <input className="input w-full" placeholder="e.g., Gap and Go" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-dark-muted block mb-1">Description</label>
              <textarea className="textarea w-full h-24" placeholder="Describe the setup..."
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-dark-muted block mb-1">Entry / Exit Rules</label>
              <textarea className="textarea w-full h-32" placeholder="Entry rules:&#10;- ...&#10;&#10;Exit rules:&#10;- ..."
                value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
                <Save size={16} /> Save
              </button>
              <button onClick={() => setShowNew(false)} className="btn-secondary flex items-center gap-2">
                <X size={16} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setups List */}
      {loading ? (
        <div className="text-dark-muted">Loading...</div>
      ) : setups.length === 0 && !showNew ? (
        <div className="card text-center py-12">
          <p className="text-dark-muted mb-4">No setups defined yet</p>
          <button onClick={() => setShowNew(true)} className="btn-primary">Create Your First Setup</button>
        </div>
      ) : (
        <div className="space-y-4">
          {setups.map((setup) => (
            <div key={setup.id} className="card">
              {editing === setup.id ? (
                <div className="space-y-4">
                  <input className="input w-full text-lg font-semibold" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <textarea className="textarea w-full h-24" value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <textarea className="textarea w-full h-32" value={form.rules}
                    onChange={(e) => setForm({ ...form, rules: e.target.value })} />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(setup.id)} className="btn-primary flex items-center gap-2">
                      <Save size={16} /> Save
                    </button>
                    <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold">{setup.name}</h3>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(setup)} className="text-dark-muted hover:text-blue-400 transition-colors">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(setup.id)} className="text-dark-muted hover:text-loss transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {setup.description && <p className="text-dark-muted text-sm mt-2">{setup.description}</p>}
                  {setup.rules && (
                    <div className="mt-3 bg-dark-bg rounded-lg p-4">
                      <p className="text-xs text-dark-muted mb-1 uppercase font-medium">Rules</p>
                      <pre className="text-sm whitespace-pre-wrap text-dark-text">{setup.rules}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}