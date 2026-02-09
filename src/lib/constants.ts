import type { SubscriptionTier } from '@/types/database'

export const APP_NAME = 'DiveApp'
export const APP_DESCRIPTION = 'Transform your dive footage into shareable highlights with AI-powered species detection and automatic dive logs.'

export const ACCEPTED_VIDEO_FORMATS = [
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/avi',
  'video/webm',
]

export const ACCEPTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.avi', '.webm']

export const TUS_CHUNK_SIZE = 6 * 1024 * 1024 // 6MB

export interface TierLimits {
  maxUploadSize: number // bytes
  monthlyCredits: number
  maxUploadsPerMonth: number
  features: {
    colorCorrection: boolean
    highResExport: boolean
    shareableLinks: boolean
    diveLogExport: boolean
    bulkProcessing: boolean
    priorityQueue: boolean
    noWatermark: boolean
  }
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxUploadSize: 2 * 1024 * 1024 * 1024, // 2GB
    monthlyCredits: 30, // 30 minutes of processing
    maxUploadsPerMonth: 5,
    features: {
      colorCorrection: false,
      highResExport: false,
      shareableLinks: false,
      diveLogExport: false,
      bulkProcessing: false,
      priorityQueue: false,
      noWatermark: false,
    },
  },
  pro: {
    maxUploadSize: 20 * 1024 * 1024 * 1024, // 20GB
    monthlyCredits: 300, // 300 minutes
    maxUploadsPerMonth: 50,
    features: {
      colorCorrection: true,
      highResExport: true,
      shareableLinks: true,
      diveLogExport: true,
      bulkProcessing: true,
      priorityQueue: false,
      noWatermark: true,
    },
  },
  team: {
    maxUploadSize: 50 * 1024 * 1024 * 1024, // 50GB
    monthlyCredits: 1000,
    maxUploadsPerMonth: -1, // unlimited
    features: {
      colorCorrection: true,
      highResExport: true,
      shareableLinks: true,
      diveLogExport: true,
      bulkProcessing: true,
      priorityQueue: true,
      noWatermark: true,
    },
  },
}

export const SPECIES_CATEGORIES = [
  { value: 'fish', label: 'Fish' },
  { value: 'coral', label: 'Coral' },
  { value: 'invertebrate', label: 'Invertebrates' },
  { value: 'mammal', label: 'Mammals' },
  { value: 'reptile', label: 'Reptiles' },
] as const

export const PROCESSING_STAGES = [
  { type: 'scene_analysis', label: 'Analyzing scenes', icon: 'Film' },
  { type: 'species_detection', label: 'Detecting species', icon: 'Fish' },
  { type: 'highlight_extraction', label: 'Extracting highlights', icon: 'Sparkles' },
  { type: 'color_correction', label: 'Correcting colors', icon: 'Palette' },
  { type: 'clip_generation', label: 'Generating clips', icon: 'Scissors' },
  { type: 'dive_log_generation', label: 'Creating dive log', icon: 'FileText' },
  { type: 'thumbnail_generation', label: 'Creating thumbnails', icon: 'Image' },
] as const
