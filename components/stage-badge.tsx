import { STAGE_MAP } from '@/lib/constants'
import type { PipelineStage } from '@/types/database'

export function StageBadge({ stage }: { stage: PipelineStage }) {
  const s = STAGE_MAP[stage]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${s.color}`}>
      {s.label}
    </span>
  )
}
