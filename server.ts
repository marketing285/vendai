import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { controllerRouter } from "./src/agents/controller/index";
import { csRouter } from "./src/agents/cs/index";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "src/web")));

// Rotas dos agentes
app.use("/api/controller", controllerRouter);
app.use("/webhook", csRouter);

// Interface web
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "src/web/index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🤖 MAX — Monitor Ativo de Operações`);
  console.log(`✅ Servidor rodando em http://localhost:${PORT}\n`);
});
