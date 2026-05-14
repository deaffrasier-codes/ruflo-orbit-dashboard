'use client'

import { Flame, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StageBadge } from '@/components/stage-badge'
import type { Song, PipelineStage } from '@/types/database'
import { SAGAS, STAGES } from '@/lib/constants'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

function totalViews(song: Song) {
  return song.views_youtube + song.views_tiktok + song.views_instagram
}

function sagaLabel(saga: Song['saga']) {
  return SAGAS.find(s => s.id === saga)?.label ?? '—'
}

interface Props {
  song: Song
  onUpdate: () => void
  onClick: (song: Song) => void
}

export function SongCard({ song, onUpdate, onClick }: Props) {
  async function changeStage(newStage: PipelineStage) {
    const { error } = await supabase.from('songs').update({ status: newStage }).eq('id', song.id)
    if (error) { toast.error('Failed to update stage'); return }
    toast.success(`"${song.name}" moved to ${STAGES.find(s => s.id === newStage)?.label}`)
    onUpdate()
  }

  return (
    <Card
      className="p-3 cursor-pointer hover:border-primary/50 transition-colors border-border bg-card group"
      onClick={() => onClick(song)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight line-clamp-2 flex-1">{song.name}</p>
        {song.viral_alert && <Flame size={14} className="text-pink-400 shrink-0 mt-0.5" />}
      </div>

      <p className="text-xs text-muted-foreground mt-1">{sagaLabel(song.saga)}</p>

      {totalViews(song) > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {totalViews(song).toLocaleString()} views
        </p>
      )}

      {song.google_drive_folder_url && (
        <a
          href={song.google_drive_folder_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 mt-1"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={10} /> Drive
        </a>
      )}

      <div className="mt-2" onClick={e => e.stopPropagation()}>
        <Select value={song.status} onValueChange={v => { if (v) changeStage(v as PipelineStage) }}>
          <SelectTrigger className="h-6 text-xs px-2 bg-muted border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGES.map(s => (
              <SelectItem key={s.id} value={s.id} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  )
}
