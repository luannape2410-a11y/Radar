
-- UNIDADES (secretarias, fundos, órgãos)
CREATE TABLE public.unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  tipo text NOT NULL DEFAULT 'Secretaria', -- Secretaria | Fundo | Órgão | Outro
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SUBELEMENTOS (natureza da despesa 3.x.xx.xx.xx)
CREATE TABLE public.subelementos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  descricao text NOT NULL,
  categoria text,    -- 1º dígito
  grupo text,        -- 2º dígito
  modalidade text,   -- 3º bloco
  elemento text,     -- 4º bloco
  subelemento text,  -- 5º bloco
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FORNECEDORES
CREATE TABLE public.fornecedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- CONTRATOS
CREATE TABLE public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL,
  objeto text,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  valor_total numeric(18,2) DEFAULT 0,
  data_inicio date,
  data_fim date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- LANCAMENTOS (execução orçamentária)
CREATE TABLE public.lancamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercicio integer NOT NULL,
  mes integer NOT NULL DEFAULT 12 CHECK (mes BETWEEN 1 AND 12),
  unidade_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  subelemento_id uuid NOT NULL REFERENCES public.subelementos(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.fornecedores(id) ON DELETE SET NULL,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  funcao text,
  subfuncao text,
  programa text,
  fonte_recurso text,
  valor_dotacao numeric(18,2) NOT NULL DEFAULT 0,
  valor_empenhado numeric(18,2) NOT NULL DEFAULT 0,
  valor_liquidado numeric(18,2) NOT NULL DEFAULT 0,
  valor_pago numeric(18,2) NOT NULL DEFAULT 0,
  observacao text,
  origem text DEFAULT 'manual', -- manual | importacao
  importacao_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lanc_exercicio ON public.lancamentos(exercicio);
CREATE INDEX idx_lanc_unidade ON public.lancamentos(unidade_id);
CREATE INDEX idx_lanc_subelemento ON public.lancamentos(subelemento_id);
CREATE INDEX idx_lanc_fornecedor ON public.lancamentos(fornecedor_id);
CREATE INDEX idx_lanc_mes ON public.lancamentos(exercicio, mes);

-- IMPORTACOES
CREATE TABLE public.importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_nome text NOT NULL,
  exercicio integer,
  total_linhas integer DEFAULT 0,
  total_valor numeric(18,2) DEFAULT 0,
  status text DEFAULT 'sucesso',
  mensagem text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_unidades_upd BEFORE UPDATE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_lanc_upd BEFORE UPDATE ON public.lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS aberto (painel sem autenticação)
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subelementos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['unidades','subelementos','fornecedores','contratos','lancamentos','importacoes']) LOOP
    EXECUTE format('CREATE POLICY "public_select" ON public.%I FOR SELECT USING (true);', t);
    EXECUTE format('CREATE POLICY "public_insert" ON public.%I FOR INSERT WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "public_update" ON public.%I FOR UPDATE USING (true);', t);
    EXECUTE format('CREATE POLICY "public_delete" ON public.%I FOR DELETE USING (true);', t);
  END LOOP;
END $$;
