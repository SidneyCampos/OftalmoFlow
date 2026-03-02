BEGIN;

-- ===== Paciente.p_nascimento =====
DO $$
DECLARE t text;
BEGIN
  SELECT data_type INTO t
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='Paciente' AND column_name='p_nascimento';

  IF t IN ('text','character varying') THEN
    EXECUTE $q$
      ALTER TABLE "Paciente"
      ALTER COLUMN "p_nascimento" TYPE DATE
      USING (
        CASE
          WHEN "p_nascimento" IS NULL OR "p_nascimento" = '' THEN NULL
          WHEN "p_nascimento" ~ '^\d{2}/\d{2}/\d{4}' THEN to_date(substring("p_nascimento" from 1 for 10), 'DD/MM/YYYY')
          WHEN "p_nascimento" ~ '^\d{4}-\d{2}-\d{2}' THEN to_date(substring("p_nascimento" from 1 for 10), 'YYYY-MM-DD')
          ELSE NULL
        END
      );
    $q$;
  ELSIF t LIKE 'timestamp%' THEN
    EXECUTE 'ALTER TABLE "Paciente" ALTER COLUMN "p_nascimento" TYPE DATE USING ("p_nascimento")::date;';
  END IF;
END $$;

-- ===== Paciente.p_data =====
DO $$
DECLARE t text;
BEGIN
  SELECT data_type INTO t
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='Paciente' AND column_name='p_data';

  IF t IN ('text','character varying') THEN
    EXECUTE $q$
      ALTER TABLE "Paciente"
      ALTER COLUMN "p_data" TYPE DATE
      USING (
        CASE
          WHEN "p_data" IS NULL OR "p_data" = '' THEN NULL
          WHEN "p_data" ~ '^\d{2}/\d{2}/\d{4}' THEN to_date(substring("p_data" from 1 for 10), 'DD/MM/YYYY')
          WHEN "p_data" ~ '^\d{4}-\d{2}-\d{2}' THEN to_date(substring("p_data" from 1 for 10), 'YYYY-MM-DD')
          ELSE NULL
        END
      );
    $q$;
  ELSIF t LIKE 'timestamp%' THEN
    EXECUTE 'ALTER TABLE "Paciente" ALTER COLUMN "p_data" TYPE DATE USING ("p_data")::date;';
  END IF;
END $$;

-- ===== Consulta.c_dataConsulta =====
DO $$
DECLARE t text;
BEGIN
  SELECT data_type INTO t
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='Consulta' AND column_name='c_dataConsulta';

  IF t IN ('text','character varying') THEN
    EXECUTE $q$
      ALTER TABLE "Consulta"
      ALTER COLUMN "c_dataConsulta" TYPE DATE
      USING (
        CASE
          WHEN "c_dataConsulta" IS NULL OR "c_dataConsulta" = '' THEN NULL
          WHEN "c_dataConsulta" ~ '^\d{2}/\d{2}/\d{4}' THEN to_date(substring("c_dataConsulta" from 1 for 10), 'DD/MM/YYYY')
          WHEN "c_dataConsulta" ~ '^\d{4}-\d{2}-\d{2}' THEN to_date(substring("c_dataConsulta" from 1 for 10), 'YYYY-MM-DD')
          ELSE NULL
        END
      );
    $q$;
  ELSIF t LIKE 'timestamp%' THEN
    EXECUTE 'ALTER TABLE "Consulta" ALTER COLUMN "c_dataConsulta" TYPE DATE USING ("c_dataConsulta")::date;';
  END IF;
END $$;

-- ===== FilaAtendimento.dia =====
DO $$
DECLARE t text;
BEGIN
  SELECT data_type INTO t
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='FilaAtendimento' AND column_name='dia';

  IF t IN ('text','character varying') THEN
    EXECUTE $q$
      ALTER TABLE "FilaAtendimento"
      ALTER COLUMN "dia" TYPE DATE
      USING (
        CASE
          WHEN "dia" IS NULL OR "dia" = '' THEN NULL
          WHEN "dia" ~ '^\d{2}/\d{2}/\d{4}' THEN to_date(substring("dia" from 1 for 10), 'DD/MM/YYYY')
          WHEN "dia" ~ '^\d{4}-\d{2}-\d{2}' THEN to_date(substring("dia" from 1 for 10), 'YYYY-MM-DD')
          ELSE NULL
        END
      );
    $q$;
  ELSIF t LIKE 'timestamp%' THEN
    EXECUTE 'ALTER TABLE "FilaAtendimento" ALTER COLUMN "dia" TYPE DATE USING ("dia")::date;';
  END IF;
END $$;

COMMIT;