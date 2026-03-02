require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const { pacientesRouter } = require("./routes/pacientes");
const { filaRouter } = require("./routes/fila");
const { consultasRouter } = require("./routes/consultas");
const { dashboardRouter } = require("./routes/dashboard");

const app = express();

// Em produção, como é mesma origem, CORS não é obrigatório.
// Pode deixar ligado sem problema.
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/pacientes", pacientesRouter);
app.use("/api/fila", filaRouter);
app.use("/api/consultas", consultasRouter);
app.use("/api/dashboard", dashboardRouter);

// Produção: servir o frontend buildado
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../../frontend/dist");
  app.use(express.static(distPath));

  // Fallback do React Router (não interfere em /api)
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const port = process.env.PORT || 3333;
// importante: aceitar rede local
app.listen(port, "0.0.0.0", () => console.log(`✅ Sistema em http://0.0.0.0:${port}`));