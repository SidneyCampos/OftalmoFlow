-- Add new patient registration fields: documento, sexo, pai, estado civil, profissão, naturalidade
ALTER TABLE "Paciente"
  ADD COLUMN "p_documento" TEXT,
  ADD COLUMN "p_sexo" TEXT,
  ADD COLUMN "p_pai" TEXT,
  ADD COLUMN "p_estado_civil" TEXT,
  ADD COLUMN "p_profissao" TEXT,
  ADD COLUMN "p_naturalidade" TEXT;
