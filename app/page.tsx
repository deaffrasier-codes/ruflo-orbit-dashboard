'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SongCard } from '@/components/song-card'
import { NewSongForm } from '@/components/new-song-form'
import { SongDetail } from '@/components/song-detail'
import { supabase } from '@/lib/supabase'
import { STAGES } from '@/lib/constants'
import type { Song } from '@/types/database'

export default function PipelinePage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [showNew, setShowNew] = useState(false)
  const [selected, setSelected] = useState<Song | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('songs').select('*').order('created_at', { ascending: false })
    if (data) setSongs(data as Song[])
  }, [])

  useEffect(() => { load() }, [load])

  const viralSongs = songs.filter(s => s.viral_alert)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Pipeline</h2>
          <p className="text-sm text-muted-foreground">{songs.length} songs tracked</p>
        </div>
        <Button onClick={() => setShowNew(true)} size="sm" className="gap-2">
          <Plus size={14} /> New Song
        </Button>
      </div>

      {viralSongs.length > 0 && (
        <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-3 flex items-center gap-3">
          <Flame size={16} className="text-amber-400 shrink-0" />
          <p className="text-sm font-medium text-amber-200">
            {viralSongs.map(s => s.name).join(', ')} {viralSongs.length === 1 ? 'is' : 'are'} outperforming your 30-day average
          </p>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageSongs = songs.filter(s => s.status === stage.id)
          return (
            <div key={stage.id} className="w-48 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${stage.color.split(' ')[0]}`} />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">{stage.label}</p>
                <span className="text-xs text-muted-foreground ml-auto">{stageSongs.length}</span>
              </div>
              <div className="space-y-2">
                {stageSongs.map(song => (
                  <SongCard key={song.id} song={song} onUpdate={load} onClick={setSelected} />
                ))}
                {stageSongs.length === 0 && (
                  <div className="border border-dashed border-border rounded-md p-3 text-xs text-muted-foreground text-center">
                    empty
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <NewSongForm open={showNew} onClose={() => setShowNew(false)} onCreated={load} />
      {selected && (
        <SongDetail
          song={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => { load(); setSelected(null) }}
        />
      )}
    </div>
  )
}
