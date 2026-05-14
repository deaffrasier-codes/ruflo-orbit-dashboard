export type PipelineStage =
  | 'idea'
  | 'concept'
  | 'structure'
  | 'scripts'
  | 'audio'
  | 'animation'
  | 'marketing'
  | 'published'

export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'spotify'

export type Saga = 'saga1_teletubbies' | 'saga2_simpsons' | 'saga3_shrek' | 'saga4_animals' | 'standalone'

export interface Song {
  id: string
  name: string
  status: PipelineStage
  saga: Saga | null
  platforms: Platform[]
  // Idea/Concept fields
  premise: string | null
  character: string | null
  tone: string | null
  content_type: 'parody' | 'original' | 'meme-remix' | null
  // Structure fields
  genre: string | null
  bpm: number | null
  musical_key: string | null
  chord_plan: string | null
  // Script fields
  raw_lyrics: string | null
  // Production fields
  shipped_date: string | null
  youtube_video_id: string | null
  tiktok_video_id: string | null
  instagram_media_id: string | null
  spotify_track_id: string | null
  google_drive_folder_url: string | null
  // Analytics (cached from cron)
  views_youtube: number
  views_tiktok: number
  views_instagram: number
  streams_spotify: number
  // Meta
  notes: string | null
  viral_alert: boolean
  created_at: string
  updated_at: string
}

export interface AnalyticsSnapshot {
  id: string
  song_id: string
  platform: Platform
  views: number
  likes: number
  comments: number
  shares: number
  snapshot_at: string
}

export interface Database {
  public: {
    Tables: {
      songs: {
        Row: Song
        Insert: Omit<Song, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Song, 'id' | 'created_at' | 'updated_at'>>
      }
      analytics_snapshots: {
        Row: AnalyticsSnapshot
        Insert: Omit<AnalyticsSnapshot, 'id'>
        Update: Partial<Omit<AnalyticsSnapshot, 'id'>>
      }
    }
  }
}
