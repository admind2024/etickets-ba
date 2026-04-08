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
      AboutEvents: {
        Row: {
          biletarnicaFee: number | null
          biography: string | null
          buyerLimit: number | null
          categories: Json | null
          category: string | null
          created_at: string
          currency: string | null
          date: string | null
          description: string | null
          event_time: string | null
          googleMaps: string | null
          heroImage: string | null
          heroImageMobile: string | null
          hide: boolean | null
          id: string
          image: string | null
          info: string | null
          insurance: boolean | null
          insuranceTemplate: string | null
          name: string
          organizerEmail: string | null
          organizerName: string | null
          organizerPhone: string | null
          prioritet: number | null
          serviceFeePercentage: string | null
          slug: string
          ticketTemplate: string | null
          updated_at: string
          venue: string | null
        }
        Insert: {
          biletarnicaFee?: number | null
          biography?: string | null
          buyerLimit?: number | null
          categories?: Json | null
          category?: string | null
          created_at?: string
          currency?: string | null
          date?: string | null
          description?: string | null
          event_time?: string | null
          googleMaps?: string | null
          heroImage?: string | null
          heroImageMobile?: string | null
          hide?: boolean | null
          id?: string
          image?: string | null
          info?: string | null
          insurance?: boolean | null
          insuranceTemplate?: string | null
          name: string
          organizerEmail?: string | null
          organizerName?: string | null
          organizerPhone?: string | null
          prioritet?: number | null
          serviceFeePercentage?: string | null
          slug: string
          ticketTemplate?: string | null
          updated_at?: string
          venue?: string | null
        }
        Update: {
          biletarnicaFee?: number | null
          biography?: string | null
          buyerLimit?: number | null
          categories?: Json | null
          category?: string | null
          created_at?: string
          currency?: string | null
          date?: string | null
          description?: string | null
          event_time?: string | null
          googleMaps?: string | null
          heroImage?: string | null
          heroImageMobile?: string | null
          hide?: boolean | null
          id?: string
          image?: string | null
          info?: string | null
          insurance?: boolean | null
          insuranceTemplate?: string | null
          name?: string
          organizerEmail?: string | null
          organizerName?: string | null
          organizerPhone?: string | null
          prioritet?: number | null
          serviceFeePercentage?: string | null
          slug?: string
          ticketTemplate?: string | null
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      Admin: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      events_seo: {
        Row: {
          created_at: string
          date: string
          description: string | null
          id: string
          image: string | null
          is_published: boolean
          name: string
          performer_id: string
          price: number
          slug: string
          updated_at: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          id?: string
          image?: string | null
          is_published?: boolean
          name: string
          performer_id: string
          price: number
          slug: string
          updated_at?: string
          venue_id: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          image?: string | null
          is_published?: boolean
          name?: string
          performer_id?: string
          price?: number
          slug?: string
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_seo_performer_id_fkey"
            columns: ["performer_id"]
            isOneToOne: false
            referencedRelation: "performers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_seo_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      performers: {
        Row: {
          biography: string | null
          created_at: string
          id: string
          image: string | null
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          biography?: string | null
          created_at?: string
          id?: string
          image?: string | null
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          biography?: string | null
          created_at?: string
          id?: string
          image?: string | null
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      seat_events: {
        Row: {
          biletarnica: number | null
          biletarnicaFee: number | null
          capacity: string | null
          categories: Json | null
          category: string | null
          "Created Date": string | null
          currency: string | null
          date: string | null
          description: Json | null
          dogadjaj: string | null
          endDate: string | null
          eventId: string | null
          eventKey: string | null
          ID: string
          info: string | null
          Logo: string | null
          name: string
          online: number | null
          Owner: string | null
          pdvPercentage: number | null
          "SeatEvents (Item)": string | null
          serviceFeePercentage: number | null
          termsOfUse: string | null
          time: string | null
          Title: string | null
          "Updated Date": string | null
          venue: string | null
          workspaceKey: string | null
        }
        Insert: {
          biletarnica?: number | null
          biletarnicaFee?: number | null
          capacity?: string | null
          categories?: Json | null
          category?: string | null
          "Created Date"?: string | null
          currency?: string | null
          date?: string | null
          description?: Json | null
          dogadjaj?: string | null
          endDate?: string | null
          eventId?: string | null
          eventKey?: string | null
          ID?: string
          info?: string | null
          Logo?: string | null
          name: string
          online?: number | null
          Owner?: string | null
          pdvPercentage?: number | null
          "SeatEvents (Item)"?: string | null
          serviceFeePercentage?: number | null
          termsOfUse?: string | null
          time?: string | null
          Title?: string | null
          "Updated Date"?: string | null
          venue?: string | null
          workspaceKey?: string | null
        }
        Update: {
          biletarnica?: number | null
          biletarnicaFee?: number | null
          capacity?: string | null
          categories?: Json | null
          category?: string | null
          "Created Date"?: string | null
          currency?: string | null
          date?: string | null
          description?: Json | null
          dogadjaj?: string | null
          endDate?: string | null
          eventId?: string | null
          eventKey?: string | null
          ID?: string
          info?: string | null
          Logo?: string | null
          name?: string
          online?: number | null
          Owner?: string | null
          pdvPercentage?: number | null
          "SeatEvents (Item)"?: string | null
          serviceFeePercentage?: number | null
          termsOfUse?: string | null
          time?: string | null
          Title?: string | null
          "Updated Date"?: string | null
          venue?: string | null
          workspaceKey?: string | null
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          capacity: number | null
          city: string
          created_at: string
          description: string | null
          id: string
          image: string | null
          latitude: number | null
          longitude: number | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city: string
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_canonical_event_slug: {
        Args: {
          event_date: string
          event_name: string
          venue_city: string
          venue_name: string
        }
        Returns: string
      }
      generate_event_slug: {
        Args: {
          event_year: number
          performer_name: string
          venue_city: string
          venue_name: string
        }
        Returns: string
      }
      get_event_by_slug: {
        Args: { p_slug: string }
        Returns: {
          biletarnicaFee: number | null
          biography: string | null
          buyerLimit: number | null
          categories: Json | null
          category: string | null
          created_at: string
          currency: string | null
          date: string | null
          description: string | null
          event_time: string | null
          googleMaps: string | null
          heroImage: string | null
          heroImageMobile: string | null
          hide: boolean | null
          id: string
          image: string | null
          info: string | null
          insurance: boolean | null
          insuranceTemplate: string | null
          name: string
          organizerEmail: string | null
          organizerName: string | null
          organizerPhone: string | null
          prioritet: number | null
          serviceFeePercentage: string | null
          slug: string
          ticketTemplate: string | null
          updated_at: string
          venue: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "AboutEvents"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      normalize_slug_text: { Args: { input_text: string }; Returns: string }
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
