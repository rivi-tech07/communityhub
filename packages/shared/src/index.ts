import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const AUTH_POLICY = {
  otpExpirySeconds: 300,
  resendCooldownSeconds: 60,
  recoveryExpirySeconds: 3600,
} as const;

export const ROLES = ['user', 'moderator', 'business_owner', 'employer', 'administrator'] as const;
export type Role = (typeof ROLES)[number];
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
    };
    Views: Record<string, never>;
    Functions: {
      is_user_restricted: { Args: { target_user: string }; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type SupabaseConfig = { url: string; anonKey: string };

export function getSupabaseConfig(env: Record<string, string | undefined>): SupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function createSupabaseClient(config: SupabaseConfig): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.anonKey);
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
