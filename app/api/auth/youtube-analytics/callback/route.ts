// GET /api/auth/youtube-analytics/callback
// Exchanges auth code for refresh token, stores in app_secrets.

import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return new Response(`Auth error: ${error ?? 'no code'}`, { status: 400 })
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube-analytics/callback`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  })
  const tokenData = await tokenRes.json()

  if (tokenData.error || !tokenData.refresh_token) {
    return new Response(`Token exchange failed: ${JSON.stringify(tokenData)}`, { status: 400 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('app_secrets').upsert([
    { key: 'youtube_analytics_refresh_token', value: tokenData.refresh_token, expires_at: null },
  ])

  return new Response(
    `<html><body style="font-family:sans-serif;padding:40px;background:#111;color:#fff">
      <h2 style="color:#f472b6">YouTube Analytics connected!</h2>
      <p>Refresh token stored. Revenue data will sync in next cron run.</p>
      <a href="/" style="color:#60a5fa">Back to dashboard</a>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
