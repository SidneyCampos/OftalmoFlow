// backend/scripts/migrate_mssql_to_pg.js (CommonJS)
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const sql = require("mssql");
const { PrismaClient } = require("@prisma/client");

function pickEnvPath() {
  const idx = process.argv.indexOf("--env");
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];

  // compatível com quem tentou usar `dotenv_config_path=.env.mssql`
  const arg = process.argv.find((a) => a.startsWith("dotenv_config_path="));
  if (arg) return arg.split("=")[1];

  if (process.env.DOTENV_CONFIG_PATH) return process.env.DOTENV_CONFIG_PATH;

  // padrão
  return ".env.mssql";
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getSequenceName(prisma, table, column) {
  // tenta serial
  const serial = await prisma.$queryRawUnsafe(
    `SELECT pg_get_serial_sequence('"${table}"', '${column}') AS seq;`
  );
  if (serial?.[0]?.seq) return serial[0].seq;

  // tenta identity (Postgres mais novo)
  const identity = await prisma.$queryRawUnsafe(
    `SELECT pg_get_identity_sequence('"${table}"', '${column}') AS seq;`
  );
  if (identity?.[0]?.seq) return identity[0].seq;

  return null;
}

async function setSequenceToMax(prisma, table, idColumn) {
  const seq = await getSequenceName(prisma, table, idColumn);
  if (!seq) {
    console.log(`⚠️ Não achei sequence para ${table}.${idColumn} (ok se não existir).`);
    return;
  }

  await prisma.$executeRawUnsafe(
    `SELECT setval('${seq}', COALESCE((SELECT MAX("${idColumn}") FROM "${table}"), 1), true);`
  );
  console.log(`✅ Sequence ajustada: ${seq}`);
}

async function main() {
  const envPath = pickEnvPath();
  const fullEnvPath = path.resolve(process.cwd(), envPath);

  if (!fs.existsSync(fullEnvPath)) {
    throw new Error(`Não achei o arquivo de env do MSSQL: ${fullEnvPath}`);
  }

  dotenv.config({ path: fullEnvPath });

  // Prisma usa DATABASE_URL do .env normal do backend
  // então carregue também o .env principal se ainda não estiver carregado.
  const mainEnvPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(mainEnvPath)) dotenv.config({ path: mainEnvPath });

  const prisma = new PrismaClient();

  const mssqlConfig = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_SERVER,
    database: process.env.MSSQL_DATABASE,
    options: {
      instanceName: process.env.MSSQL_INSTANCE || undefined,
      trustServerCertificate: true,
      encrypt: false,
    },
  };

  if (!mssqlConfig.user || !mssqlConfig.password || !mssqlConfig.server || !mssqlConfig.database) {
    throw new Error(
      "Faltou variável no .env.mssql. Precisa de MSSQL_USER, MSSQL_PASSWORD, MSSQL_SERVER, MSSQL_DATABASE (e opcional MSSQL_INSTANCE)."
    );
  }

  console.log("Conectando no SQL Server...");
  const pool = await sql.connect(mssqlConfig);

  console.log("Lendo Pacientes do SQL Server...");
  const pacientesRes = await pool.request().query(`
    SELECT
      id_paciente,
      ISNULL(p_nome, '') AS p_nome,
      p_mae,
      p_cpf,
      p_rg,
      p_endereco,
      p_cidade,
      p_fone,

      -- ✅ converte string BR dd/MM/yyyy para date
      TRY_CONVERT(date, p_nascimento, 103) AS p_nascimento,
      TRY_CONVERT(date, p_data, 103)       AS p_data

    FROM dbo.Pacientes
    ORDER BY id_paciente
  `);

  const pacientes = pacientesRes.recordset.map((r) => ({
    id_paciente: r.id_paciente,
    p_nome: r.p_nome ?? "",

    p_mae: r.p_mae ?? null,
    p_cpf: r.p_cpf ?? null,
    p_rg: r.p_rg ?? null,
    p_endereco: r.p_endereco ?? null,
    p_cidade: r.p_cidade ?? null,
    p_fone: r.p_fone ?? null,

    p_nascimento: r.p_nascimento ?? null,
    p_data: r.p_data ?? null,

    p_cpf_digits: null,
  }));

  console.log(`Inserindo ${pacientes.length} pacientes no Postgres...`);
  for (const batch of chunk(pacientes, 1000)) {
    await prisma.paciente.createMany({ data: batch, skipDuplicates: true });
  }

  console.log("Gerando p_cpf_digits...");
  await prisma.$executeRawUnsafe(`
    UPDATE "Paciente"
    SET "p_cpf_digits" =
      substring(
        regexp_replace(COALESCE("p_cpf", ''), '[^0-9]', '', 'g')
        from '([0-9]{11})'
      );
  `);

  console.log("Ajustando sequences...");
  await setSequenceToMax(prisma, "Paciente", "id_paciente");
  await setSequenceToMax(prisma, "Consulta", "id_consulta");
  await setSequenceToMax(prisma, "FilaAtendimento", "id_fila");

  console.log("Fechando conexões...");
  await sql.close();
  await prisma.$disconnect();

  console.log("✅ Migração concluída.");
}

main().catch(async (e) => {
  console.error("❌ Erro na migração:", e);
  try { await sql.close(); } catch { }
  process.exit(1);
});