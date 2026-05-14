// GET /api/auth/tiktok/callback — TikTok redirects here after auth
// Exchanges code for tokens and stores in Supabase

import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return new Response(`TikTok auth error: ${error ?? 'no code'}`, { status: 400 })
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY!
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  const tokenData = await tokenRes.json()

  if (tokenData.error) {
    return new Response(`Token exchange failed: ${JSON.stringify(tokenData)}`, { status: 400 })
  }

  const { access_token, refresh_token, expires_in, open_id } = tokenData

  // Store tokens in Supabase app_secrets table
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

  await supabase.from('app_secrets').upsert([
    { key: 'tiktok_access_token', value: access_token, expires_at: expiresAt },
    { key: 'tiktok_refresh_token', value: refresh_token, expires_at: null },
    { key: 'tiktok_open_id', value: open_id, expires_at: null },
  ])

  return new Response(
    `<html><body style="font-family:sans-serif;padding:40px;background:#111;color:#fff">
      <h2 style="color:#f472b6">TikTok connected!</h2>
      <p>Access token stored. Cron will refresh it daily.</p>
      <p>Open ID: <code>${open_id}</code></p>
      <a href="/" style="color:#60a5fa">Back to dashboard</a>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
