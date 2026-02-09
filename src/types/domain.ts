import type { Database } from './database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Dive = Database['public']['Tables']['dives']['Row']
export type Video = Database['public']['Tables']['videos']['Row']
export type Highlight = Database['public']['Tables']['highlights']['Row']
export type Species = Database['public']['Tables']['species']['Row']
export type HighlightSpecies = Database['public']['Tables']['highlight_species']['Row']
export type DiveLog = Database['public']['Tables']['dive_logs']['Row']
export type ProcessingJob = Database['public']['Tables']['processing_jobs']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type SpeciesGalleryItem = Database['public']['Views']['species_gallery']['Row']

export type DiveInsert = Database['public']['Tables']['dives']['Insert']
export type VideoInsert = Database['public']['Tables']['videos']['Insert']

export interface DiveWithVideos extends Dive {
  videos: Video[]
}

export interface HighlightWithSpecies extends Highlight {
  highlight_species: (HighlightSpecies & { species: Species })[]
}

export interface DiveDetail extends Dive {
  videos: Video[]
  highlights: HighlightWithSpecies[]
  dive_logs: DiveLog[]
}

export type PlatformPreset = 'instagram_reel' | 'tiktok' | 'youtube_short' | 'youtube' | 'original'

export interface ExportSettings {
  preset: PlatformPreset
  aspectRatio: string
  maxDuration: number | null
  resolution: string
}

export const PLATFORM_PRESETS: Record<PlatformPreset, ExportSettings> = {
  instagram_reel: { preset: 'instagram_reel', aspectRatio: '9:16', maxDuration: 90, resolution: '1080x1920' },
  tiktok: { preset: 'tiktok', aspectRatio: '9:16', maxDuration: 180, resolution: '1080x1920' },
  youtube_short: { preset: 'youtube_short', aspectRatio: '9:16', maxDuration: 60, resolution: '1080x1920' },
  youtube: { preset: 'youtube', aspectRatio: '16:9', maxDuration: null, resolution: '1920x1080' },
  original: { preset: 'original', aspectRatio: 'original', maxDuration: null, resolution: 'original' },
}
