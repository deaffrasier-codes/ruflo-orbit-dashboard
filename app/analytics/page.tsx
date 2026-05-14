'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScanMatchModal } from '@/components/scan-match-modal'
import type { Song } from '@/types/database'

export default function AnalyticsPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [scanOpen, setScanOpen] = useState(false)

  useEffect(() => {
    supabase.from('songs').select('*').eq('status', 'published').order('views_youtube', { ascending: false })
      .then(({ data }) => { if (data) setSongs(data as Song[]) })
  }, [])

  const totalYT = songs.reduce((a, s) => a + s.views_youtube, 0)
  const totalTT = songs.reduce((a, s) => a + s.views_tiktok, 0)
  const totalIG = songs.reduce((a, s) => a + s.views_instagram, 0)
  const totalSpotify = songs.reduce((a, s) => a + s.streams_spotify, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Analytics</h2>
        <Button size="sm" variant="outline" onClick={() => setScanOpen(true)} className="gap-2 text-xs">
          Scan & Match YouTube
        </Button>
      </div>
      <ScanMatchModal open={scanOpen} onClose={() => setScanOpen(false)} />

      {/* Platform totals */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'YouTube Views', value: totalYT, color: 'text-red-400' },
          { label: 'TikTok Views', value: totalTT, color: 'text-pink-400' },
          { label: 'Instagram Views', value: totalIG, color: 'text-purple-400' },
          { label: 'Spotify Streams', value: totalSpotify, color: 'text-green-400' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="p-4 bg-card border-border">
            <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Analytics auto-refresh hourly via cron. Last updated: when cron runs.{' '}
        <span className="text-secondary">Social API setup required — see README.</span>
      </p>

      {/* Per-song table */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Published Songs</h3>
        <div className="space-y-2">
          {songs.length === 0 && (
            <p className="text-sm text-muted-foreground">No published songs yet.</p>
          )}
          {songs.map(song => (
            <Card key={song.id} className="p-4 bg-card border-border flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{song.name}</p>
                  {song.viral_alert && <span className="text-amber-400 text-xs">🔥</span>}
                </div>
                <p className="text-xs text-muted-foreground">{song.saga?.replace('_', ' ') ?? 'standalone'} · {song.shipped_date ?? 'date unknown'}</p>
              </div>
              <div className="flex gap-6 text-right text-xs shrink-0">
                <div>
                  <p className="font-semibold text-red-400">{song.views_youtube.toLocaleString()}</p>
                  <p className="text-muted-foreground">YouTube</p>
                </div>
                <div>
                  <p className="font-semibold text-pink-400">{song.views_tiktok.toLocaleString()}</p>
                  <p className="text-muted-foreground">TikTok</p>
                </div>
                <div>
                  <p className="font-semibold text-purple-400">{song.views_instagram.toLocaleString()}</p>
                  <p className="text-muted-foreground">Instagram</p>
                </div>
                <div>
                  <p className="font-semibold text-green-400">{song.streams_spotify.toLocaleString()}</p>
                  <p className="text-muted-foreground">Spotify</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
