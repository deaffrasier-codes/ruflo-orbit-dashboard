// POST /api/import/distrokid
// Accepts a DistroKid earnings CSV, parses it, upserts into distrokid_earnings table.

import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'

interface DKRow {
  'Reporting Date'?: string
  'Sale Month'?: string
  'Store'?: string
  'Country of Sale'?: string
  'Quantity'?: string
  'Song Title'?: string
  'ISRC'?: string
  'UPC'?: string
  'Earnings (USD)'?: string
  'Team Percentage'?: string
  [key: string]: string | undefined
}

function parseDate(raw: string | undefined): string | null {
  if (!raw) return null
  // Handle "January 2025" or "2025-01" or "2025-01-01"
  const monthNames: Record<string, string> = {
    January: '01', February: '02', March: '03', April: '04',
    May: '05', June: '06', July: '07', August: '08',
    September: '09', October: '10', November: '11', December: '12',
  }
  const longForm = raw.match(/^(\w+)\s+(\d{4})$/)
  if (longForm) {
    const month = monthNames[longForm[1]]
    if (month) return `${longForm[2]}-${month}-01`
  }
  const isoShort = raw.match(/^(\d{4})-(\d{2})$/)
  if (isoShort) return `${raw}-01`
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return null
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file uploaded' }, { status: 400 })

  const text = await file.text()
  // Strip BOM if present
  const csv = text.startsWith('\uFEFF') ? text.slice(1) : text

  const { data: rows, errors } = Papa.parse<DKRow>(csv, { header: true, skipEmptyLines: true })
  if (errors.length && !rows.length) {
    return Response.json({ error: 'CSV parse failed', detail: errors[0].message }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Load songs for ISRC matching
  const { data: songs } = await supabase.from('songs').select('id, name, isrc') as { data: { id: string; name: string; isrc: string | null }[] | null }
  const isrcMap: Record<string, string> = {}
  const titleMap: Record<string, string> = {}
  for (const s of songs ?? []) {
    if (s.isrc) isrcMap[s.isrc.toUpperCase()] = s.id
    titleMap[s.name.toLowerCase()] = s.id
  }

  const records = []
  for (const row of rows) {
    const earnings = parseFloat(row['Earnings (USD)'] ?? '0') || 0
    const quantity = parseInt(row['Quantity'] ?? '0', 10) || 0
    const reportingDate = parseDate(row['Reporting Date'] ?? row['Sale Month'])
    const isrc = row['ISRC']?.toUpperCase() ?? null
    const songTitle = row['Song Title'] ?? null
    const store = row['Store'] ?? 'Unknown'
    const country = row['Country of Sale'] ?? null

    if (!reportingDate) continue

    const songId = (isrc && isrcMap[isrc]) ?? (songTitle && titleMap[songTitle.toLowerCase()]) ?? null

    records.push({
      song_id: songId,
      reporting_date: reportingDate,
      store,
      country,
      quantity,
      earnings_usd: earnings,
      song_title: songTitle,
      isrc,
      upc: row['UPC'] ?? null,
    })
  }

  if (!records.length) return Response.json({ error: 'No valid rows parsed' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('distrokid_earnings').upsert(records, {
    onConflict: 'isrc,store,country,reporting_date',
    ignoreDuplicates: false,
  })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const matched = records.filter(r => r.song_id).length
  return Response.json({ ok: true, total: records.length, matched, unmatched: records.length - matched })
}
