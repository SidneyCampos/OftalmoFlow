/**
 * Entrada do backend (API Express).
 */
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { pacientesRouter } = require("./routes/pacientes");
const { filaRouter } = require("./routes/fila");
const { consultasRouter } = require("./routes/consultas");
const { dashboardRouter } = require("./routes/dashboard");



const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/pacientes", pacientesRouter);
app.use("/api/fila", filaRouter);

app.use("/api/consultas", consultasRouter);

app.use("/api/dashboard", dashboardRouter);



const port = process.env.PORT || 3333;
app.listen(port, () => console.log(`✅ API em http://localhost:${port}`));
