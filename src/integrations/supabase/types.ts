export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcement_views: {
        Row: {
          announcement_id: string
          id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          announcement_id: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          announcement_id?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          action_button_text: string | null
          action_button_url: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          position: string
          target_type: string
          target_user_id: string | null
          theme: string
          title: string
        }
        Insert: {
          action_button_text?: string | null
          action_button_url?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          position?: string
          target_type: string
          target_user_id?: string | null
          theme?: string
          title: string
        }
        Update: {
          action_button_text?: string | null
          action_button_url?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          position?: string
          target_type?: string
          target_user_id?: string | null
          theme?: string
          title?: string
        }
        Relationships: []
      }
      carousel_items: {
        Row: {
          created_at: string
          id: string
          instagram: string | null
          logo_url: string
          name: string
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          instagram?: string | null
          logo_url: string
          name: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          instagram?: string | null
          logo_url?: string
          name?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      client_announcements: {
        Row: {
          action_button_text: string | null
          action_button_url: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          message: string
          theme: string
          title: string
        }
        Insert: {
          action_button_text?: string | null
          action_button_url?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          message: string
          theme?: string
          title: string
        }
        Update: {
          action_button_text?: string | null
          action_button_url?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          message?: string
          theme?: string
          title?: string
        }
        Relationships: []
      }
      company_data: {
        Row: {
          accountant_contact: string
          accountant_name: string
          address: string
          cadastral_situation: string | null
          city: string | null
          client_status: string | null
          cnpj: string
          created_at: string
          email: string
          fantasy_name: string | null
          id: string
          internal_observations: string | null
          internal_responsible: string | null
          internal_tags: string[] | null
          last_federal_update: string | null
          last_query_date: string | null
          main_activity: string | null
          name: string
          neighborhood: string | null
          number: string | null
          opening_date: string
          phone: string
          postal_code: string | null
          registration_status: string | null
          secondary_activities: string | null
          social_capital: string | null
          state: string | null
          tax_regime: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accountant_contact: string
          accountant_name: string
          address: string
          cadastral_situation?: string | null
          city?: string | null
          client_status?: string | null
          cnpj: string
          created_at?: string
          email: string
          fantasy_name?: string | null
          id?: string
          internal_observations?: string | null
          internal_responsible?: string | null
          internal_tags?: string[] | null
          last_federal_update?: string | null
          last_query_date?: string | null
          main_activity?: string | null
          name: string
          neighborhood?: string | null
          number?: string | null
          opening_date: string
          phone: string
          postal_code?: string | null
          registration_status?: string | null
          secondary_activities?: string | null
          social_capital?: string | null
          state?: string | null
          tax_regime: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accountant_contact?: string
          accountant_name?: string
          address?: string
          cadastral_situation?: string | null
          city?: string | null
          client_status?: string | null
          cnpj?: string
          created_at?: string
          email?: string
          fantasy_name?: string | null
          id?: string
          internal_observations?: string | null
          internal_responsible?: string | null
          internal_tags?: string[] | null
          last_federal_update?: string | null
          last_query_date?: string | null
          main_activity?: string | null
          name?: string
          neighborhood?: string | null
          number?: string | null
          opening_date?: string
          phone?: string
          postal_code?: string | null
          registration_status?: string | null
          secondary_activities?: string | null
          social_capital?: string | null
          state?: string | null
          tax_regime?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          expires_at: string | null
          file_url: string
          filename: string | null
          id: string
          name: string
          observations: string | null
          original_filename: string | null
          size: number | null
          status: string | null
          storage_key: string | null
          subcategory: string | null
          type: string | null
          uploaded_at: string | null
          user_id: string
          viewed: boolean | null
          viewed_at: string | null
        }
        Insert: {
          category?: string | null
          expires_at?: string | null
          file_url: string
          filename?: string | null
          id?: string
          name: string
          observations?: string | null
          original_filename?: string | null
          size?: number | null
          status?: string | null
          storage_key?: string | null
          subcategory?: string | null
          type?: string | null
          uploaded_at?: string | null
          user_id: string
          viewed?: boolean | null
          viewed_at?: string | null
        }
        Update: {
          category?: string | null
          expires_at?: string | null
          file_url?: string
          filename?: string | null
          id?: string
          name?: string
          observations?: string | null
          original_filename?: string | null
          size?: number | null
          status?: string | null
          storage_key?: string | null
          subcategory?: string | null
          type?: string | null
          uploaded_at?: string | null
          user_id?: string
          viewed?: boolean | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_document_category"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_events: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      form_questions: {
        Row: {
          created_at: string
          id: string
          options: Json | null
          order_position: number
          poll_id: string
          question_text: string
          question_type: string
          required: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json | null
          order_position?: number
          poll_id: string
          question_text: string
          question_type: string
          required?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json | null
          order_position?: number
          poll_id?: string
          question_text?: string
          question_type?: string
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          question_id: string
          response_value: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          question_id: string
          response_value?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          question_id?: string
          response_value?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      inss_simulations: {
        Row: {
          created_at: string
          dados: Json
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dados: Json
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dados?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      numerical_questions: {
        Row: {
          created_at: string
          id: string
          max_value: number
          min_value: number
          poll_id: string
          question_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_value?: number
          min_value?: number
          poll_id: string
          question_text: string
        }
        Update: {
          created_at?: string
          id?: string
          max_value?: number
          min_value?: number
          poll_id?: string
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "numerical_questions_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      numerical_responses: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          question_id: string
          user_id: string | null
          user_name: string | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          question_id: string
          user_id?: string | null
          user_name?: string | null
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          question_id?: string
          user_id?: string | null
          user_name?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "numerical_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "numerical_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "numerical_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          option_text: string
          poll_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_text: string
          poll_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_text?: string
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_responses_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_comments: boolean
          created_at: string
          created_by: string
          description: string | null
          expires_at: string | null
          id: string
          is_public: boolean
          poll_type: string
          title: string
        }
        Insert: {
          allow_comments?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean
          poll_type?: string
          title: string
        }
        Update: {
          allow_comments?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean
          poll_type?: string
          title?: string
        }
        Relationships: []
      }
      prolabore_simulations: {
        Row: {
          created_at: string
          dados: Json
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dados: Json
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dados?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role?: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_simulations: {
        Row: {
          data_criacao: string | null
          dependentes: number | null
          educacao: number | null
          email: string | null
          id: string
          imposto_estimado: number
          inss: number
          nome: string | null
          outras_deducoes: number | null
          rendimento_bruto: number
          saude: number | null
          telefone: string | null
          tipo_simulacao: string
          user_id: string | null
        }
        Insert: {
          data_criacao?: string | null
          dependentes?: number | null
          educacao?: number | null
          email?: string | null
          id?: string
          imposto_estimado: number
          inss: number
          nome?: string | null
          outras_deducoes?: number | null
          rendimento_bruto: number
          saude?: number | null
          telefone?: string | null
          tipo_simulacao: string
          user_id?: string | null
        }
        Update: {
          data_criacao?: string | null
          dependentes?: number | null
          educacao?: number | null
          email?: string | null
          id?: string
          imposto_estimado?: number
          inss?: number
          nome?: string | null
          outras_deducoes?: number | null
          rendimento_bruto?: number
          saude?: number | null
          telefone?: string | null
          tipo_simulacao?: string
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
      visualized_documents: {
        Row: {
          document_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          document_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          document_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visualized_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_expired_documents: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      foldername: {
        Args: Record<PropertyKey, never> | { name: string }
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mark_expired_documents: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_document_expiration: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
