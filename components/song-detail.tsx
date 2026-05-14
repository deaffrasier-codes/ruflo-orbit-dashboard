'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StageBadge } from '@/components/stage-badge'
import { supabase } from '@/lib/supabase'
import { STAGES, SAGAS } from '@/lib/constants'
import { toast } from 'sonner'
import { ExternalLink, Trash2 } from 'lucide-react'
import type { Song, PipelineStage, Saga } from '@/types/database'

interface Props {
  song: Song
  onClose: () => void
  onUpdate: () => void
}

export function SongDetail({ song, onClose, onUpdate }: Props) {
  const [form, setForm] = useState({ ...song })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function set<K extends keyof Song>(key: K, value: Song[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('songs').update({
      name: form.name,
      status: form.status,
      saga: form.saga,
      premise: form.premise,
      character: form.character,
      tone: form.tone,
      content_type: form.content_type,
      genre: form.genre,
      bpm: form.bpm,
      musical_key: form.musical_key,
      chord_plan: form.chord_plan,
      raw_lyrics: form.raw_lyrics,
      youtube_video_id: form.youtube_video_id,
      tiktok_video_id: form.tiktok_video_id,
      instagram_media_id: form.instagram_media_id,
      spotify_track_id: form.spotify_track_id,
      google_drive_folder_url: form.google_drive_folder_url,
      notes: form.notes,
    }).eq('id', song.id)
    setSaving(false)
    if (error) { toast.error('Save failed'); return }
    toast.success('Saved')
    onUpdate()
  }

  async function deleteSong() {
    if (!confirm(`Delete "${song.name}"? This cannot be undone.`)) return
    setDeleting(true)
    await supabase.from('songs').delete().eq('id', song.id)
    setDeleting(false)
    toast.success('Song deleted')
    onUpdate()
  }

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="flex-1">{song.name}</DialogTitle>
            <StageBadge stage={song.status} />
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Identity */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identity</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Song Name</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Stage</Label>
                <Select value={form.status} onValueChange={v => { if (v) set('status', v as PipelineStage) }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Saga</Label>
                <Select value={form.saga ?? ''} onValueChange={v => { if (v) set('saga', v as Saga) }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pick saga" /></SelectTrigger>
                  <SelectContent>
                    {SAGAS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.content_type ?? ''} onValueChange={v => { if (v) set('content_type', v as Song['content_type']) }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pick type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parody">Parody</SelectItem>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="meme-remix">Meme Remix</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Concept */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Concept</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Character / POV</Label>
                <Input value={form.character ?? ''} onChange={e => set('character', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Tone</Label>
                <Input value={form.tone ?? ''} onChange={e => set('tone', e.target.value)} className="mt-1" placeholder="cursed, wholesome, horror..." />
              </div>
            </div>
            <div>
              <Label>Premise</Label>
              <Textarea value={form.premise ?? ''} onChange={e => set('premise', e.target.value)} rows={2} className="mt-1" />
            </div>
            <div>
              <Label>Raw Lyrics</Label>
              <Textarea value={form.raw_lyrics ?? ''} onChange={e => set('raw_lyrics', e.target.value)} rows={4} className="mt-1 font-mono text-xs" />
            </div>
          </section>

          {/* Structure */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Song Structure</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Genre</Label>
                <Input value={form.genre ?? ''} onChange={e => set('genre', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>BPM</Label>
                <Input type="number" value={form.bpm ?? ''} onChange={e => set('bpm', Number(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label>Key</Label>
                <Input value={form.musical_key ?? ''} onChange={e => set('musical_key', e.target.value)} className="mt-1" placeholder="D minor" />
              </div>
            </div>
            <div>
              <Label>Chord Plan</Label>
              <Textarea value={form.chord_plan ?? ''} onChange={e => set('chord_plan', e.target.value)} rows={2} className="mt-1 font-mono text-xs" />
            </div>
          </section>

          {/* Platform IDs */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Platform IDs</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>YouTube Video ID</Label>
                <Input value={form.youtube_video_id ?? ''} onChange={e => set('youtube_video_id', e.target.value)} className="mt-1 font-mono text-xs" />
              </div>
              <div>
                <Label>TikTok Video ID</Label>
                <Input value={form.tiktok_video_id ?? ''} onChange={e => set('tiktok_video_id', e.target.value)} className="mt-1 font-mono text-xs" />
              </div>
              <div>
                <Label>Instagram Media ID</Label>
                <Input value={form.instagram_media_id ?? ''} onChange={e => set('instagram_media_id', e.target.value)} className="mt-1 font-mono text-xs" />
              </div>
              <div>
                <Label>Spotify Track ID</Label>
                <Input value={form.spotify_track_id ?? ''} onChange={e => set('spotify_track_id', e.target.value)} className="mt-1 font-mono text-xs" />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                Google Drive Folder URL
                {form.google_drive_folder_url && (
                  <a href={form.google_drive_folder_url} target="_blank" rel="noopener noreferrer" className="text-secondary">
                    <ExternalLink size={12} />
                  </a>
                )}
              </Label>
              <Input value={form.google_drive_folder_url ?? ''} onChange={e => set('google_drive_folder_url', e.target.value)} className="mt-1 text-xs" placeholder="https://drive.google.com/..." />
            </div>
          </section>

          {/* Analytics (read-only) */}
          {(song.views_youtube + song.views_tiktok + song.views_instagram + song.streams_spotify) > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Analytics</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'YT Views', value: song.views_youtube },
                  { label: 'TikTok Views', value: song.views_tiktok },
                  { label: 'IG Views', value: song.views_instagram },
                  { label: 'Spotify Streams', value: song.streams_spotify },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-muted rounded-md p-2 text-center">
                    <p className="text-lg font-bold">{value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2} className="mt-1" />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="destructive" size="sm" onClick={deleteSong} disabled={deleting} className="gap-2">
              <Trash2 size={12} /> Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
