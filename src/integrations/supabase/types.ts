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
      contratos: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          fornecedor_id: string | null
          id: string
          numero: string
          objeto: string | null
          unidade_id: string | null
          valor_total: number | null
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          fornecedor_id?: string | null
          id?: string
          numero: string
          objeto?: string | null
          unidade_id?: string | null
          valor_total?: number | null
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          fornecedor_id?: string | null
          id?: string
          numero?: string
          objeto?: string | null
          unidade_id?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      importacoes: {
        Row: {
          arquivo_nome: string
          created_at: string
          exercicio: number | null
          id: string
          mensagem: string | null
          status: string | null
          total_linhas: number | null
          total_valor: number | null
        }
        Insert: {
          arquivo_nome: string
          created_at?: string
          exercicio?: number | null
          id?: string
          mensagem?: string | null
          status?: string | null
          total_linhas?: number | null
          total_valor?: number | null
        }
        Update: {
          arquivo_nome?: string
          created_at?: string
          exercicio?: number | null
          id?: string
          mensagem?: string | null
          status?: string | null
          total_linhas?: number | null
          total_valor?: number | null
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          contrato_id: string | null
          created_at: string
          exercicio: number
          fonte_recurso: string | null
          fornecedor_id: string | null
          funcao: string | null
          id: string
          importacao_id: string | null
          mes: number
          observacao: string | null
          origem: string | null
          programa: string | null
          subelemento_id: string
          subfuncao: string | null
          unidade_id: string
          updated_at: string
          valor_dotacao: number
          valor_empenhado: number
          valor_liquidado: number
          valor_pago: number
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          exercicio: number
          fonte_recurso?: string | null
          fornecedor_id?: string | null
          funcao?: string | null
          id?: string
          importacao_id?: string | null
          mes?: number
          observacao?: string | null
          origem?: string | null
          programa?: string | null
          subelemento_id: string
          subfuncao?: string | null
          unidade_id: string
          updated_at?: string
          valor_dotacao?: number
          valor_empenhado?: number
          valor_liquidado?: number
          valor_pago?: number
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          exercicio?: number
          fonte_recurso?: string | null
          fornecedor_id?: string | null
          funcao?: string | null
          id?: string
          importacao_id?: string | null
          mes?: number
          observacao?: string | null
          origem?: string | null
          programa?: string | null
          subelemento_id?: string
          subfuncao?: string | null
          unidade_id?: string
          updated_at?: string
          valor_dotacao?: number
          valor_empenhado?: number
          valor_liquidado?: number
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_subelemento_id_fkey"
            columns: ["subelemento_id"]
            isOneToOne: false
            referencedRelation: "subelementos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      subelementos: {
        Row: {
          categoria: string | null
          codigo: string
          created_at: string
          descricao: string
          elemento: string | null
          grupo: string | null
          id: string
          modalidade: string | null
          subelemento: string | null
        }
        Insert: {
          categoria?: string | null
          codigo: string
          created_at?: string
          descricao: string
          elemento?: string | null
          grupo?: string | null
          id?: string
          modalidade?: string | null
          subelemento?: string | null
        }
        Update: {
          categoria?: string | null
          codigo?: string
          created_at?: string
          descricao?: string
          elemento?: string | null
          grupo?: string | null
          id?: string
          modalidade?: string | null
          subelemento?: string | null
        }
        Relationships: []
      }
      unidades: {
        Row: {
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
