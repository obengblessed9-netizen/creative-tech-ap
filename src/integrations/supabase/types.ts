export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      art_detection_results: {
        Row: {
          analysis_details: Json | null
          artwork_id: string | null
          confidence_score: number | null
          created_at: string
          id: string
          image_url: string
          is_ai_generated: boolean | null
          user_id: string
        }
        Insert: {
          analysis_details?: Json | null
          artwork_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          image_url: string
          is_ai_generated?: boolean | null
          user_id: string
        }
        Update: {
          analysis_details?: Json | null
          artwork_id?: string | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          image_url?: string
          is_ai_generated?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "art_detection_results_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_applications: {
        Row: {
          admin_notes: string | null
          age: number | null
          art_style: string | null
          artist_name: string
          awards: string | null
          bio: string | null
          contact_phone: string | null
          created_at: string
          education: string | null
          exhibitions: string | null
          first_name: string | null
          full_biography: string | null
          gps_lat: number | null
          gps_lng: number | null
          house_address: string | null
          id: string
          last_name: string | null
          location: string | null
          medium_used: string | null
          national_id_url: string | null
          portfolio_url: string | null
          profile_picture_url: string | null
          shop_number: string | null
          specialty: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          years_active: number | null
        }
        Insert: {
          admin_notes?: string | null
          age?: number | null
          art_style?: string | null
          artist_name: string
          awards?: string | null
          bio?: string | null
          contact_phone?: string | null
          created_at?: string
          education?: string | null
          exhibitions?: string | null
          first_name?: string | null
          full_biography?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          house_address?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          medium_used?: string | null
          national_id_url?: string | null
          portfolio_url?: string | null
          profile_picture_url?: string | null
          shop_number?: string | null
          specialty?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          years_active?: number | null
        }
        Update: {
          admin_notes?: string | null
          age?: number | null
          art_style?: string | null
          artist_name?: string
          awards?: string | null
          bio?: string | null
          contact_phone?: string | null
          created_at?: string
          education?: string | null
          exhibitions?: string | null
          first_name?: string | null
          full_biography?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          house_address?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          medium_used?: string | null
          national_id_url?: string | null
          portfolio_url?: string | null
          profile_picture_url?: string | null
          shop_number?: string | null
          specialty?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          years_active?: number | null
        }
        Relationships: []
      }
      artist_ratings: {
        Row: {
          artist_id: string
          created_at: string
          id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artist_verifications: {
        Row: {
          admin_notes: string | null
          ai_result: Json | null
          artist_id: string
          created_at: string
          id: string
          id_card_url: string
          selfie_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          ai_result?: Json | null
          artist_id: string
          created_at?: string
          id?: string
          id_card_url: string
          selfie_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          ai_result?: Json | null
          artist_id?: string
          created_at?: string
          id?: string
          id_card_url?: string
          selfie_url?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_verifications_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          art_style: string | null
          awards: string | null
          behance_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          dribbble_url: string | null
          education: string | null
          email: string | null
          exhibitions: string | null
          facebook_url: string | null
          full_biography: string | null
          gender: string | null
          id: string
          image_url: string | null
          instagram_url: string | null
          linkedin_url: string | null
          medium_used: string | null
          name: string
          phone: string | null
          pinterest_url: string | null
          real_name: string | null
          specialty: string | null
          tags: string[] | null
          tiktok_url: string | null
          updated_at: string
          user_id: string | null
          username: string | null
          verification_status: string
          verified: boolean
          website_url: string | null
          years_active: number | null
          youtube_url: string | null
        }
        Insert: {
          art_style?: string | null
          awards?: string | null
          behance_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dribbble_url?: string | null
          education?: string | null
          email?: string | null
          exhibitions?: string | null
          facebook_url?: string | null
          full_biography?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          medium_used?: string | null
          name: string
          phone?: string | null
          pinterest_url?: string | null
          real_name?: string | null
          specialty?: string | null
          tags?: string[] | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
          verification_status?: string
          verified?: boolean
          website_url?: string | null
          years_active?: number | null
          youtube_url?: string | null
        }
        Update: {
          art_style?: string | null
          awards?: string | null
          behance_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dribbble_url?: string | null
          education?: string | null
          email?: string | null
          exhibitions?: string | null
          facebook_url?: string | null
          full_biography?: string | null
          gender?: string | null
          id?: string
          image_url?: string | null
          instagram_url?: string | null
          linkedin_url?: string | null
          medium_used?: string | null
          name?: string
          phone?: string | null
          pinterest_url?: string | null
          real_name?: string | null
          specialty?: string | null
          tags?: string[] | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string | null
          verification_status?: string
          verified?: boolean
          website_url?: string | null
          years_active?: number | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      artwork_requests: {
        Row: {
          budget: number | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          reference_image_urls: string[] | null
          sketch_url: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reference_image_urls?: string[] | null
          sketch_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          reference_image_urls?: string[] | null
          sketch_url?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artworks: {
        Row: {
          additional_images: string[] | null
          artist_id: string | null
          availability_status: string
          available: boolean
          category: string | null
          certificate_url: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          image_url: string | null
          inspiration: string | null
          likes_count: number
          medium: string | null
          price: number
          shares_count: number
          title: string
          updated_at: string
          views_count: number
          year: number | null
        }
        Insert: {
          additional_images?: string[] | null
          artist_id?: string | null
          availability_status?: string
          available?: boolean
          category?: string | null
          certificate_url?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string | null
          inspiration?: string | null
          likes_count?: number
          medium?: string | null
          price?: number
          shares_count?: number
          title: string
          updated_at?: string
          views_count?: number
          year?: number | null
        }
        Update: {
          additional_images?: string[] | null
          artist_id?: string | null
          availability_status?: string
          available?: boolean
          category?: string | null
          certificate_url?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string | null
          inspiration?: string | null
          likes_count?: number
          medium?: string | null
          price?: number
          shares_count?: number
          title?: string
          updated_at?: string
          views_count?: number
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artworks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          artwork_id: string
          bid_count: number
          created_at: string
          current_bid: number
          ends_at: string
          id: string
          reserve_price: number | null
          seller_id: string
          starting_price: number
          starts_at: string
          status: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          artwork_id: string
          bid_count?: number
          created_at?: string
          current_bid?: number
          ends_at: string
          id?: string
          reserve_price?: number | null
          seller_id: string
          starting_price?: number
          starts_at: string
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          artwork_id?: string
          bid_count?: number
          created_at?: string
          current_bid?: number
          ends_at?: string
          id?: string
          reserve_price?: number | null
          seller_id?: string
          starting_price?: number
          starts_at?: string
          status?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at: string
          id: string
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at?: string
          id?: string
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          category: string
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          likes_count: number
          published: boolean
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          views_count: number
        }
        Insert: {
          author_id: string
          category?: string
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          likes_count?: number
          published?: boolean
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          views_count?: number
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          likes_count?: number
          published?: boolean
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          artwork_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tags: string[] | null
          total_spent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          total_spent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          artwork_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artwork_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          artwork_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          client_id: string | null
          created_at: string
          email: string | null
          event_id: string
          id: string
          name: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          name?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          name?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          artwork_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_artists: {
        Row: {
          artist_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          month: number
          title: string
          year: number
        }
        Insert: {
          artist_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          month: number
          title?: string
          year: number
        }
        Update: {
          artist_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          month?: number
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "featured_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      followers: {
        Row: {
          artist_id: string
          created_at: string
          follower_id: string
          id: string
        }
        Insert: {
          artist_id: string
          created_at?: string
          follower_id: string
          id?: string
        }
        Update: {
          artist_id?: string
          created_at?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followers_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_events: {
        Row: {
          capacity: number | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          location: string | null
          published: boolean
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          published?: boolean
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          location?: string | null
          published?: boolean
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          artwork_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat_messages: {
        Row: {
          created_at: string
          hidden: boolean
          hidden_at: string | null
          hidden_by: string | null
          id: string
          message: string
          stream_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          message: string
          stream_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden?: boolean
          hidden_at?: string | null
          hidden_by?: string | null
          id?: string
          message?: string
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_moderation_events: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json
          reason: string | null
          stream_id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          stream_id: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string | null
          stream_id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      live_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reported_user_id: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          stream_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reported_user_id: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          stream_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reported_user_id?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          stream_id?: string
        }
        Relationships: []
      }
      live_stream_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          link_url: string | null
          stream_id: string
          user_id: string
          views_count: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          stream_id: string
          user_id: string
          views_count?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          stream_id?: string
          user_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_posts_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_viewers: {
        Row: {
          display_name: string | null
          id: string
          joined_at: string
          left_at: string | null
          stream_id: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          stream_id: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          stream_id?: string
          user_id?: string
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          started_at: string
          status: string
          title: string
          viewer_count: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          started_at?: string
          status?: string
          title: string
          viewer_count?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          started_at?: string
          status?: string
          title?: string
          viewer_count?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          artwork_id: string | null
          content: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string
          sender_id: string
          subject: string | null
        }
        Insert: {
          artwork_id?: string | null
          content: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id: string
          sender_id: string
          subject?: string | null
        }
        Update: {
          artwork_id?: string | null
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link_url: string | null
          metadata: Json
          read: boolean
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link_url?: string | null
          metadata?: Json
          read?: boolean
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link_url?: string | null
          metadata?: Json
          read?: boolean
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      paystack_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          email: string | null
          id: string
          metadata: Json | null
          paystack_response: Json | null
          reference: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          paystack_response?: Json | null
          reference: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          paystack_response?: Json | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          artwork_id: string
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount: number
          artwork_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_method: string
          sale_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          artwork_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          sale_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          artwork_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          sale_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_artist_followers: {
        Args: { _artist_id: string; _limit?: number; _offset?: number }
        Returns: {
          avatar_url: string
          display_name: string
          email: string
          followed_at: string
          follower_id: string
          total_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_views: { Args: { _post_id: string }; Returns: undefined }
      is_staff_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "staff"],
    },
  },
} as const
