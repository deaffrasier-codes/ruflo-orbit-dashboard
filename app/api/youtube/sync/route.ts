// GET /api/youtube/sync
// Returns all videos from the deaffrasier YouTube channel,
// annotated with whether they're already linked in the videos table.

import { createClient } from '@supabase/supabase-js'

const YT_KEY = process.env.YOUTUBE_API_KEY!
const YT_HANDLE = process.env.YOUTUBE_CHANNEL_HANDLE ?? 'deaffrasier'

async function getUploadsPlaylistId(): Promise<string | null> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${YT_HANDLE}&key=${YT_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  return data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null
}

async function fetchAllPlaylistVideos(playlistId: string): Promise<{ id: string; title: string; publishedAt: string; thumbnail: string }[]> {
  const videos: { id: string; title: string; publishedAt: string; thumbnail: string }[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
      key: YT_KEY,
      ...(pageToken ? { pageToken } : {}),
    })
    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`)
    const data = await res.json()

    for (const item of data.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId
      if (!videoId) continue
      videos.push({
        id: videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails?.default?.url ?? '',
      })
    }
    pageToken = data.nextPageToken
  } while (pageToken)

  return videos
}

export async function GET() {
  if (!YT_KEY) return Response.json({ error: 'No YouTube API key' }, { status: 500 })

  const playlistId = await getUploadsPlaylistId()
  if (!playlistId) return Response.json({ error: 'Channel not found' }, { status: 404 })

  const videos = await fetchAllPlaylistVideos(playlistId)

  // Check which are already in DB
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: linked } = await supabase.from('videos').select('video_id').eq('platform', 'youtube') as { data: { video_id: string }[] | null }
  const linkedIds = new Set((linked ?? []).map(v => v.video_id))

  return Response.json({
    videos: videos.map(v => ({ ...v, linked: linkedIds.has(v.id) })),
  })
}
