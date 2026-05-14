import { createClient } from '@supabase/supabase-js'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!
const IG_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!
const IG_USER_ID = process.env.INSTAGRAM_USER_ID!

// ── TikTok ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTikTokToken(supabase: any): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any).from('app_secrets').select('value, expires_at').eq('key', 'tiktok_access_token').single() as { data: { value: string; expires_at: string } | null }
  if (!data) return null

  // Refresh if expiring within 2 hours
  const expiresAt = new Date(data.expires_at)
  if (expiresAt.getTime() - Date.now() < 2 * 60 * 60 * 1000) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: refresh } = await (supabase as any).from('app_secrets').select('value').eq('key', 'tiktok_refresh_token').single() as { data: { value: string } | null }
    if (!refresh) return data.value

    const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refresh.value,
      }),
    })
    const newToken = await res.json()
    if (newToken.access_token) {
      const expiresAt = new Date(Date.now() + newToken.expires_in * 1000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('app_secrets').upsert({ key: 'tiktok_access_token', value: newToken.access_token, expires_at: expiresAt })
      return newToken.access_token
    }
  }
  return data.value
}

async function fetchTikTokVideos(token: string, openId: string): Promise<{ id: string; views: number; likes: number; comments: number; shares: number }[]> {
  const res = await fetch('https://open.tiktokapis.com/v2/video/list/?fields=id,view_count,like_count,comment_count,share_count', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_count: 20 }),
  })
  const data = await res.json()
  return (data.data?.videos ?? []).map((v: { id: string; view_count: number; like_count: number; comment_count: number; share_count: number }) => ({
    id: v.id,
    views: v.view_count ?? 0,
    likes: v.like_count ?? 0,
    comments: v.comment_count ?? 0,
    shares: v.share_count ?? 0,
  }))
}

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

  // ── TikTok ───────────────────────────────────────────────────────────────
  const ttToken = await getTikTokToken(supabase)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: openIdRow } = await (supabase as any).from('app_secrets').select('value').eq('key', 'tiktok_open_id').single() as { data: { value: string } | null }

  if (ttToken && openIdRow?.value) {
    const ttVideos = await fetchTikTokVideos(ttToken, openIdRow.value)
    const { data: ttDbVideos } = await supabase.from('videos').select('id, song_id, video_id, views').eq('platform', 'tiktok')

    for (const post of ttVideos) {
      const match = ttDbVideos?.find((v: { video_id: string }) => v.video_id === post.id)
      if (!match) continue
      await supabase.from('videos').update({ views: post.views, likes: post.likes, comments: post.comments, shares: post.shares }).eq('id', match.id)
    }

    // Roll up TikTok views per song
    const { data: allTt } = await supabase.from('videos').select('song_id, views').eq('platform', 'tiktok')
    const ttTotals: Record<string, number> = {}
    for (const v of allTt ?? []) {
      ttTotals[v.song_id] = (ttTotals[v.song_id] ?? 0) + v.views
    }
    for (const [song_id, total] of Object.entries(ttTotals)) {
      await supabase.from('songs').update({ views_tiktok: total }).eq('id', song_id)
    }
    log.push(`TikTok: updated ${ttVideos.length} videos`)
  }

  return Response.json({ ok: true, log })
}
