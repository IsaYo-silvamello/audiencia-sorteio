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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      atribuicoes: {
        Row: {
          audiencia_id: string
          created_at: string
          id: string
          pessoa_id: string
          semana_inicio: string
        }
        Insert: {
          audiencia_id: string
          created_at?: string
          id?: string
          pessoa_id: string
          semana_inicio: string
        }
        Update: {
          audiencia_id?: string
          created_at?: string
          id?: string
          pessoa_id?: string
          semana_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "atribuicoes_audiencia_id_fkey"
            columns: ["audiencia_id"]
            isOneToOne: false
            referencedRelation: "audiencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atribuicoes_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      audiencias: {
        Row: {
          adv_do_autor: string | null
          adv_responsavel: string | null
          advogado: string | null
          assunto: string | null
          autor: string
          carteira: string | null
          comarca: string | null
          contato_cartorio: string | null
          created_at: string
          data_audiencia: string | null
          documentacao: string | null
          estrategia: string | null
          estrategia_smaa: string | null
          foro: string | null
          hora_audiencia: string | null
          id: string
          id_planilha: string | null
          link: string | null
          local: string | null
          npc_dossie: string | null
          numero_processo: string | null
          observacoes: string | null
          preposto: string | null
          reu: string
          status: string
          tipo_audiencia: string | null
        }
        Insert: {
          adv_do_autor?: string | null
          adv_responsavel?: string | null
          advogado?: string | null
          assunto?: string | null
          autor?: string
          carteira?: string | null
          comarca?: string | null
          contato_cartorio?: string | null
          created_at?: string
          data_audiencia?: string | null
          documentacao?: string | null
          estrategia?: string | null
          estrategia_smaa?: string | null
          foro?: string | null
          hora_audiencia?: string | null
          id?: string
          id_planilha?: string | null
          link?: string | null
          local?: string | null
          npc_dossie?: string | null
          numero_processo?: string | null
          observacoes?: string | null
          preposto?: string | null
          reu?: string
          status?: string
          tipo_audiencia?: string | null
        }
        Update: {
          adv_do_autor?: string | null
          adv_responsavel?: string | null
          advogado?: string | null
          assunto?: string | null
          autor?: string
          carteira?: string | null
          comarca?: string | null
          contato_cartorio?: string | null
          created_at?: string
          data_audiencia?: string | null
          documentacao?: string | null
          estrategia?: string | null
          estrategia_smaa?: string | null
          foro?: string | null
          hora_audiencia?: string | null
          id?: string
          id_planilha?: string | null
          link?: string | null
          local?: string | null
          npc_dossie?: string | null
          numero_processo?: string | null
          observacoes?: string | null
          preposto?: string | null
          reu?: string
          status?: string
          tipo_audiencia?: string | null
        }
        Relationships: []
      }
      historico_importacoes: {
        Row: {
          arquivos: string
          atualizados: number
          data_importacao: string
          id: string
          inseridos: number
          total_registros: number
        }
        Insert: {
          arquivos?: string
          atualizados?: number
          data_importacao?: string
          id?: string
          inseridos?: number
          total_registros?: number
        }
        Update: {
          arquivos?: string
          atualizados?: number
          data_importacao?: string
          id?: string
          inseridos?: number
          total_registros?: number
        }
        Relationships: []
      }
      historico_sorteios: {
        Row: {
          atribuidas: number
          created_at: string | null
          detalhes: string | null
          executado_em: string
          id: string
          presenciais: number
          sem_disponivel: number
          semana_inicio: string | null
          total: number
        }
        Insert: {
          atribuidas?: number
          created_at?: string | null
          detalhes?: string | null
          executado_em?: string
          id?: string
          presenciais?: number
          sem_disponivel?: number
          semana_inicio?: string | null
          total?: number
        }
        Update: {
          atribuidas?: number
          created_at?: string | null
          detalhes?: string | null
          executado_em?: string
          id?: string
          presenciais?: number
          sem_disponivel?: number
          semana_inicio?: string | null
          total?: number
        }
        Relationships: []
      }
      pautas_semanais: {
        Row: {
          created_at: string | null
          finalizada_em: string | null
          id: string
          semana_fim: string
          semana_inicio: string
          status: string
        }
        Insert: {
          created_at?: string | null
          finalizada_em?: string | null
          id?: string
          semana_fim: string
          semana_inicio: string
          status?: string
        }
        Update: {
          created_at?: string | null
          finalizada_em?: string | null
          id?: string
          semana_fim?: string
          semana_inicio?: string
          status?: string
        }
        Relationships: []
      }
      pessoas: {
        Row: {
          ativo: boolean
          carteira: string | null
          created_at: string
          documento: string | null
          equipe: string | null
          estado: string | null
          id: string
          nome: string
          observacao: string | null
          tipo: string
          tipo_advogado: string | null
          valor_audiencia: number | null
        }
        Insert: {
          ativo?: boolean
          carteira?: string | null
          created_at?: string
          documento?: string | null
          equipe?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacao?: string | null
          tipo: string
          tipo_advogado?: string | null
          valor_audiencia?: number | null
        }
        Update: {
          ativo?: boolean
          carteira?: string | null
          created_at?: string
          documento?: string | null
          equipe?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          tipo?: string
          tipo_advogado?: string | null
          valor_audiencia?: number | null
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
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
