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
      analytics_events: {
        Row: {
          assessment_id: string | null
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          page_url: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          page_url?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_kb_logs: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          kb_chunk_id: string | null
          kb_version_id: string | null
          similarity: number | null
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          kb_chunk_id?: string | null
          kb_version_id?: string | null
          similarity?: number | null
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          kb_chunk_id?: string | null
          kb_version_id?: string | null
          similarity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_kb_logs_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_kb_logs_kb_chunk_id_fkey"
            columns: ["kb_chunk_id"]
            isOneToOne: false
            referencedRelation: "fit2go_kb_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_kb_logs_kb_version_id_fkey"
            columns: ["kb_version_id"]
            isOneToOne: false
            referencedRelation: "kb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_options_current_state: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      assessment_options_primary_goal: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      assessments: {
        Row: {
          access_token: string
          age: number
          ai_assessment: string | null
          ai_recommendations: Json | null
          bss_score: number | null
          completed_at: string | null
          completion_time_seconds: number | null
          created_at: string
          current_state_id: string
          email: string | null
          honeypot_triggered: boolean | null
          id: string
          ip_address: unknown
          kb_version_id: string | null
          lrb_score: number | null
          oas_score: number | null
          pcc_score: number | null
          primary_goal_id: string
          session_id: string | null
          sis_score: number | null
          status: string
          updated_at: string
          voice_audio_url: string | null
          voice_transcript: string | null
        }
        Insert: {
          access_token?: string
          age: number
          ai_assessment?: string | null
          ai_recommendations?: Json | null
          bss_score?: number | null
          completed_at?: string | null
          completion_time_seconds?: number | null
          created_at?: string
          current_state_id: string
          email?: string | null
          honeypot_triggered?: boolean | null
          id?: string
          ip_address?: unknown
          kb_version_id?: string | null
          lrb_score?: number | null
          oas_score?: number | null
          pcc_score?: number | null
          primary_goal_id: string
          session_id?: string | null
          sis_score?: number | null
          status?: string
          updated_at?: string
          voice_audio_url?: string | null
          voice_transcript?: string | null
        }
        Update: {
          access_token?: string
          age?: number
          ai_assessment?: string | null
          ai_recommendations?: Json | null
          bss_score?: number | null
          completed_at?: string | null
          completion_time_seconds?: number | null
          created_at?: string
          current_state_id?: string
          email?: string | null
          honeypot_triggered?: boolean | null
          id?: string
          ip_address?: unknown
          kb_version_id?: string | null
          lrb_score?: number | null
          oas_score?: number | null
          pcc_score?: number | null
          primary_goal_id?: string
          session_id?: string | null
          sis_score?: number | null
          status?: string
          updated_at?: string
          voice_audio_url?: string | null
          voice_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_current_state_id_fkey"
            columns: ["current_state_id"]
            isOneToOne: false
            referencedRelation: "assessment_options_current_state"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_kb_version_id_fkey"
            columns: ["kb_version_id"]
            isOneToOne: false
            referencedRelation: "kb_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_primary_goal_id_fkey"
            columns: ["primary_goal_id"]
            isOneToOne: false
            referencedRelation: "assessment_options_primary_goal"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_versions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          storage_path: string
          version_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          storage_path: string
          version_label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          storage_path?: string
          version_label?: string
        }
        Relationships: []
      }
      fit2go_kb_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          page: number | null
          section: string | null
          token_count: number | null
          version_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          page?: number | null
          section?: string | null
          token_count?: number | null
          version_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          page?: number | null
          section?: string | null
          token_count?: number | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fit2go_kb_chunks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "kb_versions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_assessment: {
        Args: {
          p_age: number
          p_ai_assessment: string
          p_ai_recommendations: Json
          p_bss_score: number
          p_completed_at: string
          p_completion_time_seconds: number
          p_current_state_id: string
          p_kb_version_id: string
          p_lrb_score: number
          p_oas_score: number
          p_pcc_score: number
          p_primary_goal_id: string
          p_sis_score: number
          p_status: string
          p_voice_transcript: string
        }
        Returns: {
          access_token: string
          id: string
        }[]
      }
      get_assessment_by_token: {
        Args: { p_access_token: string }
        Returns: {
          age: number
          ai_assessment: string
          completed_at: string
          created_at: string
          current_state_label: string
          id: string
          primary_goal_label: string
        }[]
      }
      match_fit2go_knowledge: {
        Args: {
          p_match_count?: number
          p_query_embedding: string
          p_version_id: string
        }
        Returns: {
          content: string
          id: string
          page: number
          section: string
          similarity: number
        }[]
      }
      update_assessment_by_token: {
        Args: {
          p_access_token: string
          p_completed_at: string
          p_completion_time_seconds: number
          p_email: string
          p_honeypot_triggered: boolean
          p_status: string
        }
        Returns: {
          id: string
        }[]
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
