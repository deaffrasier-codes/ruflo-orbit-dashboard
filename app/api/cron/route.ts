import { createClient } from '@supabase/supabase-js'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!
const IG_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!
const IG_USER_ID = process.env.INSTAGRAM_USER_ID!

// ── YouTube ────────────────────────────────────────────────────────────────

async function fetchYouTubeViews(videoIds: string[]): Promise<Record<string, { views: number; likes: number; comments: number }>> {
  if (!videoIds.length) return {}
  const ids = videoIds.join(',')
  const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${YOUTUBE_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  const result: Record<string, { views: number; likes: number; comments: number }> = {}
  for (const item of data.items ?? []) {
    result[item.id] = {
      views: parseInt(item.statistics?.viewCount ?? '0', 10),
      likes: parseInt(item.statistics?.likeCount ?? '0', 10),
      comments: parseInt(item.statistics?.commentCount ?? '0', 10),
    }
  }
  return result
}

// ── Instagram ──────────────────────────────────────────────────────────────

async function fetchInstagramMedia(): Promise<{ id: string; views: number; likes: number; comments: number }[]> {
  if (!IG_ACCESS_TOKEN || !IG_USER_ID) return []
  const fields = 'id,media_type,timestamp,like_count,comments_count'
  const url = `https://graph.facebook.com/v21.0/${IG_USER_ID}/media?fields=${fields}&access_token=${IG_ACCESS_TOKEN}`
  const res = await fetch(url)
  const data = await res.json()
  if (!data.data) return []

  const results = []
  for (const post of data.data.slice(0, 20)) {
    // Fetch insights (plays/views) for Reels
    let views = 0
    if (post.media_type === 'VIDEO' || post.media_type === 'REEL') {
      const insightUrl = `https://graph.facebook.com/v21.0/${post.id}/insights?metric=plays,reach&access_token=${IG_ACCESS_TOKEN}`
      const ir = await fetch(insightUrl)
      const id = await ir.json()
      const playsMetric = id.data?.find((m: { name: string; values: { value: number }[] }) => m.name === 'plays')
      views = playsMetric?.values?.[0]?.value ?? 0
    }
    results.push({
      id: post.id,
      views,
      likes: post.like_count ?? 0,
      comments: post.comments_count ?? 0,
    })
  }
  return results
}

// ── Main cron handler ──────────────────────────────────────────────────────

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorised', { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const log: string[] = []

  // ── YouTube: update videos table ─────────────────────────────────────────
  const { data: ytVideos } = await supabase
    .from('videos')
    .select('id, song_id, video_id, views')
    .eq('platform', 'youtube')

  if (ytVideos?.length) {
    const ids = ytVideos.map((v: { video_id: string }) => v.video_id)
    const stats = await fetchYouTubeViews(ids)

    for (const v of ytVideos) {
      const s = stats[v.video_id]
      if (!s) continue
      await supabase.from('videos').update({ views: s.views, likes: s.likes, comments: s.comments }).eq('id', v.id)
      await supabase.from('analytics_snapshots').insert({ song_id: v.song_id, platform: 'youtube', views: s.views, likes: s.likes, comments: s.comments, shares: 0 })

      const growth = v.views > 0 ? (s.views - v.views) / v.views : 0
      if (growth > 0.2) {
        await supabase.from('songs').update({ viral_alert: true }).eq('id', v.song_id)
        log.push(`VIRAL: ${v.video_id} grew ${Math.round(growth * 100)}%`)
      }
    }

    // Roll up total YT views per song
    const { data: allYt } = await supabase.from('videos').select('song_id, views').eq('platform', 'youtube')
    const songTotals: Record<string, number> = {}
    for (const v of allYt ?? []) {
      songTotals[v.song_id] = (songTotals[v.song_id] ?? 0) + v.views
    }
    for (const [song_id, total] of Object.entries(songTotals)) {
      await supabase.from('songs').update({ views_youtube: total }).eq('id', song_id)
    }
    log.push(`YouTube: updated ${ytVideos.length} videos`)
  }

  // ── Instagram: update videos table ───────────────────────────────────────
  const igPosts = await fetchInstagramMedia()
  if (igPosts.length) {
    const { data: igVideos } = await supabase
      .from('videos')
      .select('id, song_id, video_id, views')
      .eq('platform', 'instagram')

    for (const post of igPosts) {
      const match = igVideos?.find((v: { video_id: string }) => v.video_id === post.id)
      if (!match) continue
      await supabase.from('videos').update({ views: post.views, likes: post.likes, comments: post.comments }).eq('id', match.id)
    }

    // Roll up IG views per song
    const { data: allIg } = await supabase.from('videos').select('song_id, views').eq('platform', 'instagram')
    const igTotals: Record<string, number> = {}
    for (const v of allIg ?? []) {
      igTotals[v.song_id] = (igTotals[v.song_id] ?? 0) + v.views
    }
    for (const [song_id, total] of Object.entries(igTotals)) {
      await supabase.from('songs').update({ views_instagram: total }).eq('id', song_id)
    }
    log.push(`Instagram: updated ${igPosts.length} posts`)
  }

  return Response.json({ ok: true, log })
}
