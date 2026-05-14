'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { ExternalLink, RefreshCw } from 'lucide-react'
import type { Song } from '@/types/database'

interface YTVideo {
  id: string
  title: string
  publishedAt: string
  thumbnail: string
  linked: boolean
}

interface Props {
  open: boolean
  onClose: () => void
}

const VIDEO_TYPES = ['longform', 'short', 'reel', 'tiktok', 'post']

export function ScanMatchModal({ open, onClose }: Props) {
  const [videos, setVideos] = useState<YTVideo[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, { songId: string; videoType: string }>>({})
  const [showLinked, setShowLinked] = useState(false)

  async function fetchVideos() {
    setLoading(true)
    try {
      const res = await fetch('/api/youtube/sync')
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setVideos(data.videos)
    } catch {
      toast.error('Failed to fetch YouTube videos')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSongs() {
    const { data } = await supabase.from('songs').select('id, name, status').order('name') as { data: Song[] | null }
    if (data) setSongs(data)
  }

  useEffect(() => {
    if (open) { fetchVideos(); fetchSongs() }
  }, [open])

  async function linkVideo(videoId: string) {
    const sel = selected[videoId]
    if (!sel?.songId || !sel?.videoType) { toast.error('Pick a song and type first'); return }
    setLinking(videoId)
    const { error } = await supabase.from('videos').insert({
      song_id: sel.songId,
      platform: 'youtube',
      video_id: videoId,
      video_type: sel.videoType,
      title: videos.find(v => v.id === videoId)?.title ?? null,
    })
    setLinking(null)
    if (error) { toast.error('Link failed: ' + error.message); return }
    toast.success('Linked!')
    setVideos(vs => vs.map(v => v.id === videoId ? { ...v, linked: true } : v))
  }

  const displayed = showLinked ? videos : videos.filter(v => !v.linked)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Scan & Match — YouTube Channel</DialogTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLinked(s => !s)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {showLinked ? 'Hide linked' : 'Show all'}
              </button>
              <Button size="sm" variant="outline" onClick={fetchVideos} disabled={loading} className="h-7 text-xs gap-1">
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Fetching your channel videos...</p>
        )}

        {!loading && displayed.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {videos.length === 0 ? 'No videos found. Check YOUTUBE_API_KEY.' : 'All videos are linked!'}
          </p>
        )}

        <div className="space-y-2">
          {displayed.map(video => (
            <div key={video.id} className={`flex items-center gap-3 rounded-md p-2 ${video.linked ? 'opacity-40' : 'bg-muted'}`}>
              {video.thumbnail && (
                <img src={video.thumbnail} alt="" className="w-16 h-12 object-cover rounded shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{video.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs text-muted-foreground font-mono">{video.id}</span>
                  <a
                    href={`https://youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-secondary"
                  >
                    <ExternalLink size={10} />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(video.publishedAt).toLocaleDateString()}</p>
              </div>

              {video.linked ? (
                <span className="text-xs text-green-500 shrink-0">Linked</span>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={selected[video.id]?.songId ?? ''}
                    onValueChange={v => { if (v) setSelected(s => ({ ...s, [video.id]: { songId: v, videoType: s[video.id]?.videoType ?? '' } })) }}
                  >
                    <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Song" /></SelectTrigger>
                    <SelectContent>
                      {songs.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selected[video.id]?.videoType ?? ''}
                    onValueChange={v => { if (v) setSelected(s => ({ ...s, [video.id]: { songId: s[video.id]?.songId ?? '', videoType: v } })) }}
                  >
                    <SelectTrigger className="h-7 text-xs w-24"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      {VIDEO_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-7 text-xs px-3"
                    onClick={() => linkVideo(video.id)}
                    disabled={linking === video.id || !selected[video.id]?.songId || !selected[video.id]?.videoType}
                  >
                    {linking === video.id ? '...' : 'Link'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
