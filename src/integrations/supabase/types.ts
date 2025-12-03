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
    PostgrestVersion: "12.2.3 (519615d)"
  }
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
      companies: {
        Row: {
          address: string | null
          certificate_data: string | null
          certificate_password: string | null
          cnpj: string
          company_name: string
          company_size: string | null
          created_at: string
          id: string
          is_fiscal_automation_client: boolean | null
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          certificate_data?: string | null
          certificate_password?: string | null
          cnpj: string
          company_name: string
          company_size?: string | null
          created_at?: string
          id?: string
          is_fiscal_automation_client?: boolean | null
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          certificate_data?: string | null
          certificate_password?: string | null
          cnpj?: string
          company_name?: string
          company_size?: string | null
          created_at?: string
          id?: string
          is_fiscal_automation_client?: boolean | null
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
          status: string | null
          total_lancamentos: number | null
          user_email: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          arquivo_csv_url?: string | null
          arquivo_excel_url?: string | null
          competencia: string
          created_at?: string | null
          id?: string
          status?: string | null
          total_lancamentos?: number | null
          user_email?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          arquivo_csv_url?: string | null
          arquivo_excel_url?: string | null
          competencia?: string
          created_at?: string | null
          id?: string
          status?: string | null
          total_lancamentos?: number | null
          user_email?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      fiscal_certificates: {
        Row: {
          certificate_data: string
          certificate_name: string
          company_id: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          password_hash: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          certificate_data: string
          certificate_name: string
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          password_hash: string
          valid_from: string
          valid_until: string
        }
        Update: {
          certificate_data?: string
          certificate_name?: string
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          password_hash?: string
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
          cnpj: string
          created_at: string
          created_by: string
          endereco: Json | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          nome_fantasia: string | null
          razao_social: string
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          created_by: string
          endereco?: Json | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          razao_social: string
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          created_by?: string
          endereco?: Json | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          updated_at?: string
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
      lancamentos: {
        Row: {
          credito: string | null
          data: string | null
          debito: string | null
          historico: string | null
          valor: string
        }
        Insert: {
          credito?: string | null
          data?: string | null
          debito?: string | null
          historico?: string | null
          valor: string
        }
        Update: {
          credito?: string | null
          data?: string | null
          debito?: string | null
          historico?: string | null
          valor?: string
        }
        Relationships: []
      }
      lancamentos_alinhados: {
        Row: {
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
      delete_expired_documents: { Args: never; Returns: undefined }
      foldername:
        | { Args: { name: string }; Returns: string }
        | { Args: never; Returns: string }
      get_user_company_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_user_admin: { Args: never; Returns: boolean }
      mark_expired_documents: { Args: never; Returns: undefined }
      set_document_expiration: { Args: never; Returns: undefined }
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
