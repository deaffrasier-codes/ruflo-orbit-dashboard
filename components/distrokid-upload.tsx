'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'

interface Props { onImported: () => void }

export function DistrokidUpload({ onImported }: Props) {
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) { toast.error('CSV files only'); return }
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/import/distrokid', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Import failed'); return }
      toast.success(`Imported ${data.total} rows — ${data.matched} matched to songs`)
      onImported()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="gap-2 text-xs"
      >
        <Upload size={12} />
        {loading ? 'Importing...' : 'Import DistroKid CSV'}
      </Button>
      <p className="text-xs text-muted-foreground mt-1">
        DistroKid → Bank → Download Earnings → Upload here
      </p>
    </div>
  )
}
