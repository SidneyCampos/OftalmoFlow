-- Add generic fields to Consulta
ALTER TABLE "Consulta"
ADD COLUMN     "c_especialidade" TEXT NOT NULL DEFAULT 'Geral',
ADD COLUMN     "c_diagnostico" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "c_medicacoesEmUso" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "c_alergias" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "c_receita" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "c_exameFisico" TEXT NOT NULL DEFAULT '';
