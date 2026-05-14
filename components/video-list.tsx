'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

interface Video {
  id: string
  platform: string
  video_id: string
  video_type: string
  views: number
  likes: number
}

interface Props { songId: string }

const PLATFORMS = ['youtube', 'instagram', 'tiktok', 'facebook', 'spotify']
const VIDEO_TYPES = ['longform', 'short', 'reel', 'tiktok', 'post']

export function VideoList({ songId }: Props) {
  const [videos, setVideos] = useState<Video[]>([])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ platform: '', video_id: '', video_type: '', title: '' })

  async function load() {
    const { data } = await supabase.from('videos').select('*').eq('song_id', songId).order('created_at')
    if (data) setVideos(data as Video[])
  }

  useEffect(() => { load() }, [songId])

  async function addVideo() {
    if (!form.platform || !form.video_id || !form.video_type) { toast.error('Platform, ID, and type required'); return }
    const { error } = await supabase.from('videos').insert({ song_id: songId, ...form, title: form.title || null })
    if (error) { toast.error('Failed to add video'); return }
    toast.success('Video added')
    setForm({ platform: '', video_id: '', video_type: '', title: '' })
    setAdding(false)
    load()
  }

  async function deleteVideo(id: string) {
    await supabase.from('videos').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Videos / Posts</h3>
        <Button size="sm" variant="outline" onClick={() => setAdding(a => !a)} className="text-xs h-6 px-2">
          {adding ? 'Cancel' : '+ Add'}
        </Button>
      </div>

      {adding && (
        <div className="bg-muted rounded-md p-3 space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v ?? '' }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
              <SelectContent>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.video_type} onValueChange={v => setForm(f => ({ ...f, video_type: v ?? '' }))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>{VIDEO_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input value={form.video_id} onChange={e => setForm(f => ({ ...f, video_id: e.target.value }))} placeholder="Video / Post ID" className="h-7 text-xs font-mono" />
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (optional)" className="h-7 text-xs" />
          <Button size="sm" onClick={addVideo} className="w-full h-7 text-xs">Add Video</Button>
        </div>
      )}

      {videos.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">No videos added yet.</p>
      )}

      <div className="space-y-1">
        {videos.map(v => (
          <div key={v.id} className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1.5">
            <span className="capitalize text-muted-foreground w-16 shrink-0">{v.platform}</span>
            <span className="capitalize text-muted-foreground w-14 shrink-0">{v.video_type}</span>
            <span className="font-mono flex-1 truncate">{v.video_id}</span>
            <span className="text-muted-foreground shrink-0">{v.views.toLocaleString()} views</span>
            <button onClick={() => deleteVideo(v.id)} className="text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
