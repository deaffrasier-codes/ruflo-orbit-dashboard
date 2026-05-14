'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { DistrokidUpload } from '@/components/distrokid-upload'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

interface EarningsRow {
  reporting_date: string
  store: string
  earnings_usd: number
  quantity: number
  song_title: string | null
  songs?: { name: string } | null
}

interface SongRevenue {
  songName: string
  streaming: number
  youtube: number
  adSpend: number
  roi: number
}

interface DailyPoint {
  date: string
  streaming: number
  youtube: number
  adSpend: number
}

function fmt(n: number) {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export default function RevenuePage() {
  const [earnings, setEarnings] = useState<EarningsRow[]>([])
  const [songRevenue, setSongRevenue] = useState<SongRevenue[]>([])
  const [trend, setTrend] = useState<DailyPoint[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    // DistroKid earnings with song join
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dk } = await (supabase as any)
      .from('distrokid_earnings')
      .select('reporting_date, store, earnings_usd, quantity, song_title, songs(name)')
      .order('reporting_date', { ascending: false })
      .limit(500)

    const rows: EarningsRow[] = dk ?? []
    setEarnings(rows)

    // Per-song revenue rollup
    const songMap: Record<string, SongRevenue> = {}
    for (const r of rows) {
      const name = r.songs?.name ?? r.song_title ?? 'Unmatched'
      if (!songMap[name]) songMap[name] = { songName: name, streaming: 0, youtube: 0, adSpend: 0, roi: 0 }
      songMap[name].streaming += r.earnings_usd
    }
    // TODO: wire youtube_analytics and meta_insights once OAuth is set up
    const songList = Object.values(songMap)
      .map(s => ({ ...s, roi: s.streaming + s.youtube - s.adSpend }))
      .sort((a, b) => b.roi - a.roi)
    setSongRevenue(songList)

    // Monthly trend
    const monthMap: Record<string, DailyPoint> = {}
    for (const r of rows) {
      const month = r.reporting_date.slice(0, 7)
      if (!monthMap[month]) monthMap[month] = { date: month, streaming: 0, youtube: 0, adSpend: 0 }
      monthMap[month].streaming += r.earnings_usd
    }
    setTrend(Object.values(monthMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-12))

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const totalStreaming = earnings.reduce((a, r) => a + r.earnings_usd, 0)
  const totalYT = 0 // wired in next phase
  const totalAdSpend = 0 // wired in next phase
  const netROI = totalStreaming + totalYT - totalAdSpend

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthStreaming = earnings.filter(r => r.reporting_date.startsWith(thisMonth)).reduce((a, r) => a + r.earnings_usd, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Revenue</h2>
        <DistrokidUpload onImported={load} />
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Net ROI (all time)', value: fmt(netROI), color: 'text-primary' },
          { label: 'Streaming Royalties', value: fmt(totalStreaming), color: 'text-green-400' },
          { label: 'YouTube AdSense', value: fmt(totalYT), color: 'text-red-400', note: 'OAuth setup needed' },
          { label: 'Ad Spend (Meta)', value: fmt(totalAdSpend), color: 'text-amber-400', note: 'API setup needed' },
        ].map(({ label, value, color, note }) => (
          <Card key={label} className="p-4 bg-card border-border">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
            {note && <p className="text-xs text-muted-foreground/50 mt-0.5">{note}</p>}
          </Card>
        ))}
      </div>

      {/* This month */}
      <Card className="p-4 bg-card border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">This Month</p>
        <p className="text-3xl font-bold text-green-400">{fmt(monthStreaming)}</p>
        <p className="text-xs text-muted-foreground mt-1">Streaming royalties — {new Date().toLocaleString('en-AU', { month: 'long', year: 'numeric' })}</p>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!loading && earnings.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground">No earnings data yet.</p>
          <p className="text-sm text-muted-foreground">Download your earnings CSV from DistroKid → Bank → Download Earnings, then upload above.</p>
        </div>
      )}

      {trend.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Monthly Streaming Royalties</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${v}`} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                formatter={(v: unknown) => [fmt(Number(v)), 'Royalties']}
              />
              <Bar dataKey="streaming" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Streaming" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Per-song ROI table */}
      {songRevenue.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Per-Song Revenue</h3>
          <div className="space-y-1">
            {songRevenue.map(s => (
              <Card key={s.songName} className="p-3 bg-card border-border flex items-center gap-4">
                <p className="flex-1 text-sm font-medium truncate">{s.songName}</p>
                <div className="flex gap-6 text-right text-xs shrink-0">
                  <div>
                    <p className="font-semibold text-green-400">{fmt(s.streaming)}</p>
                    <p className="text-muted-foreground">Streaming</p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-400">{fmt(s.youtube)}</p>
                    <p className="text-muted-foreground">AdSense</p>
                  </div>
                  <div>
                    <p className="font-semibold text-amber-400">-{fmt(s.adSpend)}</p>
                    <p className="text-muted-foreground">Ad Spend</p>
                  </div>
                  <div>
                    <p className={`font-bold ${s.roi >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmt(s.roi)}</p>
                    <p className="text-muted-foreground">Net ROI</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Platform breakdown */}
      {earnings.length > 0 && (() => {
        const storeMap: Record<string, number> = {}
        for (const r of earnings) {
          storeMap[r.store] = (storeMap[r.store] ?? 0) + r.earnings_usd
        }
        const storeData = Object.entries(storeMap)
          .map(([store, earnings]) => ({ store, earnings }))
          .sort((a, b) => b.earnings - a.earnings)
          .slice(0, 8)

        return (
          <Card className="p-4 bg-card border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Royalties by Platform</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={storeData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="store" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                  formatter={(v: unknown) => [fmt(Number(v)), 'Royalties']}
                />
                <Bar dataKey="earnings" fill="hsl(var(--secondary))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )
      })()}
    </div>
  )
}
