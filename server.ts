import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { controllerRouter } from "./src/agents/controller/index";
import { csRouter } from "./src/agents/cs/index";
import { gpiaRouter, startGPIA } from "./src/agents/gpia/index";
import { startDesignSync } from "./src/agents/controller/design-sync";
import { startVideoArchive } from "./src/agents/controller/video-archive";
import { startBriefingScheduler } from "./src/agents/controller/briefing-scheduler";

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(ROOT, "frontend/out")));

// Rotas dos agentes
app.use("/api/controller", controllerRouter);
app.use("/webhook", csRouter);
app.use("/api/gpia", gpiaRouter);

// Interface web
app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "frontend/out/index.html"));
});

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(ROOT, "frontend/out/dashboard/index.html"));
});

app.get("/dashboard/", (_req, res) => {
  res.sendFile(path.join(ROOT, "frontend/out/dashboard/index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🤖 MAX — Monitor Ativo de Operações`);
  console.log(`✅ Servidor rodando em http://localhost:${PORT}\n`);
  startDesignSync();
  startVideoArchive();
  startBriefingScheduler();
  startGPIA();
});
