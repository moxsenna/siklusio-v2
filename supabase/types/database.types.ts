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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_history: {
        Row: {
          created_at: string
          date_key: string
          id: string
          is_period: boolean | null
          symptoms: Json | null
          tasks: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_key: string
          id?: string
          is_period?: boolean | null
          symptoms?: Json | null
          tasks?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_key?: string
          id?: string
          is_period?: boolean | null
          symptoms?: Json | null
          tasks?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          affiliate_id: string
          amount_paid: number
          buyer_email: string
          buyer_name: string
          buyer_whatsapp: string
          checkout_session_id: string | null
          commission_amount: number
          created_at: string
          id: string
          mayar_transaction_id: string | null
          payout_at: string | null
          payout_marked_by: string | null
          payout_note: string | null
          payout_reference: string | null
          payout_status: string
        }
        Insert: {
          affiliate_id: string
          amount_paid: number
          buyer_email: string
          buyer_name: string
          buyer_whatsapp: string
          checkout_session_id?: string | null
          commission_amount: number
          created_at?: string
          id?: string
          mayar_transaction_id?: string | null
          payout_at?: string | null
          payout_marked_by?: string | null
          payout_note?: string | null
          payout_reference?: string | null
          payout_status?: string
        }
        Update: {
          affiliate_id?: string
          amount_paid?: number
          buyer_email?: string
          buyer_name?: string
          buyer_whatsapp?: string
          checkout_session_id?: string | null
          commission_amount?: number
          created_at?: string
          id?: string
          mayar_transaction_id?: string | null
          payout_at?: string | null
          payout_marked_by?: string | null
          payout_note?: string | null
          payout_reference?: string | null
          payout_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_conversions_checkout_session_id_fkey"
            columns: ["checkout_session_id"]
            isOneToOne: false
            referencedRelation: "checkout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          account_holder: string | null
          account_number: string | null
          allow_zero_order_commission: boolean
          bank_name: string | null
          code: string
          commission_type: string
          commission_value: number
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          whatsapp: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          allow_zero_order_commission?: boolean
          bank_name?: string | null
          code: string
          commission_type: string
          commission_value: number
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          whatsapp: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          allow_zero_order_commission?: boolean
          bank_name?: string | null
          code?: string
          commission_type?: string
          commission_value?: number
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          whatsapp?: string
        }
        Relationships: []
      }
      ai_credit_balances: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_balances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          feature: string
          id: string
          metadata: Json
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          feature: string
          id?: string
          metadata?: Json
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          feature?: string
          id?: string
          metadata?: Json
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_topups: {
        Row: {
          amount_rp: number
          created_at: string
          credits_amount: number
          id: string
          mayar_link: string | null
          mayar_transaction_id: string | null
          paid_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_rp: number
          created_at?: string
          credits_amount: number
          id?: string
          mayar_link?: string | null
          mayar_transaction_id?: string | null
          paid_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_rp?: number
          created_at?: string
          credits_amount?: number
          id?: string
          mayar_link?: string | null
          mayar_transaction_id?: string | null
          paid_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      checkout_sessions: {
        Row: {
          affiliate_code: string | null
          coupon_code: string | null
          created_at: string
          email: string
          final_amount: number
          id: string
          mayar_link: string | null
          mayar_transaction_id: string | null
          name: string
          paid_at: string | null
          status: string
          whatsapp: string
        }
        Insert: {
          affiliate_code?: string | null
          coupon_code?: string | null
          created_at?: string
          email: string
          final_amount?: number
          id?: string
          mayar_link?: string | null
          mayar_transaction_id?: string | null
          name: string
          paid_at?: string | null
          status?: string
          whatsapp: string
        }
        Update: {
          affiliate_code?: string | null
          coupon_code?: string | null
          created_at?: string
          email?: string
          final_amount?: number
          id?: string
          mayar_link?: string | null
          mayar_transaction_id?: string | null
          name?: string
          paid_at?: string | null
          status?: string
          whatsapp?: string
        }
        Relationships: []
      }
      community_comments: {
        Row: {
          admin_review_status: string | null
          admin_reviewed_at: string | null
          content: string
          created_at: string
          hidden_reason: string | null
          id: string
          is_anonymous: boolean
          is_hidden: boolean
          post_id: string
          report_count: number
          user_id: string
        }
        Insert: {
          admin_review_status?: string | null
          admin_reviewed_at?: string | null
          content: string
          created_at?: string
          hidden_reason?: string | null
          id?: string
          is_anonymous?: boolean
          is_hidden?: boolean
          post_id: string
          report_count?: number
          user_id: string
        }
        Update: {
          admin_review_status?: string | null
          admin_reviewed_at?: string | null
          content?: string
          created_at?: string
          hidden_reason?: string | null
          id?: string
          is_anonymous?: boolean
          is_hidden?: boolean
          post_id?: string
          report_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          admin_review_status: string | null
          admin_reviewed_at: string | null
          comment_count: number
          content: string
          created_at: string
          hidden_reason: string | null
          id: string
          is_anonymous: boolean
          is_hidden: boolean
          phase_tag: string | null
          reaction_count: number
          report_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_review_status?: string | null
          admin_reviewed_at?: string | null
          comment_count?: number
          content: string
          created_at?: string
          hidden_reason?: string | null
          id?: string
          is_anonymous?: boolean
          is_hidden?: boolean
          phase_tag?: string | null
          reaction_count?: number
          report_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_review_status?: string | null
          admin_reviewed_at?: string | null
          comment_count?: number
          content?: string
          created_at?: string
          hidden_reason?: string | null
          id?: string
          is_anonymous?: boolean
          is_hidden?: boolean
          phase_tag?: string | null
          reaction_count?: number
          report_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string
          resolved_at: string | null
          resolver_id: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id: string
          resolved_at?: string | null
          resolver_id?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string
          resolved_at?: string | null
          resolver_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reports_resolver_id_fkey"
            columns: ["resolver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      cycle_guides: {
        Row: {
          ai_model: string
          created_at: string
          credit_cost: number
          cycle_snapshot: Json
          generated_for_date: string
          guide_level: string
          habit_snapshot: Json
          id: string
          result: Json
          status: string
          user_id: string
        }
        Insert: {
          ai_model: string
          created_at?: string
          credit_cost: number
          cycle_snapshot?: Json
          generated_for_date: string
          guide_level: string
          habit_snapshot?: Json
          id?: string
          result: Json
          status?: string
          user_id: string
        }
        Update: {
          ai_model?: string
          created_at?: string
          credit_cost?: number
          cycle_snapshot?: Json
          generated_for_date?: string
          guide_level?: string
          habit_snapshot?: Json
          id?: string
          result?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_guides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_coach_plan_days: {
        Row: {
          created_at: string
          date_key: string
          day_index: number
          focus: string
          id: string
          plan_id: string
          tasks: Json
        }
        Insert: {
          created_at?: string
          date_key: string
          day_index: number
          focus: string
          id?: string
          plan_id: string
          tasks: Json
        }
        Update: {
          created_at?: string
          date_key?: string
          day_index?: number
          focus?: string
          id?: string
          plan_id?: string
          tasks?: Json
        }
        Relationships: [
          {
            foreignKeyName: "habit_coach_plan_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "habit_coach_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_coach_plans: {
        Row: {
          ai_model: string
          coach_summary: string
          created_at: string
          credit_cost: number
          cycle_snapshot: Json
          id: string
          mode: string
          previous_summary: Json
          status: string
          updated_at: string
          user_constraints: Json
          user_goal: string
          user_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          ai_model: string
          coach_summary: string
          created_at?: string
          credit_cost: number
          cycle_snapshot?: Json
          id?: string
          mode: string
          previous_summary?: Json
          status?: string
          updated_at?: string
          user_constraints?: Json
          user_goal: string
          user_id: string
          week_end: string
          week_start: string
        }
        Update: {
          ai_model?: string
          coach_summary?: string
          created_at?: string
          credit_cost?: number
          cycle_snapshot?: Json
          id?: string
          mode?: string
          previous_summary?: Json
          status?: string
          updated_at?: string
          user_constraints?: Json
          user_goal?: string
          user_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_coach_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_registrations: {
        Row: {
          affiliate_code: string | null
          coupon_code: string | null
          created_at: string
          email: string
          id: string
          name: string
          user_id: string
          whatsapp: string
        }
        Insert: {
          affiliate_code?: string | null
          coupon_code?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          user_id: string
          whatsapp: string
        }
        Update: {
          affiliate_code?: string | null
          coupon_code?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          user_id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_kind: string | null
          avatar_url: string | null
          birth_date: string | null
          children_count: string | null
          created_at: string
          current_saving: number | null
          cycle_length: number
          husband_name: string | null
          husband_nickname: string | null
          husband_number: string | null
          id: string
          is_admin: boolean
          last_period_date: string | null
          name: string | null
          nickname: string | null
          onboarding_completed: boolean
          period_length: number
          target_saving: number | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          avatar_kind?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          children_count?: string | null
          created_at?: string
          current_saving?: number | null
          cycle_length?: number
          husband_name?: string | null
          husband_nickname?: string | null
          husband_number?: string | null
          id: string
          is_admin?: boolean
          last_period_date?: string | null
          name?: string | null
          nickname?: string | null
          onboarding_completed?: boolean
          period_length?: number
          target_saving?: number | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          avatar_kind?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          children_count?: string | null
          created_at?: string
          current_saving?: number | null
          cycle_length?: number
          husband_name?: string | null
          husband_nickname?: string | null
          husband_number?: string | null
          id?: string
          is_admin?: boolean
          last_period_date?: string | null
          name?: string | null
          nickname?: string | null
          onboarding_completed?: boolean
          period_length?: number
          target_saving?: number | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      recipe_generations: {
        Row: {
          ai_model: string
          created_at: string
          credit_cost: number
          cycle_day: number | null
          cycle_snapshot: Json
          days_to_next_period: number | null
          generated_for_date: string
          id: string
          phase: string
          result: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model: string
          created_at?: string
          credit_cost: number
          cycle_day?: number | null
          cycle_snapshot?: Json
          days_to_next_period?: number | null
          generated_for_date: string
          id?: string
          phase: string
          result: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string
          created_at?: string
          credit_cost?: number
          cycle_day?: number | null
          cycle_snapshot?: Json
          days_to_next_period?: number | null
          generated_for_date?: string
          id?: string
          phase?: string
          result?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_moderation_queue: {
        Args: { p_filter?: string }
        Returns: {
          author_avatar_kind: string
          author_avatar_url: string
          author_email: string
          author_id: string
          author_label: string
          author_real_label: string
          content: string
          is_anonymous: boolean
          is_hidden: boolean
          reason: string
          report_count: number
          report_created_at: string
          report_id: string
          report_status: string
          reporter_email: string
          reporter_id: string
          reporter_name: string
          reporter_nickname: string
          resolved_at: string
          review_status: string
          reviewed_at: string
          target_created_at: string
          target_id: string
          target_type: string
        }[]
      }
      admin_moderate_target: {
        Args: { p_action: string; p_target_id: string; p_target_type: string }
        Returns: undefined
      }
      admin_reset_user_avatar: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      charge_ai_credits: {
        Args: {
          p_amount: number
          p_feature: string
          p_metadata?: Json
          p_reason: string
          p_reference_id: string
          p_user_id: string
        }
        Returns: number
      }
      create_affiliate_with_coupon: {
        Args: {
          p_account_holder?: string
          p_account_number?: string
          p_auto_coupon?: boolean
          p_bank_name?: string
          p_code: string
          p_commission_type: string
          p_commission_value: number
          p_coupon_discount_type?: string
          p_coupon_discount_value?: number
          p_email: string
          p_name: string
          p_whatsapp: string
        }
        Returns: Json
      }
      ensure_ai_credit_balance: {
        Args: { p_user_id: string }
        Returns: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_credit_balances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_community_feed: {
        Args: { before?: string; page_size?: number }
        Returns: {
          avatar_url: string
          comment_count: number
          content: string
          created_at: string
          display_name: string
          id: string
          is_anonymous: boolean
          is_hidden: boolean
          is_own: boolean
          phase_tag: string
          reaction_count: number
        }[]
      }
      get_post_comments: {
        Args: { p_post_id: string }
        Returns: {
          avatar_url: string
          content: string
          created_at: string
          display_name: string
          hidden_reason: string
          id: string
          is_anonymous: boolean
          is_hidden: boolean
          is_own: boolean
          post_id: string
          report_count: number
        }[]
      }
      grant_ai_credits: {
        Args: {
          p_amount: number
          p_feature: string
          p_metadata?: Json
          p_reason: string
          p_reference_id?: string
          p_user_id: string
        }
        Returns: number
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      process_paid_ai_credit_topup: {
        Args: { p_mayar_transaction_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
