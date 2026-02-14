import { useState, useEffect } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { getTags, createTag, updateTag, deleteTag } from '../services/api'

const PRESET_COLORS = ['#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1']

export default function TagsPage() {
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6' })

  useEffect(() => { loadTags() }, [])

  async function loadTags() {
    try {
      setTags(await getTags())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newTag.name.trim()) return
    try {
      await createTag(newTag)
      setNewTag({ name: '', color: '#3B82F6' })
      await loadTags()
    } catch (err) { alert(err.message) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this tag?')) return
    try {
      await deleteTag(id)
      await loadTags()
    } catch (err) { alert(err.message) }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Tags</h1>
      <p className="text-dark-muted mb-6">Create tags to categorize your trades (e.g., Momentum, Breakout, Earnings, FOMO).</p>

      {/* New Tag */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Create Tag</h3>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-sm text-dark-muted block mb-1">Tag Name</label>
            <input className="input w-full" placeholder="e.g., Breakout" value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-dark-muted block mb-1">Color</label>
            <div className="flex gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setNewTag({ ...newTag, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${newTag.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <button onClick={handleCreate} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Tags List */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Your Tags ({tags.length})</h3>
        {loading ? (
          <div className="text-dark-muted">Loading...</div>
        ) : tags.length === 0 ? (
          <div className="text-dark-muted text-center py-8">No tags yet</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2 bg-dark-bg rounded-full px-4 py-2 border border-dark-border">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="text-sm font-medium">{tag.name}</span>
                <button onClick={() => handleDelete(tag.id)} className="text-dark-muted hover:text-loss ml-1 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}