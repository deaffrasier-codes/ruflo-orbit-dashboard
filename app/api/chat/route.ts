import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { Song } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function buildSystemPrompt(songs: Song[]): string {
  const active = songs.filter(s => s.status !== 'published')
  const shipped = songs
    .filter(s => s.status === 'published')
    .sort((a, b) => (b.shipped_date ?? '').localeCompare(a.shipped_date ?? ''))
    .slice(0, 5)

  return `You are Frasier's music production assistant for Ruflo Orbit.

Brand: deaffrasier. Deaf music producer + 3D animator in Pinjarra WA. Clay-doh chibi aesthetic. Brain rot comedy parody songs.

Active pipeline (${active.length} songs):
${active.map(s => `- "${s.name}" | Stage: ${s.status} | Saga: ${s.saga ?? 'standalone'} | Genre: ${s.genre ?? '—'} | BPM: ${s.bpm ?? '—'} | Key: ${s.musical_key ?? '—'}`).join('\n')}

Recently shipped:
${shipped.map(s => `- "${s.name}" | Shipped: ${s.shipped_date ?? '?'} | YT: ${s.views_youtube.toLocaleString()} views`).join('\n')}

Architecture: Ruflo v1.6 Lua/Synth V pipeline. Reference scaffold: scaffold_big_block.lua. Scaffold ref: scaffold_marges_hair.lua.
Drum source: audio_triaz default (midi_mtpdk for synth-pop). Vocal chain: ReaEQ → ReaComp → TAL-Chorus-LX → ReaVerbate. Instruments: Surge XT preloaded.

Hard rules:
- Frasier is deaf — always give numerical targets (LUFS, dB, Hz, BPM). Never "trust your ears."
- Daily-fast workflow: 5-10 min/song default. Cymatics depth is opt-in only.
- Australian English (optimise, colour, recognise). No em dashes.
- Terse, senior-practitioner tone. No padding.
- Master target: -1 dBTP, -14 LUFS integrated.
- Synth V: no dofile(). Self-contained LINES table. One note per word.
- No Lua volume automation (5 attempts failed — use static D_VOL only).`
}

export async function POST(req: Request) {
  const { messages } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: songs } = await supabase.from('songs').select('*')

  const systemPrompt = buildSystemPrompt((songs ?? []) as Song[])

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return Response.json({ role: 'assistant', content: text })
}
