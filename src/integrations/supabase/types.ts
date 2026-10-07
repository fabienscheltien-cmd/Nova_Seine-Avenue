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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          site_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          site_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      building_info: {
        Row: {
          content: string
          created_at: string
          id: string
          position: number
          site_id: string
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          position?: number
          site_id: string
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          position?: number
          site_id?: string
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "building_info_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          reply: string | null
          site_id: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          reply?: string | null
          site_id: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          reply?: string | null
          site_id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          hours: string | null
          id: string
          is_emergency: boolean
          name: string | null
          phone: string | null
          position: number
          role_label: string
          site_id: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          hours?: string | null
          id?: string
          is_emergency?: boolean
          name?: string | null
          phone?: string | null
          position?: number
          role_label: string
          site_id: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          hours?: string | null
          id?: string
          is_emergency?: boolean
          name?: string | null
          phone?: string | null
          position?: number
          role_label?: string
          site_id?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "contacts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      content_history: {
        Row: {
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string
          id: string
          operation: string
          site_id: string
          snapshot: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id: string
          id?: string
          operation: string
          site_id: string
          snapshot: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          operation?: string
          site_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_history_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      event_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          site_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          site_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_categories_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      event_locations: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          site_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          site_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_locations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          id: string
          site_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          site_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      event_templates: {
        Row: {
          capacity: number | null
          category_id: string | null
          created_at: string
          description: string | null
          end_time: string
          id: string
          location_id: string | null
          name: string
          site_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          location_id?: string | null
          name: string
          site_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          location_id?: string | null
          name?: string
          site_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "event_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string
          id: string
          image_url: string | null
          location_id: string | null
          registered_count: number
          registration_open: boolean
          series_id: string | null
          site_id: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at: string
          id?: string
          image_url?: string | null
          location_id?: string | null
          registered_count?: number
          registration_open?: boolean
          series_id?: string | null
          site_id: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string
          id?: string
          image_url?: string | null
          location_id?: string | null
          registered_count?: number
          registration_open?: boolean
          series_id?: string | null
          site_id?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "event_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          position: number
          question: string
          site_id: string
          theme_id: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          answer?: string
          created_at?: string
          id?: string
          position?: number
          question: string
          site_id: string
          theme_id: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          position?: number
          question?: string
          site_id?: string
          theme_id?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "faq_items_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_items_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "faq_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_themes: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          site_id: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          site_id: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          site_id?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "faq_themes_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          published_at: string | null
          site_id: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          site_id: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          published_at?: string | null
          site_id?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          floor: string | null
          id: string
          last_name: string | null
          newsletter_consent_at: string | null
          newsletter_opt_in: boolean
          notifications_opt_in: boolean
          site_id: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          floor?: string | null
          id: string
          last_name?: string | null
          newsletter_consent_at?: string | null
          newsletter_opt_in?: boolean
          notifications_opt_in?: boolean
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          floor?: string | null
          id?: string
          last_name?: string | null
          newsletter_consent_at?: string | null
          newsletter_opt_in?: boolean
          notifications_opt_in?: boolean
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      role_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          site_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          site_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_invitations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          hours: string | null
          id: string
          image_url: string | null
          link: string | null
          name: string
          position: number
          prices: string | null
          provider: string | null
          site_id: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          hours?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          name: string
          position?: number
          prices?: string | null
          provider?: string | null
          site_id: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          hours?: string | null
          id?: string
          image_url?: string | null
          link?: string | null
          name?: string
          position?: number
          prices?: string | null
          provider?: string | null
          site_id?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "services_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          booking_url: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          onboarding_done: boolean
          primary_color: string | null
          reception_email: string | null
          reception_phone: string | null
          resto_url: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          booking_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          onboarding_done?: boolean
          primary_color?: string | null
          reception_email?: string | null
          reception_phone?: string | null
          resto_url?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          booking_url?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_done?: boolean
          primary_color?: string | null
          reception_email?: string | null
          reception_phone?: string | null
          resto_url?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          site_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          site_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          site_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_site_admin: {
        Args: { _site_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "site_admin" | "occupant"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["super_admin", "site_admin", "occupant"],
    },
  },
} as const
