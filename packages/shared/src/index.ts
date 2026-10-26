import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export * from '../flags';
export * from '../i18n';
export * from './retention';

export const AUTH_POLICY = {
  otpExpirySeconds: 300,
  resendCooldownSeconds: 60,
  recoveryExpirySeconds: 3600,
} as const;

export const ROLES = [
  'user',
  'moderator',
  'business_owner',
  'employer',
  'administrator',
  'rider',
] as const;
export type Role = (typeof ROLES)[number];
export const MOBILE_IAP_ENABLED = false as const;
export type PrivacySettings = {
  profile_visible: boolean;
  show_city: boolean;
  allow_messages: boolean;
};
export type Profile = {
  id: string;
  display_name: string | null;
  biography: string | null;
  profile_photo_url: string | null;
  country: string | null;
  city: string | null;
  preferred_language: string;
  privacy_settings: PrivacySettings;
  created_at: string;
  updated_at: string;
};
export type CommunityVisibility = 'public' | 'private';
export type CommunityType = 'language' | 'culture' | 'location' | 'interest' | 'profession';
export type CommunityRole = 'owner' | 'admin' | 'member';
export type MembershipStatus = 'pending' | 'active' | 'blocked';
export type BusinessVerificationStatus = 'pending' | 'verified' | 'rejected';
export type DeliveryMethod = 'delivery' | 'collection';
export type SponsorshipStatus =
  'employer_declared' | 'independently_checked' | 'not_offered' | 'unknown';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'temporary' | 'internship';
export type ListingStatus = 'draft' | 'published' | 'removed' | 'expired';
export type ApplicationStatus =
  'submitted' | 'reviewing' | 'shortlisted' | 'rejected' | 'withdrawn' | 'hired';
export type RequestStatus = 'new' | 'reviewing' | 'accepted' | 'declined' | 'cancelled';
export type PaymentProvider = 'stripe' | 'razorpay';
export type PaymentStatus =
  'created' | 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';
export type PaymentPurpose = 'physical_order' | 'service_request' | 'promotion';
export type PromotionType =
  'featured_business' | 'promoted_product' | 'sponsored_post' | 'featured_job';
