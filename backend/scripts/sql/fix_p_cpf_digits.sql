BEGIN;

ALTER TABLE "Paciente"
  ADD COLUMN IF NOT EXISTS "p_cpf_digits" TEXT;

UPDATE "Paciente"
SET "p_cpf_digits" = regexp_replace(COALESCE("p_cpf", ''), '\D', '', 'g')
WHERE "p_cpf_digits" IS NULL OR "p_cpf_digits" = '';

CREATE INDEX IF NOT EXISTS "Paciente_p_cpf_digits_idx"
  ON "Paciente" ("p_cpf_digits");

COMMIT;