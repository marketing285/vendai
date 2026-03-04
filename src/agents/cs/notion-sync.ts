import { Client } from "@notionhq/client";
import { Classification } from "./classifier";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID ?? "";

const AREA_LABELS: Record<string, string> = {
  design: "Design",
  video: "Vídeo",
  capture: "Captação",
  content: "Conteúdo",
  traffic: "Tráfego",
  commercial: "Comercial",
  financial: "Financeiro",
  ops: "Operações",
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: "red",
  P1: "orange",
  P2: "blue",
};

export async function createNotionTask(params: {
  protocolId: string;
  title: string;
  classification: Classification;
  sourceMessage: string;
  groupName: string;
  deadline: Date;
}): Promise<string | null> {
  if (!process.env.NOTION_TOKEN || !DATABASE_ID) {
    console.log("[notion-sync] Notion não configurado — pulando sincronização.");
    return null;
  }

  try {
    const page = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: {
        Name: {
          title: [{ text: { content: `[${params.protocolId}] ${params.title}` } }],
        },
        Status: {
          select: { name: "Inbox" },
        },
        Área: {
          select: { name: AREA_LABELS[params.classification.area] ?? params.classification.area },
        },
        Prioridade: {
          select: {
            name: params.classification.priority,
            color: PRIORITY_COLORS[params.classification.priority] as any,
          },
        },
        Responsável: {
          rich_text: [{ text: { content: params.classification.assignee } }],
        },
        Cliente: {
          rich_text: [{ text: { content: params.classification.clientName } }],
        },
        Prazo: {
          date: { start: params.deadline.toISOString() },
        },
        Protocolo: {
          rich_text: [{ text: { content: params.protocolId } }],
        },
      },
      children: [
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ text: { content: "📋 Briefing" } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: params.sourceMessage } }],
          },
        },
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ text: { content: "📌 Origem" } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: `Grupo: ${params.groupName}` } }],
          },
        },
      ],
    });

    return page.id;
  } catch (err: any) {
    console.error("[notion-sync] Erro ao criar task:", err?.message);
    return null;
  }
}
