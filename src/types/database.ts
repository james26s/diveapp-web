export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type VideoStatus = 'uploading' | 'uploaded' | 'processing' | 'processed' | 'failed'
export type HighlightType = 'species_sighting' | 'interesting_moment' | 'scenic' | 'manual'
export type SpeciesCategory = 'fish' | 'coral' | 'invertebrate' | 'mammal' | 'reptile'
export type ProcessingJobType = 'scene_analysis' | 'species_detection' | 'highlight_extraction' | 'color_correction' | 'clip_generation' | 'dive_log_generation' | 'thumbnail_generation'
export type ProcessingJobStatus = 'pending' | 'running' | 'completed' | 'failed'
export type SubscriptionTier = 'free' | 'pro' | 'team'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          certification_level: string | null
          total_dives: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          certification_level?: string | null
          total_dives?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          certification_level?: string | null
          total_dives?: number
          updated_at?: string
        }
      }
      dives: {
        Row: {
          id: string
          user_id: string
          title: string
          dive_date: string
          location_name: string | null
          latitude: number | null
          longitude: number | null
          max_depth: number | null
          duration: number | null
          water_temp: number | null
          visibility: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          dive_date: string
          location_name?: string | null
          latitude?: number | null
          longitude?: number | null
          max_depth?: number | null
          duration?: number | null
          water_temp?: number | null
          visibility?: number | null
          notes?: string | null
        }
        Update: {
          title?: string
          dive_date?: string
          location_name?: string | null
          latitude?: number | null
          longitude?: number | null
          max_depth?: number | null
          duration?: number | null
          water_temp?: number | null
          visibility?: number | null
          notes?: string | null
          updated_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          dive_id: string
          user_id: string
          storage_path: string
          file_name: string
          file_size: number
          duration: number | null
          resolution: string | null
          format: string | null
          status: VideoStatus
          thumbnail_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dive_id: string
          user_id: string
          storage_path: string
          file_name: string
          file_size: number
          duration?: number | null
          resolution?: string | null
          format?: string | null
          status?: VideoStatus
          thumbnail_path?: string | null
        }
        Update: {
          storage_path?: string
          file_name?: string
          file_size?: number
          duration?: number | null
          resolution?: string | null
          format?: string | null
          status?: VideoStatus
          thumbnail_path?: string | null
          updated_at?: string
        }
      }
      highlights: {
        Row: {
          id: string
          video_id: string
          dive_id: string
          user_id: string
          type: HighlightType
          title: string | null
          start_time: number
          end_time: number
          clip_path: string | null
          thumbnail_path: string | null
          confidence: number | null
          share_token: string | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          dive_id: string
          user_id: string
          type: HighlightType
          title?: string | null
          start_time: number
          end_time: number
          clip_path?: string | null
          thumbnail_path?: string | null
          confidence?: number | null
          share_token?: string | null
          is_public?: boolean
        }
        Update: {
          type?: HighlightType
          title?: string | null
          start_time?: number
          end_time?: number
          clip_path?: string | null
          thumbnail_path?: string | null
          confidence?: number | null
          share_token?: string | null
          is_public?: boolean
        }
      }
      species: {
        Row: {
          id: string
          common_name: string
          scientific_name: string | null
          category: SpeciesCategory
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          common_name: string
          scientific_name?: string | null
          category: SpeciesCategory
          image_url?: string | null
        }
        Update: {
          common_name?: string
          scientific_name?: string | null
          category?: SpeciesCategory
          image_url?: string | null
        }
      }
      highlight_species: {
        Row: {
          id: string
          highlight_id: string
          species_id: string
          confidence: number
          bounding_box: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          highlight_id: string
          species_id: string
          confidence: number
          bounding_box?: Json | null
        }
        Update: {
          confidence?: number
          bounding_box?: Json | null
        }
      }
      dive_logs: {
        Row: {
          id: string
          dive_id: string
          user_id: string
          summary: string
          species_seen: Json
          conditions: Json
          ai_generated: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dive_id: string
          user_id: string
          summary: string
          species_seen?: Json
          conditions?: Json
          ai_generated?: boolean
        }
        Update: {
          summary?: string
          species_seen?: Json
          conditions?: Json
          ai_generated?: boolean
          updated_at?: string
        }
      }
      processing_jobs: {
        Row: {
          id: string
          video_id: string
          user_id: string
          type: ProcessingJobType
          status: ProcessingJobStatus
          progress: number
          result: Json | null
          error: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          video_id: string
          user_id: string
          type: ProcessingJobType
          status?: ProcessingJobStatus
          progress?: number
          result?: Json | null
          error?: string | null
        }
        Update: {
          status?: ProcessingJobStatus
          progress?: number
          result?: Json | null
          error?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          tier: SubscriptionTier
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: SubscriptionStatus
          credits_used: number
          credits_limit: number
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier?: SubscriptionTier
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: SubscriptionStatus
          credits_used?: number
          credits_limit?: number
          current_period_start?: string | null
          current_period_end?: string | null
        }
        Update: {
          tier?: SubscriptionTier
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: SubscriptionStatus
          credits_used?: number
          credits_limit?: number
          current_period_start?: string | null
          current_period_end?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      species_gallery: {
        Row: {
          species_id: string
          common_name: string
          scientific_name: string | null
          category: SpeciesCategory
          image_url: string | null
          sighting_count: number
          dive_count: number
          latest_sighting: string
          best_thumbnail: string | null
        }
      }
    }
  }
}
