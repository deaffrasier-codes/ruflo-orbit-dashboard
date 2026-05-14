'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { SAGAS } from '@/lib/constants'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function NewSongForm({ open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<{name:string;saga:string;premise:string;character:string;tone:string;content_type:string}>({
    name: '',
    saga: '',
    premise: '',
    character: '',
    tone: '',
    content_type: '',
  })

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.name.trim()) { toast.error('Song name required'); return }
    setLoading(true)
    const { error } = await supabase.from('songs').insert({
      name: form.name.trim(),
      status: 'idea',
      saga: form.saga || null,
      premise: form.premise || null,
      character: form.character || null,
      tone: form.tone || null,
      content_type: form.content_type || null,
      platforms: [],
      views_youtube: 0,
      views_tiktok: 0,
      views_instagram: 0,
      streams_spotify: 0,
      viral_alert: false,
    })
    setLoading(false)
    if (error) { toast.error('Failed to create song'); return }
    toast.success(`"${form.name}" added to pipeline`)
    setForm({ name: '', saga: '', premise: '', character: '', tone: '', content_type: '' })
    onCreated()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>New Song Idea</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Song Name *</Label>
            <Input id="name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. A Pigeon Complains About Gentrification" className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Saga</Label>
              <Select value={form.saga} onValueChange={v => set('saga', v ?? '')}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick saga" /></SelectTrigger>
                <SelectContent>
                  {SAGAS.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.content_type} onValueChange={v => set('content_type', v ?? '')}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parody">Parody</SelectItem>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="meme-remix">Meme Remix</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="character">Character / POV</Label>
            <Input id="character" value={form.character} onChange={e => set('character', e.target.value)} placeholder="e.g. Pigeon, Possum, Laa-Laa" className="mt-1" />
          </div>

          <div>
            <Label htmlFor="tone">Tone</Label>
            <Input id="tone" value={form.tone} onChange={e => set('tone', e.target.value)} placeholder="e.g. cursed, wholesome, horror, chaotic" className="mt-1" />
          </div>

          <div>
            <Label htmlFor="premise">Premise / Concept</Label>
            <Textarea id="premise" value={form.premise} onChange={e => set('premise', e.target.value)} placeholder="What's the joke? What's the setup and payoff?" rows={3} className="mt-1" />
          </div>

          <Button onClick={submit} disabled={loading} className="w-full">
            {loading ? 'Adding...' : 'Add to Pipeline'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