export type PromotionStatus =
  'draft' | 'pending_payment' | 'active' | 'expired' | 'cancelled' | 'rejected';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>> & { id: string };
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
        Relationships: [];
      };
      user_roles: {
        Row: { user_id: string; role: Role; created_at: string };
        Insert: { user_id: string; role: Role };
        Update: never;
        Relationships: [];
      };
      communities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          community_type: CommunityType;
          visibility: CommunityVisibility;
          country: string | null;
          city: string | null;
          language_code: string | null;
          cover_photo_path: string | null;
          created_by: string;
          is_sample: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Omit<
            Database['public']['Tables']['communities']['Row'],
            'id' | 'created_at' | 'updated_at'
          >
        > & {
          name: string;
          slug: string;
          community_type: CommunityType;
          visibility: CommunityVisibility;
          created_by: string;
        };
        Update: Partial<
          Omit<
            Database['public']['Tables']['communities']['Row'],
            'id' | 'created_at' | 'updated_at'
          >
        >;
        Relationships: [];
      };
      community_memberships: {
        Row: {
          community_id: string;
          user_id: string;
          role: CommunityRole;
          status: MembershipStatus;
          joined_at: string;
          updated_at: string;
        };
        Insert: {
          community_id: string;
          user_id: string;
          role?: CommunityRole;
          status?: MembershipStatus;
        };
        Update: Partial<
          Pick<Database['public']['Tables']['community_memberships']['Row'], 'role' | 'status'>
        >;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          community_id: string;
          author_id: string;
          body: string;
          is_announcement: boolean;
          is_sample: boolean;
          created_at: string;
          updated_at: string;
          removed_at: string | null;
          removed_by: string | null;
          removed_reason: string | null;
        };
        Insert: {
          community_id: string;
          author_id: string;
          body: string;
          is_announcement?: boolean;
          is_sample?: boolean;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['posts']['Row'],
            'body' | 'is_announcement' | 'removed_at' | 'removed_by' | 'removed_reason'
          >
        >;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          parent_id: string | null;
          author_id: string;
          body: string;
          created_at: string;
          updated_at: string;
          removed_at: string | null;
          removed_by: string | null;
          removed_reason: string | null;
        };
        Insert: { post_id: string; parent_id?: string | null; author_id: string; body: string };
        Update: Partial<
          Pick<
            Database['public']['Tables']['comments']['Row'],
            'body' | 'removed_at' | 'removed_by' | 'removed_reason'
          >
        >;
        Relationships: [];
      };
      post_media: {
        Row: {
          id: string;
          post_id: string;
          uploader_id: string;
          storage_path: string;
          mime_type: string;
          created_at: string;
        };
        Insert: { post_id: string; uploader_id: string; storage_path: string; mime_type: string };
        Update: never;
        Relationships: [];
      };
      hashtags: {
        Row: { id: string; tag: string; created_at: string };
        Insert: { tag: string };
        Update: never;
        Relationships: [];
      };
      post_hashtags: {
        Row: { post_id: string; hashtag_id: string };
        Insert: { post_id: string; hashtag_id: string };
        Update: never;
        Relationships: [];
      };
      post_likes: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string };
        Update: never;
        Relationships: [];
      };
      saved_posts: {
        Row: { post_id: string; user_id: string; created_at: string };
        Insert: { post_id: string; user_id: string };
        Update: never;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          post_id: string | null;
          comment_id: string | null;
          reported_user_id: string | null;
          reason: string;
          details: string | null;
          status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          reporter_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          reported_user_id?: string | null;
          reason: string;
          details?: string | null;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['reports']['Row'],
            'status' | 'resolved_at' | 'resolved_by'
          >
        >;
        Relationships: [];
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string };
        Update: never;
        Relationships: [];
      };
      user_safety_controls: {
        Row: {
          user_id: string;
          status: 'active' | 'blocked' | 'blacklisted';
          reason: string;
          expires_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          status?: 'active' | 'blocked' | 'blacklisted';
          reason: string;
          expires_at?: string | null;
          created_by: string;
        };
        Update: Partial<Database['public']['Tables']['user_safety_controls']['Row']>;
        Relationships: [];
      };
      moderation_audit_log: {
        Row: {
          id: string;
          actor_id: string;
          action: string;
          post_id: string | null;
          comment_id: string | null;
          report_id: string | null;
          target_user_id: string | null;
          role: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          actor_id: string;
          action: string;
          post_id?: string | null;
          comment_id?: string | null;
          report_id?: string | null;
          target_user_id?: string | null;
          role?: string | null;
          reason?: string | null;
        };
        Update: never;
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          category: string;
          description: string | null;
          logo_path: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          contact_preferences: Record<string, boolean>;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          region: string | null;
          country: string | null;
          postcode: string | null;
          opening_hours: Record<string, unknown>;
          verification_status: BusinessVerificationStatus;
          is_published: boolean;
          is_sample: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Omit<
            Database['public']['Tables']['businesses']['Row'],
            'id' | 'created_at' | 'updated_at'
          >
        > & { owner_id: string; name: string; slug: string; category: string };
        Update: Partial<
          Omit<
            Database['public']['Tables']['businesses']['Row'],
            'id' | 'owner_id' | 'created_at' | 'updated_at'
          >
        >;
        Relationships: [];
      };
      business_images: {
        Row: {
          id: string;
          business_id: string;
          uploaded_by: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          business_id: string;
          uploaded_by: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          sort_order?: number;
        };
        Update: Partial<Pick<Database['public']['Tables']['business_images']['Row'], 'sort_order'>>;
        Relationships: [];
      };
      product_categories: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          slug: string;
          sort_order: number;
          created_at: string;
        };
        Insert: { business_id: string; name: string; slug: string; sort_order?: number };
        Update: Partial<
          Pick<
            Database['public']['Tables']['product_categories']['Row'],
            'name' | 'slug' | 'sort_order'
          >
        >;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          catalog_product_id: string | null;
          category_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          currency: string;
          unit: string;
          stock_quantity: number;
          availability: boolean;
          discount_percentage: number;
          is_sample: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>
        > & {
          business_id: string;
          name: string;
          slug: string;
          price: number;
          currency: string;
          unit: string;
        };
        Update: Partial<
          Omit<
            Database['public']['Tables']['products']['Row'],
            'id' | 'business_id' | 'created_at' | 'updated_at'
          >
        >;
        Relationships: [];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          uploaded_by: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          product_id: string;
          uploaded_by: string;
          storage_path: string;
          mime_type: string;
          size_bytes: number;
          sort_order?: number;
        };
        Update: Partial<Pick<Database['public']['Tables']['product_images']['Row'], 'sort_order'>>;
        Relationships: [];
      };
      product_catalog: {
        Row: {
          id: string;
          name: string;
          slug: string;
          category: string;
          default_unit: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['product_catalog']['Row'], 'id' | 'created_at'>;
        Update: Partial<
          Pick<
            Database['public']['Tables']['product_catalog']['Row'],
            'name' | 'slug' | 'category' | 'default_unit' | 'is_active'
          >
        >;
        Relationships: [];
      };
      delivery_configs: {
        Row: {
          id: string;
          business_id: string;
          delivery_enabled: boolean;
          collection_available: boolean;
          delivery_charge: number;
          minimum_order_value: number;
          currency: string;
          estimated_min_minutes: number;
          estimated_max_minutes: number;
          opening_hours: Record<string, unknown>;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['delivery_configs']['Row'],
          'id' | 'updated_at'
        > & { business_id: string };
        Update: Partial<
          Omit<
            Database['public']['Tables']['delivery_configs']['Row'],
            'id' | 'business_id' | 'updated_at'
          >
        >;
        Relationships: [];
      };
      delivery_areas: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          supported_postcodes: string[];
          delivery_charge: number;
          minimum_order_value: number;
          available_time_slots: Record<string, unknown>[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Omit<
            Database['public']['Tables']['delivery_areas']['Row'],
            'id' | 'created_at' | 'updated_at'
          >
        > & { business_id: string; name: string; supported_postcodes: string[] };
        Update: Partial<
          Omit<
            Database['public']['Tables']['delivery_areas']['Row'],
            'id' | 'business_id' | 'created_at' | 'updated_at'
          >
        >;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          buyer_id: string;
          business_id: string;
          status: 'draft' | 'pending_payment' | 'paid' | 'cancelled';
          total: number;
          currency: string;
          delivery_method: DeliveryMethod | null;
          delivery_address: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          buyer_id: string;
          business_id: string;
          status?: 'draft' | 'pending_payment' | 'paid' | 'cancelled';
          total: number;
          currency: string;
          delivery_method?: DeliveryMethod | null;
          delivery_address?: Record<string, unknown> | null;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['orders']['Row'],
            'status' | 'delivery_method' | 'delivery_address'
          >
        >;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: { order_id: string; product_id: string; quantity: number; unit_price: number };
        Update: never;
        Relationships: [];
      };
      employer_profiles: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          website: string | null;
          contact_email: string | null;
          city: string | null;
          country: string | null;
          verification_status: 'pending' | 'verified' | 'rejected';
          is_sample: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          name: string;
          description?: string | null;
          website?: string | null;
          contact_email?: string | null;
          city?: string | null;
          country?: string | null;
          is_sample?: boolean;
        };
        Update: Partial<
          Omit<
            Database['public']['Tables']['employer_profiles']['Row'],
            'id' | 'owner_id' | 'created_at' | 'updated_at' | 'verification_status'
          >
        >;
        Relationships: [];
      };
      job_listings: {
        Row: {
          id: string;
          employer_id: string;
          title: string;
          description: string;
          job_type: JobType;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string;
          location: string | null;
          is_remote: boolean;
          workplace_type: 'remote' | 'hybrid' | 'on_site';
          application_deadline: string | null;
          sponsorship_status: SponsorshipStatus;
          sponsorship_source: string | null;
          sponsorship_checked_at: string | null;
          status: ListingStatus;
          is_sample: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          employer_id: string;
          title: string;
          description: string;
          job_type: JobType;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          location?: string | null;
          is_remote?: boolean;
          workplace_type?: 'remote' | 'hybrid' | 'on_site';
          application_deadline?: string | null;
          sponsorship_status?: SponsorshipStatus;
          sponsorship_source?: string | null;
          sponsorship_checked_at?: string | null;
          status?: ListingStatus;
          is_sample?: boolean;
        };
        Update: Partial<
          Omit<
            Database['public']['Tables']['job_listings']['Row'],
            'id' | 'employer_id' | 'created_at' | 'updated_at'
          >
        >;
        Relationships: [];
      };
      cv_documents: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
        };
        Update: never;
        Relationships: [];
      };
      job_applications: {
        Row: {
          id: string;
          job_id: string;
          applicant_id: string;
          cv_document_id: string | null;
          cover_note: string | null;
          status: ApplicationStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          job_id: string;
          applicant_id: string;
          cv_document_id?: string | null;
          cover_note?: string | null;
        };
        Update: Partial<
          Pick<Database['public']['Tables']['job_applications']['Row'], 'status' | 'cover_note'>
        >;
        Relationships: [];
      };
      saved_jobs: {
        Row: {
          user_id: string;
          job_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          job_id: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          category: string;
          description: string;
          pricing: string | null;
          service_areas: string[];
          availability: Record<string, unknown>;
          images: string[];
          status: ListingStatus;
          is_sample: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          name: string;
          category: string;
          description: string;
          pricing?: string | null;
          service_areas?: string[];
          availability?: Record<string, unknown>;
          images?: string[];
          status?: ListingStatus;
          is_sample?: boolean;
        };
        Update: Partial<
          Omit<
            Database['public']['Tables']['services']['Row'],
            'id' | 'owner_id' | 'created_at' | 'updated_at'
          >
        >;
        Relationships: [];
      };
      service_requests: {
        Row: {
          id: string;
          service_id: string;
          requester_id: string;
          message: string;
          requested_at: string | null;
          quoted_price_minor: number | null;
          quoted_currency: string | null;
          status: RequestStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          service_id: string;
          requester_id: string;
          message: string;
          requested_at?: string | null;
          quoted_price_minor?: number | null;
          quoted_currency?: string | null;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['service_requests']['Row'],
            'status' | 'quoted_price_minor' | 'quoted_currency'
          >
        >;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organizer_id: string;
          title: string;
          description: string;
          venue_name: string | null;
          venue_address: string | null;
          online_url: string | null;
          starts_at: string;
          ends_at: string;
          capacity: number | null;
          status: ListingStatus;
          is_free: boolean;
          is_sample: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organizer_id: string;
          title: string;
          description: string;
          venue_name?: string | null;
          venue_address?: string | null;
          online_url?: string | null;
          starts_at: string;
          ends_at: string;
          capacity?: number | null;
          status?: ListingStatus;
          is_free?: boolean;
          is_sample?: boolean;
        };
        Update: Partial<
          Omit<
            Database['public']['Tables']['events']['Row'],
            'id' | 'organizer_id' | 'created_at' | 'updated_at'
          >
        >;
        Relationships: [];
      };
      event_registrations: {
        Row: { event_id: string; user_id: string; created_at: string };
        Insert: { event_id: string; user_id: string };
        Update: never;
        Relationships: [];
      };
      payment_accounts: {
        Row: {
          id: string;
          owner_id: string;
          country: 'GB' | 'IN';
          provider: PaymentProvider;
          mode: 'test' | 'live';
          approval_status: 'pending' | 'approved' | 'rejected';
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          country: 'GB' | 'IN';
          provider: PaymentProvider;
          mode?: 'test' | 'live';
          approval_status?: 'pending' | 'approved' | 'rejected';
          is_enabled?: boolean;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['payment_accounts']['Row'],
            'approval_status' | 'is_enabled'
          >
        >;
        Relationships: [];
      };
      payment_transactions: {
        Row: {
          id: string;
          payer_id: string | null;
          provider: PaymentProvider;
          provider_payment_id: string | null;
          provider_order_id: string | null;
          purpose: PaymentPurpose;
          reference_id: string;
          amount_minor: number;
          currency: string;
          status: PaymentStatus;
          idempotency_key: string;
          failure_code: string | null;
          failure_message: string | null;
          refund_amount_minor: number;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          payer_id: string;
          provider: PaymentProvider;
          provider_payment_id?: string | null;
          provider_order_id?: string | null;
          purpose: PaymentPurpose;
          reference_id: string;
          amount_minor: number;
          currency: string;
          status?: PaymentStatus;
          idempotency_key: string;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['payment_transactions']['Row'],
            | 'provider_payment_id'
            | 'status'
            | 'failure_code'
            | 'failure_message'
            | 'refund_amount_minor'
            | 'metadata'
          >
        >;
        Relationships: [];
      };
      payment_webhook_events: {
        Row: {
          id: string;
          provider: PaymentProvider;
          provider_event_id: string;
          event_type: string;
          transaction_id: string | null;
          payload_hash: string;
          received_at: string;
        };
        Insert: {
          provider: PaymentProvider;
          provider_event_id: string;
          event_type: string;
          transaction_id?: string | null;
          payload_hash: string;
        };
        Update: never;
        Relationships: [];
      };
      payment_events: {
        Row: {
          id: string;
          provider: PaymentProvider;
          provider_event_id: string;
          event_type: string | null;
          received_at: string;
          processed_at: string | null;
          status: 'received' | 'processed' | 'failed' | 'ignored';
          attempts: number;
          last_error: string | null;
          payload: Record<string, unknown>;
        };
        Insert: {
          provider: PaymentProvider;
          provider_event_id: string;
          event_type?: string | null;
          processed_at?: string | null;
          status?: 'received' | 'processed' | 'failed' | 'ignored';
          attempts?: number;
          last_error?: string | null;
          payload: Record<string, unknown>;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['payment_events']['Row'],
            'event_type' | 'processed_at' | 'status' | 'attempts' | 'last_error' | 'payload'
          >
        >;
        Relationships: [];
      };
      deletion_requests: {
        Row: {
          id: string;
          user_id: string;
          requested_at: string;
          status: 'queued' | 'processing' | 'completed' | 'failed';
          attempts: number;
          last_error: string | null;
          completed_at: string | null;
        };
        Insert: { user_id: string; status?: 'queued' | 'processing' | 'completed' | 'failed' };
        Update: Partial<
          Pick<
            Database['public']['Tables']['deletion_requests']['Row'],
            'status' | 'attempts' | 'last_error' | 'completed_at'
          >
        >;
        Relationships: [];
      };
      outbox_messages: {
        Row: {
          id: string;
          channel: 'email' | 'sms';
          template: string;
          recipient: string;
          payload: Record<string, unknown>;
          status: 'pending' | 'sent' | 'failed' | 'dead';
          attempts: number;
          next_attempt_at: string;
          last_error: string | null;
          created_at: string;
          sent_at: string | null;
          dedupe_key: string | null;
        };
        Insert: {
          channel: 'email' | 'sms';
          template: string;
          recipient: string;
          payload: Record<string, unknown>;
          status?: 'pending' | 'sent' | 'failed' | 'dead';
          attempts?: number;
          next_attempt_at?: string;
          last_error?: string | null;
          sent_at?: string | null;
          dedupe_key?: string | null;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['outbox_messages']['Row'],
            'status' | 'attempts' | 'next_attempt_at' | 'last_error' | 'sent_at'
          >
        >;
        Relationships: [];
      };
      stock_reservations: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          status: 'held' | 'committed' | 'released' | 'expired';
          expires_at: string;
          created_at: string;
        };
        Insert: {
          order_id: string;
          product_id: string;
          quantity: number;
          status?: 'held' | 'committed' | 'released' | 'expired';
          expires_at: string;
          created_at?: string;
        };
        Update: Partial<
          Pick<Database['public']['Tables']['stock_reservations']['Row'], 'status' | 'expires_at'>
        >;
        Relationships: [];
      };
      promotion_packages: {
        Row: {
          id: string;
          name: string;
          promotion_type: PromotionType;
          description: string;
          price_minor: number;
          currency: string;
          duration_days: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          promotion_type: PromotionType;
          description: string;
          price_minor: number;
          currency: string;
          duration_days: number;
          is_active?: boolean;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['promotion_packages']['Row'],
            'name' | 'description' | 'price_minor' | 'currency' | 'duration_days' | 'is_active'
          >
        >;
        Relationships: [];
      };
      promotions: {
        Row: {
          id: string;
          purchaser_id: string;
          package_id: string;
          target_type: PromotionType;
          target_id: string;
          price_minor: number;
          currency: string;
          starts_at: string;
          expires_at: string;
          approval_status: 'pending' | 'approved' | 'rejected';
          entitlement_status: PromotionStatus;
          transaction_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          purchaser_id: string;
          package_id: string;
          target_type: PromotionType;
          target_id: string;
          price_minor: number;
          currency: string;
          starts_at: string;
          expires_at: string;
          approval_status?: 'pending' | 'approved' | 'rejected';
          entitlement_status?: PromotionStatus;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['promotions']['Row'],
            'approval_status' | 'entitlement_status' | 'transaction_id' | 'starts_at' | 'expires_at'
          >
        >;
        Relationships: [];
      };
      delivery_runs: {
        Row: {
          id: string;
          customer_id: string;
          rider_id: string | null;
          status:
            'pending' | 'assigned' | 'collecting' | 'out_for_delivery' | 'delivered' | 'cancelled';
          delivery_address: Record<string, unknown>;
          assigned_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['delivery_runs']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { customer_id: string; delivery_address: Record<string, unknown> };
        Update: Partial<
          Pick<
            Database['public']['Tables']['delivery_runs']['Row'],
            'rider_id' | 'status' | 'delivery_address' | 'assigned_at' | 'delivered_at'
          >
        >;
        Relationships: [];
      };
      delivery_run_stops: {
        Row: {
          id: string;
          run_id: string;
          business_id: string;
          order_id: string;
          stop_order: number;
          status: 'pending' | 'arrived' | 'picked_up' | 'cancelled';
          picked_up_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['delivery_run_stops']['Row'], 'id'>;
        Update: Partial<
          Pick<Database['public']['Tables']['delivery_run_stops']['Row'], 'status' | 'picked_up_at'>
        >;
        Relationships: [];
      };
      delivery_proofs: {
        Row: {
          id: string;
          run_id: string;
          stop_id: string | null;
          captured_by: string;
          proof_type: 'pickup_selfie' | 'pickup_items' | 'delivery_selfie';
          storage_path: string;
          latitude: number | null;
          longitude: number | null;
          captured_at: string;
        };
        Insert: Omit<Database['public']['Tables']['delivery_proofs']['Row'], 'id' | 'captured_at'>;
        Update: never;
        Relationships: [];
      };
      feature_flags: {
        Row: {
          key: string;
          enabled: boolean;
          description: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['feature_flags']['Row'], 'updated_at'>;
        Update: Partial<
          Pick<
            Database['public']['Tables']['feature_flags']['Row'],
            'enabled' | 'description' | 'updated_by'
          >
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_user_restricted: { Args: { target_user: string }; Returns: boolean };
      process_payment_event: {
        Args: {
          p_provider: PaymentProvider;
          p_provider_event_id: string;
          p_event_type: string;
          p_provider_payment_id: string | null;
          p_provider_order_id: string | null;
          p_payload: Record<string, unknown>;
        };
        Returns: { outcome: string; duplicate: boolean; transaction_found: boolean }[];
      };
      reserve_stock_for_order: {
        Args: { p_order_id: string; p_ttl_seconds?: number };
        Returns: { product_id: string; quantity: number; expires_at: string }[];
      };
      commit_stock_reservations: {
        Args: { p_order_id: string };
        Returns: number;
      };
      reserve_stock_item: {
        Args: {
          p_order_id: string;
          p_product_id: string;
          p_quantity: number;
          p_ttl?: string;
        };
        Returns: string;
      };
      release_stock_reservation: {
        Args: { p_reservation_id: string };
        Returns: boolean;
      };
      commit_stock_reservation: {
        Args: { p_reservation_id: string };
        Returns: boolean;
      };
      expire_stock_reservations: {
        Args: { p_limit?: number };
        Returns: number;
      };
      claim_deletion_request: {
        Args: { p_lease?: string };
        Returns: { id: string; user_id: string; status: 'processing'; attempts: number }[];
      };
      approve_community_membership: {
        Args: { p_community_id: string; p_user_id: string };
        Returns: Record<string, unknown>;
      };
      claim_outbox_messages: {
        Args: { p_limit?: number; p_lease?: string };
        Returns: Database['public']['Tables']['outbox_messages']['Row'][];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type SupabaseConfig = { url: string; anonKey: string; headers?: Record<string, string> };

export * from './batch2-policy';

export function getSupabaseConfig(env: Record<string, string | undefined>): SupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.anonKey, {
    global: config.headers ? { headers: config.headers } : undefined,
  });
}

export function getCooldownRemaining(lastSentAt: number, now = Date.now()): number {
  const elapsed = Math.floor((now - lastSentAt) / 1000);
  return Math.max(0, AUTH_POLICY.resendCooldownSeconds - elapsed);
}

export function isOtpExpired(sentAt: number, now = Date.now()): boolean {
  return now - sentAt >= AUTH_POLICY.otpExpirySeconds * 1000;
}

export function canManageRole(actorRoles: readonly Role[], targetRole: Role): boolean {
  return (
    actorRoles.includes('administrator') ||
    (targetRole === 'moderator' && actorRoles.includes('moderator'))
  );
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type StructuredLogContext = {
  requestId?: string;
  userId?: string;
  route?: string;
  duration?: number;
  [key: string]: unknown;
};

const REDACTED = '[REDACTED]';
const sensitiveKeyPattern =
  /(token|secret|password|authorization|cookie|api[_-]?key|dsn|phone|email|key)/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /\bBearer\s+[A-Z0-9._~-]+/gi;
const phonePattern = /(?<!\w)\+?[\d][\d\s().-]{7,}\d(?!\w)/g;

export function hashIdentifier(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function redactLogValue(value: unknown, key = ''): unknown {
  if (sensitiveKeyPattern.test(key)) return REDACTED;
  if (typeof value === 'string')
    return value
      .replace(bearerPattern, 'Bearer [REDACTED]')
      .replace(emailPattern, REDACTED)
      .replace(phonePattern, REDACTED);
  if (Array.isArray(value)) return value.map((item) => redactLogValue(item));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactLogValue(entryValue, entryKey),
      ]),
    );
  return value;
}

export function createStructuredLogger(defaultContext: StructuredLogContext = {}) {
  function write(level: LogLevel, message: string, context: StructuredLogContext = {}) {
    const merged = redactLogValue({
      level,
      message,
      requestId: context.requestId ?? defaultContext.requestId ?? 'unknown',
      ...defaultContext,
      ...context,
    }) as Record<string, unknown>;
    if (typeof merged.userId === 'string') merged.userId = hashIdentifier(merged.userId);
    const line = JSON.stringify(merged);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }
  return {
    debug: (message: string, context?: StructuredLogContext) => write('debug', message, context),
    info: (message: string, context?: StructuredLogContext) => write('info', message, context),
    warn: (message: string, context?: StructuredLogContext) => write('warn', message, context),
    error: (message: string, context?: StructuredLogContext) => write('error', message, context),
  };
}

export const designTokens = {
  colors: {
    ink: '#183129',
    muted: '#73817B',
    primary: '#1D7958',
    surface: '#FBFDFA',
    mint: '#DFF3E8',
    border: '#E5EBE7',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 18 },
} as const;
