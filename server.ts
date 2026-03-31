import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { controllerRouter } from "./src/agents/controller/index";
import { csRouter } from "./src/agents/cs/index";
import { startDesignSync } from "./src/agents/controller/design-sync";
// video-sync desativado — fluxo de edição é manual (sem automação via BU)

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(ROOT, "frontend/out")));

// Rotas dos agentes
app.use("/api/controller", controllerRouter);
app.use("/webhook", csRouter);

// Interface web
app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "frontend/out/index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🤖 MAX — Monitor Ativo de Operações`);
  console.log(`✅ Servidor rodando em http://localhost:${PORT}\n`);
  startDesignSync();
});
