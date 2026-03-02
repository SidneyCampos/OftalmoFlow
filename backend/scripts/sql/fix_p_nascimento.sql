BEGIN;

-- Converte p_nascimento (texto) para timestamp, suportando DD/MM/YYYY e YYYY-MM-DD...
ALTER TABLE "Paciente"
  ALTER COLUMN "p_nascimento" TYPE timestamp(3)
  USING (
    CASE
      WHEN "p_nascimento" IS NULL OR "p_nascimento" = '' THEN NULL
      WHEN "p_nascimento" ~ '^\d{2}/\d{2}/\d{4}$' THEN to_date("p_nascimento", 'DD/MM/YYYY')::timestamp
      WHEN "p_nascimento" ~ '^\d{4}-\d{2}-\d{2}' THEN ("p_nascimento")::timestamp
      ELSE NULL
    END
  );

COMMIT;