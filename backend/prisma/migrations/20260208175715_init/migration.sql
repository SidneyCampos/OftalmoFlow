-- CreateEnum
CREATE TYPE "StatusFila" AS ENUM ('NA_FILA', 'CHAMADO', 'FINALIZADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "Paciente" (
    "id_paciente" SERIAL NOT NULL,
    "p_nome" TEXT NOT NULL,
    "p_mae" TEXT,
    "p_cpf" VARCHAR(20),
    "p_cpf_digits" VARCHAR(11),
    "p_rg" VARCHAR(30),
    "p_endereco" TEXT,
    "p_cidade" TEXT,
    "p_fone" VARCHAR(30),
    "p_nascimento" DATE,
    "p_data" DATE,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id_paciente")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id_consulta" SERIAL NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "c_queixaPessoal" TEXT,
    "c_historicoPessoal" TEXT,
    "c_historicoFamiliar" TEXT,
    "c_acuidadeOd" TEXT,
    "c_acuidadeOe" TEXT,
    "c_bioOd" TEXT,
    "c_bioOe" TEXT,
    "c_fundoOlhoOd" TEXT,
    "c_fundoOlhoOe" TEXT,
    "c_pressaoOcularOd" TEXT,
    "c_pressaoOcularOe" TEXT,
    "c_condutaConsulta" TEXT,
    "c_geral" TEXT,
    "c_dataConsulta" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id_consulta")
);

-- CreateTable
CREATE TABLE "FilaAtendimento" (
    "id_fila" SERIAL NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "dia" DATE NOT NULL,
    "status" "StatusFila" NOT NULL DEFAULT 'NA_FILA',
    "chegada_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chamado_em" TIMESTAMP(3),
    "finalizado_em" TIMESTAMP(3),
    "observacao" TEXT,

    CONSTRAINT "FilaAtendimento_pkey" PRIMARY KEY ("id_fila")
);

-- CreateIndex
CREATE INDEX "Paciente_p_nome_idx" ON "Paciente"("p_nome");

-- CreateIndex
CREATE INDEX "Paciente_p_cpf_digits_idx" ON "Paciente"("p_cpf_digits");

-- CreateIndex
CREATE INDEX "Consulta_id_paciente_idx" ON "Consulta"("id_paciente");

-- CreateIndex
CREATE INDEX "Consulta_c_dataConsulta_idx" ON "Consulta"("c_dataConsulta");

-- CreateIndex
CREATE INDEX "FilaAtendimento_dia_status_idx" ON "FilaAtendimento"("dia", "status");

-- CreateIndex
CREATE INDEX "FilaAtendimento_id_paciente_idx" ON "FilaAtendimento"("id_paciente");

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "Paciente"("id_paciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaAtendimento" ADD CONSTRAINT "FilaAtendimento_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "Paciente"("id_paciente") ON DELETE RESTRICT ON UPDATE CASCADE;
