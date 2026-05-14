import { createClient } from '@supabase/supabase-js'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!
const YOUTUBE_STATS_URL = 'https://www.googleapis.com/youtube/v3/videos'

async function fetchYouTubeStats(videoIds: string[]): Promise<Record<string, number>> {
  if (!videoIds.length) return {}
  const ids = videoIds.join(',')
  const url = `${YOUTUBE_STATS_URL}?part=statistics&id=${ids}&key=${YOUTUBE_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  const result: Record<string, number> = {}
  for (const item of data.items ?? []) {
    result[item.id] = parseInt(item.statistics?.viewCount ?? '0', 10)
  }
  return result
}

export async function GET(req: Request) {
  // Verify this is called by Vercel Cron (not random public traffic)
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorised', { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: songs, error } = await supabase
    .from('songs')
    .select('id, name, youtube_video_id, views_youtube')
    .not('youtube_video_id', 'is', null)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const videoIds = (songs ?? []).map((s: { youtube_video_id: string }) => s.youtube_video_id).filter(Boolean)
  const ytStats = await fetchYouTubeStats(videoIds)

  const updates: { song: string; views: number; prev: number }[] = []

  for (const song of songs ?? []) {
    const newViews = ytStats[song.youtube_video_id] ?? song.views_youtube
    if (newViews === song.views_youtube) continue

    await supabase.from('songs').update({ views_youtube: newViews }).eq('id', song.id)

    // Snapshot for history
    await supabase.from('analytics_snapshots').insert({
      song_id: song.id,
      platform: 'youtube',
      views: newViews,
      likes: 0,
      comments: 0,
      shares: 0,
    })

    // Viral alert: if views jumped >20% since last check, flag it
    const growth = song.views_youtube > 0
      ? (newViews - song.views_youtube) / song.views_youtube
      : 0
    if (growth > 0.2) {
      await supabase.from('songs').update({ viral_alert: true }).eq('id', song.id)
    }

    updates.push({ song: song.name, views: newViews, prev: song.views_youtube })
  }

  return Response.json({ updated: updates.length, updates })
}
