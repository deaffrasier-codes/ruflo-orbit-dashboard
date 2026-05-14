// GET /api/auth/youtube-analytics
// Initiates OAuth for YouTube Analytics (revenue data).
// Visit once in browser; stores refresh token in app_secrets.

export async function GET() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/youtube-analytics/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/yt-analytics.readonly',
      'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
  })

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
