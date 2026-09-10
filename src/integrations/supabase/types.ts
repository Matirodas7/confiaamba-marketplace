export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      pro_details: {
        Row: {
          bio: string;
          categories: string[];
          certificates_url: string[];
          created_at: string;
          headline: string;
          hourly_rate: number;
          id_document_url: string | null;
          is_featured: boolean;
          is_premium: boolean;
          jobs_done: number;
          onboarding_complete: boolean;
          portfolio_urls: string[];
          pro_id: string;
          rating_avg: number;
          reviews_count: number;
          starting_price: number;
          updated_at: string;
          verification: Database["public"]["Enums"]["verification_status"];
          work_radius_km: number;
          years_experience: number;
          zones: Database["public"]["Enums"]["amba_zone"][];
        };
        Insert: {
          bio?: string;
          categories?: string[];
          certificates_url?: string[];
          created_at?: string;
          headline?: string;
          hourly_rate?: number;
          id_document_url?: string | null;
          is_featured?: boolean;
          is_premium?: boolean;
          jobs_done?: number;
          onboarding_complete?: boolean;
          portfolio_urls?: string[];
          pro_id: string;
          rating_avg?: number;
          reviews_count?: number;
          starting_price?: number;
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
          work_radius_km?: number;
          years_experience?: number;
          zones?: Database["public"]["Enums"]["amba_zone"][];
        };
        Update: {
          bio?: string;
          categories?: string[];
          certificates_url?: string[];
          created_at?: string;
          headline?: string;
          hourly_rate?: number;
          id_document_url?: string | null;
          is_featured?: boolean;
          is_premium?: boolean;
          jobs_done?: number;
          onboarding_complete?: boolean;
          portfolio_urls?: string[];
          pro_id?: string;
          rating_avg?: number;
          reviews_count?: number;
          starting_price?: number;
          updated_at?: string;
          verification?: Database["public"]["Enums"]["verification_status"];
          work_radius_km?: number;
          years_experience?: number;
          zones?: Database["public"]["Enums"]["amba_zone"][];
        };
        Relationships: [
          {
            foreignKeyName: "pro_details_pro_profile_fkey";
            columns: ["pro_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          apartment: string | null;
          avatar_url: string | null;
          created_at: string;
          dni: string | null;
          first_name: string | null;
          floor: string | null;
          full_name: string;
          id: string;
          id_document_url: string | null;
          is_blocked: boolean;
          last_name: string | null;
          location: string | null;
          phone: string | null;
          security_verified: boolean;
          selfie_url: string | null;
          street: string | null;
          street_number: string | null;
          updated_at: string;
          verification_status: Database["public"]["Enums"]["verification_status"];
          zone: Database["public"]["Enums"]["amba_zone"] | null;
        };
        Insert: {
          apartment?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          dni?: string | null;
          first_name?: string | null;
          floor?: string | null;
          full_name?: string;
          id: string;
          id_document_url?: string | null;
          is_blocked?: boolean;
          last_name?: string | null;
          location?: string | null;
          phone?: string | null;
          security_verified?: boolean;
          selfie_url?: string | null;
          street?: string | null;
          street_number?: string | null;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          zone?: Database["public"]["Enums"]["amba_zone"] | null;
        };
        Update: {
          apartment?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          dni?: string | null;
          first_name?: string | null;
          floor?: string | null;
          full_name?: string;
          id?: string;
          id_document_url?: string | null;
          is_blocked?: boolean;
          last_name?: string | null;
          location?: string | null;
          phone?: string | null;
          security_verified?: boolean;
          selfie_url?: string | null;
          street?: string | null;
          street_number?: string | null;
          updated_at?: string;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          zone?: Database["public"]["Enums"]["amba_zone"] | null;
        };
        Relationships: [];
      };
      quotes: {
        Row: {
          accepted: boolean;
          created_at: string;
          id: string;
          message: string;
          price_offered: number;
          pro_id: string;
          reject_reason: string | null;
          reject_reason_note: string | null;
          rejected: boolean;
          request_id: string;
          revision_note: string | null;
          revision_requested: boolean;
          scheduled_at: string | null;
          updated_at: string;
        };
        Insert: {
          accepted?: boolean;
          created_at?: string;
          id?: string;
          message?: string;
          price_offered: number;
          pro_id: string;
          reject_reason?: string | null;
          reject_reason_note?: string | null;
          rejected?: boolean;
          request_id: string;
          revision_note?: string | null;
          revision_requested?: boolean;
          scheduled_at?: string | null;
          updated_at?: string;
        };
        Update: {
          accepted?: boolean;
          created_at?: string;
          id?: string;
          message?: string;
          price_offered?: number;
          pro_id?: string;
          reject_reason?: string | null;
          reject_reason_note?: string | null;
          rejected?: boolean;
          request_id?: string;
          revision_note?: string | null;
          revision_requested?: boolean;
          scheduled_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_pro_profile_fkey";
            columns: ["pro_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          client_id: string;
          comment: string;
          created_at: string;
          id: string;
          is_hidden: boolean;
          pro_id: string;
          request_id: string | null;
          stars: number;
          tags: string[];
        };
        Insert: {
          client_id: string;
          comment?: string;
          created_at?: string;
          id?: string;
          is_hidden?: boolean;
          pro_id: string;
          request_id?: string | null;
          stars: number;
          tags?: string[];
        };
        Update: {
          client_id?: string;
          comment?: string;
          created_at?: string;
          id?: string;
          is_hidden?: boolean;
          pro_id?: string;
          request_id?: string | null;
          stars?: number;
          tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "reviews_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "service_requests";
            referencedColumns: ["id"];
          },
        ];
      };
      service_requests: {
        Row: {
          accepted_quote_id: string | null;
          address: string;
          budget_hint: string | null;
          category: string;
          client_id: string;
          created_at: string;
          description: string;
          id: string;
          is_paid: boolean;
          paid_at: string | null;
          cancel_reason: string | null;
          cancel_reason_note: string | null;
          decline_reason: string | null;
          decline_reason_note: string | null;
          declined_by_pro_id: string | null;
          dispute_admin_note: string | null;
          dispute_note: string | null;
          dispute_resolved: boolean;
          photos: string[];
          pro_marked_done_at: string | null;
          status: Database["public"]["Enums"]["request_status"];
          target_pro_id: string | null;
          updated_at: string;
          zone: Database["public"]["Enums"]["amba_zone"];
        };
        Insert: {
          accepted_quote_id?: string | null;
          address?: string;
          budget_hint?: string | null;
          category: string;
          client_id: string;
          created_at?: string;
          description: string;
          id?: string;
          is_paid?: boolean;
          paid_at?: string | null;
          cancel_reason?: string | null;
          cancel_reason_note?: string | null;
          decline_reason?: string | null;
          decline_reason_note?: string | null;
          declined_by_pro_id?: string | null;
          dispute_admin_note?: string | null;
          dispute_note?: string | null;
          dispute_resolved?: boolean;
          photos?: string[];
          pro_marked_done_at?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          target_pro_id?: string | null;
          updated_at?: string;
          zone: Database["public"]["Enums"]["amba_zone"];
        };
        Update: {
          accepted_quote_id?: string | null;
          address?: string;
          budget_hint?: string | null;
          category?: string;
          client_id?: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_paid?: boolean;
          paid_at?: string | null;
          cancel_reason?: string | null;
          cancel_reason_note?: string | null;
          decline_reason?: string | null;
          decline_reason_note?: string | null;
          declined_by_pro_id?: string | null;
          dispute_admin_note?: string | null;
          dispute_note?: string | null;
          dispute_resolved?: boolean;
          photos?: string[];
          pro_marked_done_at?: string | null;
          status?: Database["public"]["Enums"]["request_status"];
          target_pro_id?: string | null;
          updated_at?: string;
          zone?: Database["public"]["Enums"]["amba_zone"];
        };
        Relationships: [
          {
            foreignKeyName: "service_requests_client_profile_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "service_requests_target_pro_profile_fkey";
            columns: ["target_pro_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          image_url: string | null;
          pro_id: string;
          request_id: string;
          sender_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          pro_id: string;
          request_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          pro_id?: string;
          request_id?: string;
          sender_id?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          id: boolean;
          default_commission_percent: number;
          service_fee_flat: number;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          default_commission_percent?: number;
          service_fee_flat?: number;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          default_commission_percent?: number;
          service_fee_flat?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      category_commission_overrides: {
        Row: {
          category: string;
          commission_percent: number;
          updated_at: string;
        };
        Insert: {
          category: string;
          commission_percent: number;
          updated_at?: string;
        };
        Update: {
          category?: string;
          commission_percent?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      declined_leads: {
        Row: {
          declined_at: string;
          pro_id: string;
          reason: string | null;
          reason_note: string | null;
          request_id: string;
        };
        Insert: {
          declined_at?: string;
          pro_id: string;
          reason?: string | null;
          reason_note?: string | null;
          request_id: string;
        };
        Update: {
          declined_at?: string;
          pro_id?: string;
          reason?: string | null;
          reason_note?: string | null;
          request_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          is_read: boolean;
          link: string | null;
          request_id: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          request_id?: string | null;
          title: string;
          type: Database["public"]["Enums"]["notification_type"];
          user_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          request_id?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["notification_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      mark_job_finished_by_pro: {
        Args: {
          _request_id: string;
        };
        Returns: undefined;
      };
      client_schedule_job: {
        Args: {
          _quote_id: string;
          _scheduled_at: string;
        };
        Returns: undefined;
      };
      pro_decline_targeted_job: {
        Args: {
          _request_id: string;
          _reason: string;
          _reason_note: string;
        };
        Returns: undefined;
      };
      admin_transactions_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_billed: number;
          total_collected: number;
          pending_amount: number;
          pending_count: number;
        }[];
      };
    };
    Enums: {
      amba_zone: "CABA" | "Norte" | "Sur" | "Oeste";
      app_role: "admin" | "professional" | "client";
      notification_type:
        "quote_received" | "quote_answered" | "job_done" | "message_received" | "payment_confirmed";
      request_status:
        "pending" | "quoted" | "accepted" | "pending_confirmation" | "done" | "cancelled";
      verification_status: "pending" | "approved" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      amba_zone: ["CABA", "Norte", "Sur", "Oeste"],
      app_role: ["admin", "professional", "client"],
      request_status: [
        "pending",
        "quoted",
        "accepted",
        "pending_confirmation",
        "done",
        "cancelled",
      ],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const;
