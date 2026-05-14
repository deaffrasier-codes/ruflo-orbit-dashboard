import type { PipelineStage, Saga } from '@/types/database'

export const STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: 'idea',       label: 'Prompt / Idea',     color: 'bg-slate-600 text-slate-100' },
  { id: 'concept',    label: 'Concept / Lyrics',  color: 'bg-amber-600 text-amber-50' },
  { id: 'structure',  label: 'Song Structure',    color: 'bg-orange-600 text-orange-50' },
  { id: 'scripts',    label: 'Song Scripts',      color: 'bg-violet-600 text-violet-50' },
  { id: 'audio',      label: 'Song Made',         color: 'bg-blue-600 text-blue-50' },
  { id: 'animation',  label: '3D Animation',      color: 'bg-cyan-600 text-cyan-50' },
  { id: 'marketing',  label: 'Marketing / SEO',   color: 'bg-pink-500 text-pink-50' },
  { id: 'published',  label: 'Published',         color: 'bg-green-600 text-green-50' },
]

export const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.id, s])) as Record<PipelineStage, typeof STAGES[0]>

export const SAGAS: { id: Saga; label: string }[] = [
  { id: 'saga1_teletubbies', label: 'Saga 1: Teletubbies' },
  { id: 'saga2_simpsons',    label: 'Saga 2: Simpsons' },
  { id: 'saga3_shrek',       label: 'Saga 3: Shrek' },
  { id: 'saga4_animals',     label: 'Saga 4: Animals' },
  { id: 'standalone',        label: 'Standalone / Client' },
]
