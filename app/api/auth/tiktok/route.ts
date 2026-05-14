// GET /api/auth/tiktok — initiates TikTok OAuth flow
// Visit this URL in browser once to authorise and store tokens

export async function GET() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`
  const scope = 'user.info.basic,video.list'
  const state = Math.random().toString(36).slice(2)

  const params = new URLSearchParams({
    client_key: clientKey,
    scope,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
  })

  return Response.redirect(`https://www.tiktok.com/v2/auth/authorize/?${params}`)
}
