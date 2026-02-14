import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { importTrades } from '../services/api'

export default function ImportPage() {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  async function handleImport() {
    if (!file) return
    try {
      setImporting(true)
      setError(null)
      setResult(null)
      const data = await importTrades(file)
      setResult(data)
      setFile(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.csv')) {
      setFile(dropped)
    } else {
      setError('Please drop a CSV file')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Import Trades</h1>

      {/* Instructions */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-3">How to Export from Robinhood</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-dark-muted">
          <li>Open the Robinhood app or website</li>
          <li>Go to <strong className="text-dark-text">Account → Statements & History</strong></li>
          <li>Click <strong className="text-dark-text">Download</strong> or <strong className="text-dark-text">Export</strong> to get a CSV file</li>
          <li>Upload the CSV file below</li>
        </ol>
        <p className="text-xs text-dark-muted mt-3">
          The CSV should contain columns like: Activity Date, Instrument, Trans Code, Quantity, Price, Amount
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`card border-2 border-dashed transition-colors cursor-pointer ${
          dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-dark-border hover:border-dark-muted'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <div className="text-center py-12">
          <Upload size={48} className="mx-auto text-dark-muted mb-4" />
          {file ? (
            <div>
              <div className="flex items-center justify-center gap-2 text-blue-400 mb-2">
                <FileText size={18} />
                <span className="font-medium">{file.name}</span>
              </div>
              <p className="text-sm text-dark-muted">
                {(file.size / 1024).toFixed(1)} KB — Click or drop to change
              </p>
            </div>
          ) : (
            <div>
              <p className="text-dark-text font-medium mb-1">Drag & drop your CSV here</p>
              <p className="text-sm text-dark-muted">or click to browse</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleImport}
          disabled={!file || importing}
          className={`btn-primary px-8 py-3 text-lg ${(!file || importing) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {importing ? 'Importing...' : 'Import Trades'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="card mt-6 border-profit/30">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle size={24} className="text-profit" />
            <h3 className="text-lg font-semibold text-profit">Import Successful!</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="stat-label">Trades Imported</span>
              <div className="text-xl font-bold">{result.trades_imported}</div>
            </div>
            <div>
              <span className="stat-label">Groups Created</span>
              <div className="text-xl font-bold">{result.groups_created}</div>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-yellow-400 mb-1">⚠️ {result.errors.length} rows skipped:</p>
              <ul className="text-xs text-dark-muted space-y-1">
                {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                {result.errors.length > 5 && <li>...and {result.errors.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card mt-6 border-loss/30">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-loss" />
            <div>
              <h3 className="font-semibold text-loss">Import Failed</h3>
              <p className="text-sm text-dark-muted">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}