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
      _fiscal_sales_debug_token: {
        Row: {
          id: boolean
          token: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          token?: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      _temporary_sefaz_debug_token: {
        Row: {
          expires_at: string
          id: boolean
          token: string
        }
        Insert: {
          expires_at?: string
          id?: boolean
          token?: string
        }
        Update: {
          expires_at?: string
          id?: boolean
          token?: string
        }
        Relationships: []
      }
      accounting_ai_usage: {
        Row: {
          cached_input_tokens: number
          company_key: string | null
          competence: string | null
          created_at: string
          created_by: string | null
          error_code: string | null
          error_message: string | null
          estimated_cost_usd: number
          id: string
          input_tokens: number
          latency_ms: number
          model: string
          module: string
          output_tokens: number
          provider: string
          request_metadata: Json
          response_id: string | null
          status: string
          total_tokens: number
        }
        Insert: {
          cached_input_tokens?: number
          company_key?: string | null
          competence?: string | null
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          latency_ms?: number
          model: string
          module?: string
          output_tokens?: number
          provider?: string
          request_metadata?: Json
          response_id?: string | null
          status: string
          total_tokens?: number
        }
        Update: {
          cached_input_tokens?: number
          company_key?: string | null
          competence?: string | null
          created_at?: string
          created_by?: string | null
          error_code?: string | null
          error_message?: string | null
          estimated_cost_usd?: number
          id?: string
          input_tokens?: number
          latency_ms?: number
          model?: string
          module?: string
          output_tokens?: number
          provider?: string
          request_metadata?: Json
          response_id?: string | null
          status?: string
          total_tokens?: number
        }
        Relationships: []
      }
      accounting_engine_settings: {
        Row: {
          configured_at: string
          configured_by: string | null
          id: number
          password_hash: string
          password_iterations: number
          password_salt: string
          updated_at: string
        }
        Insert: {
          configured_at?: string
          configured_by?: string | null
          id?: number
          password_hash: string
          password_iterations?: number
          password_salt: string
          updated_at?: string
        }
        Update: {
          configured_at?: string
          configured_by?: string | null
          id?: number
          password_hash?: string
          password_iterations?: number
          password_salt?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounting_mapping_rules: {
        Row: {
          company_key: string
          created_at: string
          created_by: string | null
          credit_code: string
          credit_cost_center: string
          credit_description: string
          debit_code: string
          debit_cost_center: string
          debit_description: string
          event_type: string
          history_template: string
          id: string
          is_active: boolean
          kind: string
          module: string
          normalized_description: string
          rubric_code: string
          rubric_description: string
          section: string
          signature: string
          source: string
          times_confirmed: number
          times_used: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_key: string
          created_at?: string
          created_by?: string | null
          credit_code: string
          credit_cost_center?: string
          credit_description?: string
          debit_code: string
          debit_cost_center?: string
          debit_description?: string
          event_type?: string
          history_template?: string
          id?: string
          is_active?: boolean
          kind?: string
          module?: string
          normalized_description?: string
          rubric_code?: string
          rubric_description?: string
          section?: string
          signature: string
          source?: string
          times_confirmed?: number
          times_used?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_key?: string
          created_at?: string
          created_by?: string | null
          credit_code?: string
          credit_cost_center?: string
          credit_description?: string
          debit_code?: string
          debit_cost_center?: string
          debit_description?: string
          event_type?: string
          history_template?: string
          id?: string
          is_active?: boolean
          kind?: string
          module?: string
          normalized_description?: string
          rubric_code?: string
          rubric_description?: string
          section?: string
          signature?: string
          source?: string
          times_confirmed?: number
          times_used?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      accounting_workspace_data: {
        Row: {
          company_key: string
          competence: string | null
          created_at: string
          created_by: string | null
          module: string | null
          payload: Json
          scope: string
          updated_at: string
        }
        Insert: {
          company_key: string
          competence?: string | null
          created_at?: string
          created_by?: string | null
          module?: string | null
          payload?: Json
          scope: string
          updated_at?: string
        }
        Update: {
          company_key?: string
          competence?: string | null
          created_at?: string
          created_by?: string | null
          module?: string | null
          payload?: Json
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      accounting_workspace_documents: {
        Row: {
          checksum: string | null
          company_key: string
          competence: string | null
          created_at: string
          created_by: string | null
          id: string
          mime_type: string | null
          module: string | null
          original_name: string
          scope: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          checksum?: string | null
          company_key: string
          competence?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mime_type?: string | null
          module?: string | null
          original_name: string
          scope: string
          size_bytes?: number
          storage_path: string
        }
        Update: {
          checksum?: string | null
          company_key?: string
          competence?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mime_type?: string | null
          module?: string | null
          original_name?: string
          scope?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: []
      }
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
          company_id: string | null
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
          company_id?: string | null
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
          company_id?: string | null
          created_at?: string
          id?: string
          instagram?: string | null
          logo_url?: string
          name?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carousel_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      companies: {
        Row: {
          address: string | null
          certificate_data: string | null
          certificate_password: string | null
          cnpj: string | null
          company_name: string
          company_size: string | null
          created_at: string
          id: string
          is_fiscal_automation_client: boolean | null
          logo_url: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          certificate_data?: string | null
          certificate_password?: string | null
          cnpj?: string | null
          company_name: string
          company_size?: string | null
          created_at?: string
          id?: string
          is_fiscal_automation_client?: boolean | null
          logo_url?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          certificate_data?: string | null
          certificate_password?: string | null
          cnpj?: string | null
          company_name?: string
          company_size?: string | null
          created_at?: string
          id?: string
          is_fiscal_automation_client?: boolean | null
          logo_url?: string | null
          trade_name?: string | null
          updated_at?: string
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
      company_user_links: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_primary: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_user_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_user_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_cfop_mapping: {
        Row: {
          ativo_padrao: boolean
          cfop: string
          client_id: string
          conta_credito: string
          conta_debito: string
          created_at: string
          descricao: string | null
          id: string
          updated_at: string
        }
        Insert: {
          ativo_padrao?: boolean
          cfop: string
          client_id: string
          conta_credito?: string
          conta_debito: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          ativo_padrao?: boolean
          cfop?: string
          client_id?: string
          conta_credito?: string
          conta_debito?: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      compras_lancamentos: {
        Row: {
          cfop: string | null
          client_id: string
          competencia: string
          conta_credito: string | null
          conta_debito: string | null
          created_at: string
          data: string | null
          historico: string | null
          id: string
          ordem: number
          source_upload_id: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          cfop?: string | null
          client_id: string
          competencia: string
          conta_credito?: string | null
          conta_debito?: string | null
          created_at?: string
          data?: string | null
          historico?: string | null
          id?: string
          ordem?: number
          source_upload_id?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          cfop?: string | null
          client_id?: string
          competencia?: string
          conta_credito?: string | null
          conta_debito?: string | null
          created_at?: string
          data?: string | null
          historico?: string | null
          id?: string
          ordem?: number
          source_upload_id?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      compras_uploads: {
        Row: {
          client_id: string
          competencia: string
          created_at: string
          dados_extraidos: Json | null
          id: string
          nome_arquivo: string
          status: string
          storage_path: string
          ultimo_erro: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          competencia: string
          created_at?: string
          dados_extraidos?: Json | null
          id?: string
          nome_arquivo: string
          status?: string
          storage_path: string
          ultimo_erro?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          competencia?: string
          created_at?: string
          dados_extraidos?: Json | null
          id?: string
          nome_arquivo?: string
          status?: string
          storage_path?: string
          ultimo_erro?: string | null
          updated_at?: string
          uploaded_by?: string | null
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
      documentos_brutos: {
        Row: {
          alinhado_em: string | null
          arquivo_original: string | null
          competencia: string
          created_at: string | null
          dados_extraidos: Json | null
          id: string
          nome_arquivo: string
          processado_em: string | null
          status_alinhamento: string | null
          status_processamento: string | null
          tentativas_alinhamento: number | null
          tentativas_processamento: number | null
          tipo_documento: string | null
          ultimo_erro: string | null
          updated_at: string | null
          url_storage: string
          user_id: string
        }
        Insert: {
          alinhado_em?: string | null
          arquivo_original?: string | null
          competencia: string
          created_at?: string | null
          dados_extraidos?: Json | null
          id?: string
          nome_arquivo: string
          processado_em?: string | null
          status_alinhamento?: string | null
          status_processamento?: string | null
          tentativas_alinhamento?: number | null
          tentativas_processamento?: number | null
          tipo_documento?: string | null
          ultimo_erro?: string | null
          updated_at?: string | null
          url_storage: string
          user_id: string
        }
        Update: {
          alinhado_em?: string | null
          arquivo_original?: string | null
          competencia?: string
          created_at?: string | null
          dados_extraidos?: Json | null
          id?: string
          nome_arquivo?: string
          processado_em?: string | null
          status_alinhamento?: string | null
          status_processamento?: string | null
          tentativas_alinhamento?: number | null
          tentativas_processamento?: number | null
          tipo_documento?: string | null
          ultimo_erro?: string | null
          updated_at?: string | null
          url_storage?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string | null
          company_id: string | null
          drive_url: string | null
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
          company_id?: string | null
          drive_url?: string | null
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
          company_id?: string | null
          drive_url?: string | null
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
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
      extrato_bancario: {
        Row: {
          competencia: string
          created_at: string | null
          data_transacao: string
          descricao: string
          documento_id: string | null
          id: string
          status: string | null
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          competencia: string
          created_at?: string | null
          data_transacao: string
          descricao: string
          documento_id?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          valor: number
        }
        Update: {
          competencia?: string
          created_at?: string | null
          data_transacao?: string
          descricao?: string
          documento_id?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_extrato_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_brutos"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamentos_exportados: {
        Row: {
          arquivo_csv_url: string | null
          arquivo_excel_url: string | null
          competencia: string
          created_at: string | null
          id: string
          n8n_status: string | null
          status: string | null
          total_lancamentos: number | null
          user_email: string | null
          user_id: string
          user_name: string | null
          verification_id: string | null
        }
        Insert: {
          arquivo_csv_url?: string | null
          arquivo_excel_url?: string | null
          competencia: string
          created_at?: string | null
          id?: string
          n8n_status?: string | null
          status?: string | null
          total_lancamentos?: number | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
          verification_id?: string | null
        }
        Update: {
          arquivo_csv_url?: string | null
          arquivo_excel_url?: string | null
          competencia?: string
          created_at?: string | null
          id?: string
          n8n_status?: string | null
          status?: string | null
          total_lancamentos?: number | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          verification_id?: string | null
        }
        Relationships: []
      }
      fiscal_certificates: {
        Row: {
          certificate_ciphertext: string | null
          certificate_data: string | null
          certificate_iv: string | null
          certificate_name: string
          company_id: string
          created_at: string
          created_by: string
          fingerprint: string | null
          holder_cnpj: string | null
          holder_name: string | null
          id: string
          inspected_at: string | null
          is_active: boolean
          password_ciphertext: string | null
          password_hash: string | null
          password_iv: string | null
          serial_number: string | null
          updated_at: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          certificate_ciphertext?: string | null
          certificate_data?: string | null
          certificate_iv?: string | null
          certificate_name: string
          company_id: string
          created_at?: string
          created_by: string
          fingerprint?: string | null
          holder_cnpj?: string | null
          holder_name?: string | null
          id?: string
          inspected_at?: string | null
          is_active?: boolean
          password_ciphertext?: string | null
          password_hash?: string | null
          password_iv?: string | null
          serial_number?: string | null
          updated_at?: string
          valid_from: string
          valid_until: string
        }
        Update: {
          certificate_ciphertext?: string | null
          certificate_data?: string | null
          certificate_iv?: string | null
          certificate_name?: string
          company_id?: string
          created_at?: string
          created_by?: string
          fingerprint?: string | null
          holder_cnpj?: string | null
          holder_name?: string | null
          id?: string
          inspected_at?: string | null
          is_active?: boolean
          password_ciphertext?: string | null
          password_hash?: string | null
          password_iv?: string | null
          serial_number?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_companies: {
        Row: {
          ambiente_padrao: string
          cnpj: string
          codigo_municipio: string | null
          company_id: string | null
          created_at: string
          created_by: string
          endereco: Json | null
          fiscal_settings: Json
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          last_sync_at: string | null
          municipio: string | null
          nome_fantasia: string | null
          razao_social: string
          regime_tributario: string | null
          status: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          ambiente_padrao?: string
          cnpj: string
          codigo_municipio?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          endereco?: Json | null
          fiscal_settings?: Json
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          last_sync_at?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          razao_social: string
          regime_tributario?: string | null
          status?: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ambiente_padrao?: string
          cnpj?: string
          codigo_municipio?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          endereco?: Json | null
          fiscal_settings?: Json
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          last_sync_at?: string | null
          municipio?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          regime_tributario?: string | null
          status?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_dfe_documents: {
        Row: {
          access_key: string | null
          authorized_at: string | null
          cnpj: string
          company_id: string | null
          created_at: string
          direction: string
          document_kind: string
          environment: string
          full_xml: boolean
          id: string
          issue_date: string | null
          issuer_cnpj: string | null
          issuer_name: string | null
          model: string | null
          note_number: string | null
          nsu: string
          parse_error: string | null
          received_at: string
          recipient_cnpj: string | null
          schema_name: string | null
          series: string | null
          source: string | null
          source_id: string | null
          status_code: string | null
          status_text: string | null
          uf_code: string
          updated_at: string
          user_id: string
          value: number | null
          xml: string | null
        }
        Insert: {
          access_key?: string | null
          authorized_at?: string | null
          cnpj: string
          company_id?: string | null
          created_at?: string
          direction?: string
          document_kind?: string
          environment: string
          full_xml?: boolean
          id?: string
          issue_date?: string | null
          issuer_cnpj?: string | null
          issuer_name?: string | null
          model?: string | null
          note_number?: string | null
          nsu: string
          parse_error?: string | null
          received_at?: string
          recipient_cnpj?: string | null
          schema_name?: string | null
          series?: string | null
          source?: string | null
          source_id?: string | null
          status_code?: string | null
          status_text?: string | null
          uf_code: string
          updated_at?: string
          user_id: string
          value?: number | null
          xml?: string | null
        }
        Update: {
          access_key?: string | null
          authorized_at?: string | null
          cnpj?: string
          company_id?: string | null
          created_at?: string
          direction?: string
          document_kind?: string
          environment?: string
          full_xml?: boolean
          id?: string
          issue_date?: string | null
          issuer_cnpj?: string | null
          issuer_name?: string | null
          model?: string | null
          note_number?: string | null
          nsu?: string
          parse_error?: string | null
          received_at?: string
          recipient_cnpj?: string | null
          schema_name?: string | null
          series?: string | null
          source?: string | null
          source_id?: string | null
          status_code?: string | null
          status_text?: string | null
          uf_code?: string
          updated_at?: string
          user_id?: string
          value?: number | null
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_dfe_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_dfe_events: {
        Row: {
          access_key: string | null
          cnpj: string
          company_id: string | null
          created_at: string
          environment: string
          event_at: string | null
          event_description: string | null
          event_type: string | null
          id: string
          nsu: string
          received_at: string
          schema_name: string | null
          source: string
          status_code: string | null
          uf_code: string
          updated_at: string
          user_id: string
          xml: string | null
        }
        Insert: {
          access_key?: string | null
          cnpj: string
          company_id?: string | null
          created_at?: string
          environment: string
          event_at?: string | null
          event_description?: string | null
          event_type?: string | null
          id?: string
          nsu: string
          received_at?: string
          schema_name?: string | null
          source?: string
          status_code?: string | null
          uf_code: string
          updated_at?: string
          user_id: string
          xml?: string | null
        }
        Update: {
          access_key?: string | null
          cnpj?: string
          company_id?: string | null
          created_at?: string
          environment?: string
          event_at?: string | null
          event_description?: string | null
          event_type?: string | null
          id?: string
          nsu?: string
          received_at?: string
          schema_name?: string | null
          source?: string
          status_code?: string | null
          uf_code?: string
          updated_at?: string
          user_id?: string
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_dfe_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_dfe_sync_state: {
        Row: {
          cnpj: string
          created_at: string
          environment: string
          id: string
          last_status_code: string | null
          last_status_message: string | null
          last_synced_at: string | null
          max_nsu: string
          uf_code: string
          ult_nsu: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          environment: string
          id?: string
          last_status_code?: string | null
          last_status_message?: string | null
          last_synced_at?: string | null
          max_nsu?: string
          uf_code: string
          ult_nsu?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          environment?: string
          id?: string
          last_status_code?: string | null
          last_status_message?: string | null
          last_synced_at?: string | null
          max_nsu?: string
          uf_code?: string
          ult_nsu?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fiscal_documents: {
        Row: {
          cfop: string | null
          chave_acesso: string
          cnpj_destinatario: string | null
          cnpj_emitente: string
          company_id: string
          created_at: string
          data_emissao: string
          id: string
          natureza_operacao: string | null
          nome_destinatario: string | null
          nome_emitente: string
          numero_nota: string
          pdf_url: string | null
          serie: string
          status: string
          sync_id: string | null
          tipo_documento: string
          tipo_operacao: string
          valor_impostos: number | null
          valor_total: number
          xml_content: string
        }
        Insert: {
          cfop?: string | null
          chave_acesso: string
          cnpj_destinatario?: string | null
          cnpj_emitente: string
          company_id: string
          created_at?: string
          data_emissao: string
          id?: string
          natureza_operacao?: string | null
          nome_destinatario?: string | null
          nome_emitente: string
          numero_nota: string
          pdf_url?: string | null
          serie: string
          status?: string
          sync_id?: string | null
          tipo_documento: string
          tipo_operacao: string
          valor_impostos?: number | null
          valor_total: number
          xml_content: string
        }
        Update: {
          cfop?: string | null
          chave_acesso?: string
          cnpj_destinatario?: string | null
          cnpj_emitente?: string
          company_id?: string
          created_at?: string
          data_emissao?: string
          id?: string
          natureza_operacao?: string | null
          nome_destinatario?: string | null
          nome_emitente?: string
          numero_nota?: string
          pdf_url?: string | null
          serie?: string
          status?: string
          sync_id?: string | null
          tipo_documento?: string
          tipo_operacao?: string
          valor_impostos?: number | null
          valor_total?: number
          xml_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_documents_sync_id_fkey"
            columns: ["sync_id"]
            isOneToOne: false
            referencedRelation: "fiscal_sync_logs"
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
      fiscal_nfse_sync_state: {
        Row: {
          company_id: string
          documents_saved: number
          events_saved: number
          last_completed_at: string | null
          last_error: string | null
          last_nsu: number
          last_started_at: string | null
          next_scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          documents_saved?: number
          events_saved?: number
          last_completed_at?: string | null
          last_error?: string | null
          last_nsu?: number
          last_started_at?: string | null
          next_scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          documents_saved?: number
          events_saved?: number
          last_completed_at?: string | null
          last_error?: string | null
          last_nsu?: number
          last_started_at?: string | null
          next_scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_nfse_sync_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_notes: {
        Row: {
          access_key: string
          cfop: string | null
          company_id: string
          created_at: string
          id: string
          issue_date: string
          issuer_cnpj: string
          note_type: string
          pdf_url: string | null
          recipient_cnpj: string
          status: string
          updated_at: string
          value: number
          xml_url: string | null
        }
        Insert: {
          access_key: string
          cfop?: string | null
          company_id: string
          created_at?: string
          id?: string
          issue_date: string
          issuer_cnpj: string
          note_type: string
          pdf_url?: string | null
          recipient_cnpj: string
          status?: string
          updated_at?: string
          value: number
          xml_url?: string | null
        }
        Update: {
          access_key?: string
          cfop?: string | null
          company_id?: string
          created_at?: string
          id?: string
          issue_date?: string
          issuer_cnpj?: string
          note_type?: string
          pdf_url?: string | null
          recipient_cnpj?: string
          status?: string
          updated_at?: string
          value?: number
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_purchase_sync_state: {
        Row: {
          company_id: string
          consecutive_failures: number
          last_completed_at: string | null
          last_error: string | null
          last_failed_at: string | null
          last_started_at: string | null
          last_status_code: string | null
          last_status_message: string | null
          next_scheduled_at: string | null
          paused: boolean
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          consecutive_failures?: number
          last_completed_at?: string | null
          last_error?: string | null
          last_failed_at?: string | null
          last_started_at?: string | null
          last_status_code?: string | null
          last_status_message?: string | null
          next_scheduled_at?: string | null
          paused?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          consecutive_failures?: number
          last_completed_at?: string | null
          last_error?: string | null
          last_failed_at?: string | null
          last_started_at?: string | null
          last_status_code?: string | null
          last_status_message?: string | null
          next_scheduled_at?: string | null
          paused?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_purchase_sync_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_sales_connector_runs: {
        Row: {
          company_id: string
          connector: string
          created_by: string | null
          diagnostics: Json
          finished_at: string | null
          id: string
          message: string | null
          period_end: string | null
          period_start: string | null
          stage: string
          started_at: string
          stats: Json
          status: string
          uf: string
        }
        Insert: {
          company_id: string
          connector: string
          created_by?: string | null
          diagnostics?: Json
          finished_at?: string | null
          id?: string
          message?: string | null
          period_end?: string | null
          period_start?: string | null
          stage: string
          started_at?: string
          stats?: Json
          status: string
          uf: string
        }
        Update: {
          company_id?: string
          connector?: string
          created_by?: string | null
          diagnostics?: Json
          finished_at?: string | null
          id?: string
          message?: string | null
          period_end?: string | null
          period_start?: string | null
          stage?: string
          started_at?: string
          stats?: Json
          status?: string
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_sales_connector_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_sales_connector_state: {
        Row: {
          company_id: string
          connector_version: string
          created_at: string
          cursor: Json
          last_message: string | null
          last_status: string | null
          last_synced_at: string | null
          uf: string
          updated_at: string
        }
        Insert: {
          company_id: string
          connector_version?: string
          created_at?: string
          cursor?: Json
          last_message?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          uf: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          connector_version?: string
          created_at?: string
          cursor?: Json
          last_message?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_sales_connector_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_sales_debug_queue: {
        Row: {
          action: string
          company_id: string
          dispatched_at: string | null
          id: string
          period_end: string | null
          period_start: string | null
          request_id: number | null
          requested_at: string
        }
        Insert: {
          action?: string
          company_id: string
          dispatched_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          request_id?: number | null
          requested_at?: string
        }
        Update: {
          action?: string
          company_id?: string
          dispatched_at?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          request_id?: number | null
          requested_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_sales_debug_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_sales_debug_runs: {
        Row: {
          company_id: string
          details: Json
          finished_at: string | null
          id: string
          message: string | null
          stage: string
          started_at: string
          status: string
          uf: string
        }
        Insert: {
          company_id: string
          details?: Json
          finished_at?: string | null
          id?: string
          message?: string | null
          stage?: string
          started_at?: string
          status?: string
          uf?: string
        }
        Update: {
          company_id?: string
          details?: Json
          finished_at?: string | null
          id?: string
          message?: string | null
          stage?: string
          started_at?: string
          status?: string
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_sales_debug_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_sales_documents: {
        Row: {
          access_key: string
          company_id: string
          document_number: string | null
          first_seen_at: string
          id: string
          issue_date: string | null
          model: string
          official_detail_fetched_at: string | null
          official_detail_html: string | null
          recipient_document: string | null
          recipient_name: string | null
          series: string | null
          source: string
          source_reference: Json
          status: string | null
          total_value: number | null
          uf: string
          updated_at: string
          xml: string | null
        }
        Insert: {
          access_key: string
          company_id: string
          document_number?: string | null
          first_seen_at?: string
          id?: string
          issue_date?: string | null
          model: string
          official_detail_fetched_at?: string | null
          official_detail_html?: string | null
          recipient_document?: string | null
          recipient_name?: string | null
          series?: string | null
          source: string
          source_reference?: Json
          status?: string | null
          total_value?: number | null
          uf: string
          updated_at?: string
          xml?: string | null
        }
        Update: {
          access_key?: string
          company_id?: string
          document_number?: string | null
          first_seen_at?: string
          id?: string
          issue_date?: string | null
          model?: string
          official_detail_fetched_at?: string | null
          official_detail_html?: string | null
          recipient_document?: string | null
          recipient_name?: string | null
          series?: string | null
          source?: string
          source_reference?: Json
          status?: string | null
          total_value?: number | null
          uf?: string
          updated_at?: string
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_sales_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_sales_probe_results: {
        Row: {
          company_id: string
          created_at: string
          cstat: string | null
          id: string
          note_number: number | null
          raw_response: string | null
          real_key: string | null
          synthetic_key: string | null
          xmotivo: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          cstat?: string | null
          id?: string
          note_number?: number | null
          raw_response?: string | null
          real_key?: string | null
          synthetic_key?: string | null
          xmotivo?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          cstat?: string | null
          id?: string
          note_number?: number | null
          raw_response?: string | null
          real_key?: string | null
          synthetic_key?: string | null
          xmotivo?: string | null
        }
        Relationships: []
      }
      fiscal_sales_reconciliation: {
        Row: {
          access_key: string | null
          attempts: number
          company_id: string
          cstat: string | null
          detail_attempts: number
          detail_last_checked_at: string | null
          detail_last_error: string | null
          detail_status: string
          event_attempts: number
          event_last_checked_at: string | null
          event_last_error: string | null
          event_status: string
          issue_date: string | null
          last_checked_at: string | null
          model: string
          month_code: string | null
          note_number: number
          resolved_at: string | null
          series: string
          status: string
          tried_months: Json
          updated_at: string
          xml_attempts: number
          xml_last_checked_at: string | null
          xml_last_error: string | null
          xml_status: string
          xmotivo: string | null
        }
        Insert: {
          access_key?: string | null
          attempts?: number
          company_id: string
          cstat?: string | null
          detail_attempts?: number
          detail_last_checked_at?: string | null
          detail_last_error?: string | null
          detail_status?: string
          event_attempts?: number
          event_last_checked_at?: string | null
          event_last_error?: string | null
          event_status?: string
          issue_date?: string | null
          last_checked_at?: string | null
          model?: string
          month_code?: string | null
          note_number: number
          resolved_at?: string | null
          series?: string
          status?: string
          tried_months?: Json
          updated_at?: string
          xml_attempts?: number
          xml_last_checked_at?: string | null
          xml_last_error?: string | null
          xml_status?: string
          xmotivo?: string | null
        }
        Update: {
          access_key?: string | null
          attempts?: number
          company_id?: string
          cstat?: string | null
          detail_attempts?: number
          detail_last_checked_at?: string | null
          detail_last_error?: string | null
          detail_status?: string
          event_attempts?: number
          event_last_checked_at?: string | null
          event_last_error?: string | null
          event_status?: string
          issue_date?: string | null
          last_checked_at?: string | null
          model?: string
          month_code?: string | null
          note_number?: number
          resolved_at?: string | null
          series?: string
          status?: string
          tried_months?: Json
          updated_at?: string
          xml_attempts?: number
          xml_last_checked_at?: string | null
          xml_last_error?: string | null
          xml_status?: string
          xmotivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_sales_reconciliation_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_sales_sync_state: {
        Row: {
          backfill_days: number
          company_id: string
          cursor_number: number | null
          detail_complete: boolean
          detail_expected: number
          detail_lease_until: string | null
          detail_pending: number
          detail_saved: number
          found_documents: number
          history_start_month: string
          initial_backfill_done: boolean
          initial_floor_number: number | null
          last_completed_at: string | null
          last_error: string | null
          last_started_at: string | null
          latest_number: number | null
          next_scheduled_at: string | null
          paused: boolean
          reconciliation_cancelled: number
          reconciliation_complete: boolean
          reconciliation_completed_at: string | null
          reconciliation_found: number
          reconciliation_inutilized: number
          reconciliation_missing: number
          reconciliation_not_authorized: number
          reconciliation_pending: number
          reconciliation_resolved: number
          reconciliation_started_at: string | null
          reconciliation_total: number
          scanned_numbers: number
          status: string
          updated_at: string
          xml_complete: boolean
          xml_expected: number
          xml_failed: number
          xml_lease_until: string | null
          xml_pending: number
          xml_saved: number
        }
        Insert: {
          backfill_days?: number
          company_id: string
          cursor_number?: number | null
          detail_complete?: boolean
          detail_expected?: number
          detail_lease_until?: string | null
          detail_pending?: number
          detail_saved?: number
          found_documents?: number
          history_start_month?: string
          initial_backfill_done?: boolean
          initial_floor_number?: number | null
          last_completed_at?: string | null
          last_error?: string | null
          last_started_at?: string | null
          latest_number?: number | null
          next_scheduled_at?: string | null
          paused?: boolean
          reconciliation_cancelled?: number
          reconciliation_complete?: boolean
          reconciliation_completed_at?: string | null
          reconciliation_found?: number
          reconciliation_inutilized?: number
          reconciliation_missing?: number
          reconciliation_not_authorized?: number
          reconciliation_pending?: number
          reconciliation_resolved?: number
          reconciliation_started_at?: string | null
          reconciliation_total?: number
          scanned_numbers?: number
          status?: string
          updated_at?: string
          xml_complete?: boolean
          xml_expected?: number
          xml_failed?: number
          xml_lease_until?: string | null
          xml_pending?: number
          xml_saved?: number
        }
        Update: {
          backfill_days?: number
          company_id?: string
          cursor_number?: number | null
          detail_complete?: boolean
          detail_expected?: number
          detail_lease_until?: string | null
          detail_pending?: number
          detail_saved?: number
          found_documents?: number
          history_start_month?: string
          initial_backfill_done?: boolean
          initial_floor_number?: number | null
          last_completed_at?: string | null
          last_error?: string | null
          last_started_at?: string | null
          latest_number?: number | null
          next_scheduled_at?: string | null
          paused?: boolean
          reconciliation_cancelled?: number
          reconciliation_complete?: boolean
          reconciliation_completed_at?: string | null
          reconciliation_found?: number
          reconciliation_inutilized?: number
          reconciliation_missing?: number
          reconciliation_not_authorized?: number
          reconciliation_pending?: number
          reconciliation_resolved?: number
          reconciliation_started_at?: string | null
          reconciliation_total?: number
          scanned_numbers?: number
          status?: string
          updated_at?: string
          xml_complete?: boolean
          xml_expected?: number
          xml_failed?: number
          xml_lease_until?: string | null
          xml_pending?: number
          xml_saved?: number
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_sales_sync_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_state_credentials: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_verification_status: string | null
          last_verified_at: string | null
          password_ciphertext: string
          password_iv: string
          portal_name: string
          uf: string
          updated_at: string
          username_ciphertext: string
          username_iv: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_verification_status?: string | null
          last_verified_at?: string | null
          password_ciphertext: string
          password_iv: string
          portal_name?: string
          uf: string
          updated_at?: string
          username_ciphertext: string
          username_iv: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_verification_status?: string | null
          last_verified_at?: string | null
          password_ciphertext?: string
          password_iv?: string
          portal_name?: string
          uf?: string
          updated_at?: string
          username_ciphertext?: string
          username_iv?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_state_credentials_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_sync_logs: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          documentos_encontrados: number | null
          documentos_erro: number | null
          documentos_processados: number | null
          id: string
          mensagem_erro: string | null
          periodo_fim: string
          periodo_inicio: string
          status: string
          sync_type: string
          tempo_duracao: number | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          documentos_encontrados?: number | null
          documentos_erro?: number | null
          documentos_processados?: number | null
          id?: string
          mensagem_erro?: string | null
          periodo_fim: string
          periodo_inicio: string
          status?: string
          sync_type: string
          tempo_duracao?: number | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          documentos_encontrados?: number | null
          documentos_erro?: number | null
          documentos_processados?: number | null
          id?: string
          mensagem_erro?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          sync_type?: string
          tempo_duracao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_sync_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "fiscal_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_lancamentos: {
        Row: {
          client_id: string
          competencia: string
          conta_credito: string | null
          conta_debito: string | null
          created_at: string
          data: string | null
          historico: string | null
          id: string
          justificativa: string | null
          ordem: number
          source_upload_id: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          client_id: string
          competencia: string
          conta_credito?: string | null
          conta_debito?: string | null
          created_at?: string
          data?: string | null
          historico?: string | null
          id?: string
          justificativa?: string | null
          ordem?: number
          source_upload_id?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          client_id?: string
          competencia?: string
          conta_credito?: string | null
          conta_debito?: string | null
          created_at?: string
          data?: string | null
          historico?: string | null
          id?: string
          justificativa?: string | null
          ordem?: number
          source_upload_id?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "folha_lancamentos_source_upload_id_fkey"
            columns: ["source_upload_id"]
            isOneToOne: false
            referencedRelation: "folha_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_transcricoes: {
        Row: {
          client_id: string
          competencia: string
          created_at: string
          erro: string | null
          id: string
          linhas: Json
          observacoes_ia: string | null
          status: string
          total_descontos_pdf: number | null
          total_recol_fgts_pdf: number | null
          total_rendimentos_pdf: number | null
          updated_at: string
          upload_id: string
        }
        Insert: {
          client_id: string
          competencia: string
          created_at?: string
          erro?: string | null
          id?: string
          linhas?: Json
          observacoes_ia?: string | null
          status?: string
          total_descontos_pdf?: number | null
          total_recol_fgts_pdf?: number | null
          total_rendimentos_pdf?: number | null
          updated_at?: string
          upload_id: string
        }
        Update: {
          client_id?: string
          competencia?: string
          created_at?: string
          erro?: string | null
          id?: string
          linhas?: Json
          observacoes_ia?: string | null
          status?: string
          total_descontos_pdf?: number | null
          total_recol_fgts_pdf?: number | null
          total_rendimentos_pdf?: number | null
          updated_at?: string
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folha_transcricoes_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: true
            referencedRelation: "folha_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_uploads: {
        Row: {
          client_id: string
          competencia: string
          created_at: string
          id: string
          nome_arquivo: string
          observacoes_ia: string | null
          status: string
          storage_path: string
          total_descontos_documento: number | null
          total_descontos_lancamentos: number | null
          total_liquido_documento: number | null
          total_liquido_lancamentos: number | null
          total_recol_fgts_documento: number | null
          total_rendimentos_documento: number | null
          total_rendimentos_lancamentos: number | null
          ultimo_erro: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          competencia: string
          created_at?: string
          id?: string
          nome_arquivo: string
          observacoes_ia?: string | null
          status?: string
          storage_path: string
          total_descontos_documento?: number | null
          total_descontos_lancamentos?: number | null
          total_liquido_documento?: number | null
          total_liquido_lancamentos?: number | null
          total_recol_fgts_documento?: number | null
          total_rendimentos_documento?: number | null
          total_rendimentos_lancamentos?: number | null
          ultimo_erro?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          competencia?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          observacoes_ia?: string | null
          status?: string
          storage_path?: string
          total_descontos_documento?: number | null
          total_descontos_lancamentos?: number | null
          total_liquido_documento?: number | null
          total_liquido_lancamentos?: number | null
          total_recol_fgts_documento?: number | null
          total_rendimentos_documento?: number | null
          total_rendimentos_lancamentos?: number | null
          ultimo_erro?: string | null
          updated_at?: string
          uploaded_by?: string | null
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
      lancamentos_alinhados: {
        Row: {
          centro_custo_credito: string | null
          centro_custo_debito: string | null
          competencia: string
          created_at: string | null
          credito: string | null
          data: string | null
          debito: string | null
          documento_origem_id: string | null
          historico: string | null
          id: string
          user_id: string
          valor: number | null
        }
        Insert: {
          centro_custo_credito?: string | null
          centro_custo_debito?: string | null
          competencia: string
          created_at?: string | null
          credito?: string | null
          data?: string | null
          debito?: string | null
          documento_origem_id?: string | null
          historico?: string | null
          id?: string
          user_id: string
          valor?: number | null
        }
        Update: {
          centro_custo_credito?: string | null
          centro_custo_debito?: string | null
          competencia?: string
          created_at?: string | null
          credito?: string | null
          data?: string | null
          debito?: string | null
          documento_origem_id?: string | null
          historico?: string | null
          id?: string
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_alinhados_documento_origem_id_fkey"
            columns: ["documento_origem_id"]
            isOneToOne: false
            referencedRelation: "documentos_brutos"
            referencedColumns: ["id"]
          },
        ]
      }
      month_closures: {
        Row: {
          closed_at: string
          created_at: string
          id: string
          month: string
          status: string
          tipo: string
          user_email: string
          user_id: string
          user_name: string
          year: number
        }
        Insert: {
          closed_at?: string
          created_at?: string
          id?: string
          month: string
          status?: string
          tipo?: string
          user_email: string
          user_id: string
          user_name: string
          year: number
        }
        Update: {
          closed_at?: string
          created_at?: string
          id?: string
          month?: string
          status?: string
          tipo?: string
          user_email?: string
          user_id?: string
          user_name?: string
          year?: number
        }
        Relationships: []
      }
      note_items: {
        Row: {
          cfop: string | null
          cst: string | null
          description: string
          id: string
          ncm: string | null
          note_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          cfop?: string | null
          cst?: string | null
          description: string
          id?: string
          ncm?: string | null
          note_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          cfop?: string | null
          cst?: string | null
          description?: string
          id?: string
          ncm?: string | null
          note_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "note_items_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "fiscal_notes"
            referencedColumns: ["id"]
          },
        ]
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
      organization_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_primary: boolean
          organization_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      planos_contas: {
        Row: {
          conteudo: string
          created_at: string | null
          created_by: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string | null
          created_by: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string | null
          created_by?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      processed_documents: {
        Row: {
          created_at: string | null
          doc_type: string
          execution_log: Json | null
          file_name: string
          file_url: string
          id: string
          month: string
          processing_status: string | null
          protocol_id: string | null
          storage_key: string
          upload_date: string | null
          user_email: string
          user_id: string
          user_name: string
          year: number
        }
        Insert: {
          created_at?: string | null
          doc_type: string
          execution_log?: Json | null
          file_name: string
          file_url: string
          id?: string
          month: string
          processing_status?: string | null
          protocol_id?: string | null
          storage_key: string
          upload_date?: string | null
          user_email: string
          user_id: string
          user_name: string
          year: number
        }
        Update: {
          created_at?: string | null
          doc_type?: string
          execution_log?: Json | null
          file_name?: string
          file_url?: string
          id?: string
          month?: string
          processing_status?: string | null
          protocol_id?: string | null
          storage_key?: string
          upload_date?: string | null
          user_email?: string
          user_id?: string
          user_name?: string
          year?: number
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
      saas_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: number
          is_sensitive: boolean
          metadata: Json
          organization_id: string | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          is_sensitive?: boolean
          metadata?: Json
          organization_id?: string | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: never
          is_sensitive?: boolean
          metadata?: Json
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_company_fiscal_profiles: {
        Row: {
          business_mode: string
          certificate_expires_at: string | null
          certificate_pfx_secret_id: string | null
          certificate_secret_id: string | null
          certificate_storage_path: string | null
          certificate_subject: string | null
          city: string | null
          city_ibge_code: string | null
          cnae_primary: string | null
          company_id: string | null
          complement: string | null
          created_at: string
          crt: string | null
          default_cfop_in_state: string | null
          default_cfop_out_state: string | null
          default_iss_rate: number | null
          default_nfse_service_code: string | null
          district: string | null
          email: string | null
          enabled_documents: string[]
          fiscal_environment: string
          fiscal_environment_changed_at: string | null
          fiscal_environment_changed_by: string | null
          id: string
          legal_name: string | null
          logo_path: string | null
          municipal_registration: string | null
          next_number_cte: number | null
          next_number_mdfe: number | null
          next_number_nfce: number | null
          next_number_nfe: number | null
          next_number_nfse: number | null
          nfce_csc_id: string | null
          nfce_csc_token_encrypted: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          postal_code: string | null
          series_cte: string | null
          series_mdfe: string | null
          series_nfce: number | null
          series_nfe: number | null
          series_nfse: string | null
          state: string | null
          state_registration: string | null
          street: string | null
          street_number: string | null
          tax_id: string | null
          tax_regime: string | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          business_mode?: string
          certificate_expires_at?: string | null
          certificate_pfx_secret_id?: string | null
          certificate_secret_id?: string | null
          certificate_storage_path?: string | null
          certificate_subject?: string | null
          city?: string | null
          city_ibge_code?: string | null
          cnae_primary?: string | null
          company_id?: string | null
          complement?: string | null
          created_at?: string
          crt?: string | null
          default_cfop_in_state?: string | null
          default_cfop_out_state?: string | null
          default_iss_rate?: number | null
          default_nfse_service_code?: string | null
          district?: string | null
          email?: string | null
          enabled_documents?: string[]
          fiscal_environment?: string
          fiscal_environment_changed_at?: string | null
          fiscal_environment_changed_by?: string | null
          id?: string
          legal_name?: string | null
          logo_path?: string | null
          municipal_registration?: string | null
          next_number_cte?: number | null
          next_number_mdfe?: number | null
          next_number_nfce?: number | null
          next_number_nfe?: number | null
          next_number_nfse?: number | null
          nfce_csc_id?: string | null
          nfce_csc_token_encrypted?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          series_cte?: string | null
          series_mdfe?: string | null
          series_nfce?: number | null
          series_nfe?: number | null
          series_nfse?: string | null
          state?: string | null
          state_registration?: string | null
          street?: string | null
          street_number?: string | null
          tax_id?: string | null
          tax_regime?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          business_mode?: string
          certificate_expires_at?: string | null
          certificate_pfx_secret_id?: string | null
          certificate_secret_id?: string | null
          certificate_storage_path?: string | null
          certificate_subject?: string | null
          city?: string | null
          city_ibge_code?: string | null
          cnae_primary?: string | null
          company_id?: string | null
          complement?: string | null
          created_at?: string
          crt?: string | null
          default_cfop_in_state?: string | null
          default_cfop_out_state?: string | null
          default_iss_rate?: number | null
          default_nfse_service_code?: string | null
          district?: string | null
          email?: string | null
          enabled_documents?: string[]
          fiscal_environment?: string
          fiscal_environment_changed_at?: string | null
          fiscal_environment_changed_by?: string | null
          id?: string
          legal_name?: string | null
          logo_path?: string | null
          municipal_registration?: string | null
          next_number_cte?: number | null
          next_number_mdfe?: number | null
          next_number_nfce?: number | null
          next_number_nfe?: number | null
          next_number_nfse?: number | null
          nfce_csc_id?: string | null
          nfce_csc_token_encrypted?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          series_cte?: string | null
          series_mdfe?: string | null
          series_nfce?: number | null
          series_nfe?: number | null
          series_nfse?: string | null
          state?: string | null
          state_registration?: string | null
          street?: string | null
          street_number?: string | null
          tax_id?: string | null
          tax_regime?: string | null
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_company_fiscal_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_company_fiscal_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_fiscal_catalog_items: {
        Row: {
          approximate_tax_rate: number | null
          cest: string | null
          cfop_in_state: string | null
          cfop_out_state: string | null
          cnae: string | null
          code: string | null
          cofins_cst: string | null
          cofins_rate: number | null
          cofins_withheld: boolean
          company_id: string | null
          cost_price: number | null
          created_at: string
          csll_withheld: boolean
          csosn: string | null
          description: string | null
          fiscal_notes: string | null
          gtin: string | null
          icms_cst: string | null
          icms_rate: number | null
          icms_reduction_rate: number | null
          id: string
          inss_withheld: boolean
          ipi_cst: string | null
          ipi_rate: number | null
          ir_withheld: boolean
          iss_rate: number | null
          iss_withheld: boolean
          item_type: string
          metadata: Json
          name: string
          ncm: string | null
          organization_id: string
          pis_cst: string | null
          pis_rate: number | null
          pis_withheld: boolean
          product_origin: string | null
          sale_price: number | null
          service_code_municipal: string | null
          service_code_national: string | null
          status: string
          stock_managed: boolean
          stock_minimum: number | null
          stock_quantity: number | null
          unit: string | null
          updated_at: string
          weight_gross: number | null
          weight_net: number | null
        }
        Insert: {
          approximate_tax_rate?: number | null
          cest?: string | null
          cfop_in_state?: string | null
          cfop_out_state?: string | null
          cnae?: string | null
          code?: string | null
          cofins_cst?: string | null
          cofins_rate?: number | null
          cofins_withheld?: boolean
          company_id?: string | null
          cost_price?: number | null
          created_at?: string
          csll_withheld?: boolean
          csosn?: string | null
          description?: string | null
          fiscal_notes?: string | null
          gtin?: string | null
          icms_cst?: string | null
          icms_rate?: number | null
          icms_reduction_rate?: number | null
          id?: string
          inss_withheld?: boolean
          ipi_cst?: string | null
          ipi_rate?: number | null
          ir_withheld?: boolean
          iss_rate?: number | null
          iss_withheld?: boolean
          item_type: string
          metadata?: Json
          name: string
          ncm?: string | null
          organization_id: string
          pis_cst?: string | null
          pis_rate?: number | null
          pis_withheld?: boolean
          product_origin?: string | null
          sale_price?: number | null
          service_code_municipal?: string | null
          service_code_national?: string | null
          status?: string
          stock_managed?: boolean
          stock_minimum?: number | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string
          weight_gross?: number | null
          weight_net?: number | null
        }
        Update: {
          approximate_tax_rate?: number | null
          cest?: string | null
          cfop_in_state?: string | null
          cfop_out_state?: string | null
          cnae?: string | null
          code?: string | null
          cofins_cst?: string | null
          cofins_rate?: number | null
          cofins_withheld?: boolean
          company_id?: string | null
          cost_price?: number | null
          created_at?: string
          csll_withheld?: boolean
          csosn?: string | null
          description?: string | null
          fiscal_notes?: string | null
          gtin?: string | null
          icms_cst?: string | null
          icms_rate?: number | null
          icms_reduction_rate?: number | null
          id?: string
          inss_withheld?: boolean
          ipi_cst?: string | null
          ipi_rate?: number | null
          ir_withheld?: boolean
          iss_rate?: number | null
          iss_withheld?: boolean
          item_type?: string
          metadata?: Json
          name?: string
          ncm?: string | null
          organization_id?: string
          pis_cst?: string | null
          pis_rate?: number | null
          pis_withheld?: boolean
          product_origin?: string | null
          sale_price?: number | null
          service_code_municipal?: string | null
          service_code_national?: string | null
          status?: string
          stock_managed?: boolean
          stock_minimum?: number | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string
          weight_gross?: number | null
          weight_net?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_fiscal_catalog_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_fiscal_catalog_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_fiscal_emissions: {
        Row: {
          access_key: string | null
          authorized_at: string | null
          created_at: string
          document_type: string
          environment: string
          external_issue_date: string | null
          external_source: string | null
          external_source_id: string | null
          id: string
          imported_at: string | null
          number: string | null
          organization_id: string
          payload: Json
          protocol: string | null
          recipient_name: string | null
          recipient_tax_id: string | null
          response: Json
          series: string | null
          source: string
          status: string
          total: number
          updated_at: string
          user_id: string
          xml: string | null
        }
        Insert: {
          access_key?: string | null
          authorized_at?: string | null
          created_at?: string
          document_type: string
          environment?: string
          external_issue_date?: string | null
          external_source?: string | null
          external_source_id?: string | null
          id?: string
          imported_at?: string | null
          number?: string | null
          organization_id: string
          payload?: Json
          protocol?: string | null
          recipient_name?: string | null
          recipient_tax_id?: string | null
          response?: Json
          series?: string | null
          source?: string
          status?: string
          total?: number
          updated_at?: string
          user_id: string
          xml?: string | null
        }
        Update: {
          access_key?: string | null
          authorized_at?: string | null
          created_at?: string
          document_type?: string
          environment?: string
          external_issue_date?: string | null
          external_source?: string | null
          external_source_id?: string | null
          id?: string
          imported_at?: string | null
          number?: string | null
          organization_id?: string
          payload?: Json
          protocol?: string | null
          recipient_name?: string | null
          recipient_tax_id?: string | null
          response?: Json
          series?: string | null
          source?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_fiscal_emissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_fiscal_parties: {
        Row: {
          antt_category: string | null
          bank_account: string | null
          bank_branch: string | null
          bank_name: string | null
          billing_email: string | null
          city: string | null
          city_ibge_code: string | null
          company_id: string | null
          complement: string | null
          contact_name: string | null
          country: string
          country_code: string | null
          created_at: string
          credit_limit: number | null
          district: string | null
          email: string | null
          final_consumer: boolean
          freight_default_mode: string | null
          icms_taxpayer: boolean
          id: string
          ie_indicator: string | null
          legal_name: string
          metadata: Json
          mobile: string | null
          municipal_registration: string | null
          notes: string | null
          organization_id: string
          party_type: string
          payment_terms: string | null
          person_type: string
          phone: string | null
          pix_key: string | null
          postal_code: string | null
          rntrc: string | null
          state: string | null
          state_registration: string | null
          status: string
          street: string | null
          street_number: string | null
          suframa: string | null
          tax_id: string | null
          tax_regime: string | null
          trade_name: string | null
          updated_at: string
          vehicle_plate: string | null
          vehicle_rntc: string | null
          vehicle_state: string | null
          website: string | null
        }
        Insert: {
          antt_category?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          billing_email?: string | null
          city?: string | null
          city_ibge_code?: string | null
          company_id?: string | null
          complement?: string | null
          contact_name?: string | null
          country?: string
          country_code?: string | null
          created_at?: string
          credit_limit?: number | null
          district?: string | null
          email?: string | null
          final_consumer?: boolean
          freight_default_mode?: string | null
          icms_taxpayer?: boolean
          id?: string
          ie_indicator?: string | null
          legal_name: string
          metadata?: Json
          mobile?: string | null
          municipal_registration?: string | null
          notes?: string | null
          organization_id: string
          party_type: string
          payment_terms?: string | null
          person_type?: string
          phone?: string | null
          pix_key?: string | null
          postal_code?: string | null
          rntrc?: string | null
          state?: string | null
          state_registration?: string | null
          status?: string
          street?: string | null
          street_number?: string | null
          suframa?: string | null
          tax_id?: string | null
          tax_regime?: string | null
          trade_name?: string | null
          updated_at?: string
          vehicle_plate?: string | null
          vehicle_rntc?: string | null
          vehicle_state?: string | null
          website?: string | null
        }
        Update: {
          antt_category?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          billing_email?: string | null
          city?: string | null
          city_ibge_code?: string | null
          company_id?: string | null
          complement?: string | null
          contact_name?: string | null
          country?: string
          country_code?: string | null
          created_at?: string
          credit_limit?: number | null
          district?: string | null
          email?: string | null
          final_consumer?: boolean
          freight_default_mode?: string | null
          icms_taxpayer?: boolean
          id?: string
          ie_indicator?: string | null
          legal_name?: string
          metadata?: Json
          mobile?: string | null
          municipal_registration?: string | null
          notes?: string | null
          organization_id?: string
          party_type?: string
          payment_terms?: string | null
          person_type?: string
          phone?: string | null
          pix_key?: string | null
          postal_code?: string | null
          rntrc?: string | null
          state?: string | null
          state_registration?: string | null
          status?: string
          street?: string | null
          street_number?: string | null
          suframa?: string | null
          tax_id?: string | null
          tax_regime?: string | null
          trade_name?: string | null
          updated_at?: string
          vehicle_plate?: string | null
          vehicle_rntc?: string | null
          vehicle_state?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saas_fiscal_parties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_fiscal_parties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saas_plans: {
        Row: {
          code: string
          created_at: string
          features: Json
          id: string
          limits: Json
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          features?: Json
          id?: string
          limits?: Json
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          features?: Json
          id?: string
          limits?: Json
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      saas_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          organization_id: string
          plan_id: string
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          organization_id: string
          plan_id: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          organization_id?: string
          plan_id?: string
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saas_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "saas_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          storage_limit_gb: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          storage_limit_gb?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          storage_limit_gb?: number
          updated_at?: string
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
      uploads: {
        Row: {
          created_at: string
          file_name: string
          id: string
          month: string
          upload_date: string
          user_email: string
          user_id: string
          user_name: string
          year: number
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          month: string
          upload_date?: string
          user_email: string
          user_id: string
          user_name: string
          year: number
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          month?: string
          upload_date?: string
          user_email?: string
          user_id?: string
          user_name?: string
          year?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      _run_al_danfe_enum: {
        Args: { p_cnf?: string; p_month?: string; p_number?: number }
        Returns: number
      }
      _run_al_danfe_fetch: { Args: { p_key: string }; Returns: number }
      _run_al_sales_probe:
        | { Args: { p_target?: string }; Returns: number }
        | { Args: { p_period?: string; p_target?: string }; Returns: number }
      _run_svrs_chain_discover: { Args: never; Returns: number }
      _run_svrs_consit: {
        Args: { p_month?: string; p_number?: number }
        Returns: number
      }
      _run_svrs_consit_node: {
        Args: { p_month?: string; p_number?: number }
        Returns: number
      }
      _run_svrs_consit_tls: {
        Args: { p_month?: string; p_number?: number }
        Returns: number
      }
      _run_svrs_download_xml: { Args: { p_key: string }; Returns: number }
      _run_svrs_download_xml_bridge: {
        Args: { p_key: string }
        Returns: number
      }
      _run_svrs_nfce_probe: { Args: never; Returns: number }
      _run_svrs_node_probe: { Args: never; Returns: number }
      _run_svrs_sales_batch: {
        Args: { p_end?: number; p_month?: string; p_start?: number }
        Returns: number
      }
      claim_fiscal_sales_worker_lease: {
        Args: { p_company_id: string; p_seconds?: number; p_worker: string }
        Returns: boolean
      }
      delete_expired_documents: { Args: never; Returns: undefined }
      foldername: { Args: never; Returns: string }
      get_saas_certificate_bundle: { Args: { _org_id: string }; Returns: Json }
      get_saas_certificate_password: {
        Args: { _org_id: string }
        Returns: string
      }
      get_ws_test_a1_credentials: {
        Args: never
        Returns: {
          certificate_password: string
          pfx_base64: string
        }[]
      }
      is_valid_cnpj: { Args: { value: string }; Returns: boolean }
      is_valid_cpf: { Args: { value: string }; Returns: boolean }
      mark_expired_documents: { Args: never; Returns: undefined }
      release_fiscal_sales_worker_lease: {
        Args: { p_company_id: string; p_worker: string }
        Returns: undefined
      }
      set_document_expiration: { Args: never; Returns: undefined }
      set_saas_certificate_password: {
        Args: { _org_id: string; _password: string }
        Returns: string
      }
      trigger_fiscal_purchase_report_backfill: {
        Args: { p_end: string; p_start: string }
        Returns: number
      }
      trigger_fiscal_purchase_supplemental: { Args: never; Returns: Json }
      trigger_fiscal_purchases_cron: { Args: never; Returns: number }
      trigger_fiscal_purchases_xml_backfill: { Args: never; Returns: Json }
      trigger_fiscal_sales_cron: { Args: never; Returns: undefined }
      trigger_fiscal_sales_detail_backfill: { Args: never; Returns: number }
      trigger_fiscal_sales_event_backfill: { Args: never; Returns: number }
      trigger_fiscal_sales_xml_backfill: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "client" | "fiscal" | "contabil" | "geral"
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
      app_role: ["admin", "client", "fiscal", "contabil", "geral"],
    },
  },
} as const
