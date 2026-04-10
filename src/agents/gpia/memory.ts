/**
 * memory.ts
 * Memória persistente do GPIA no Supabase.
 * Guarda decisões, problemas recorrentes, padrões e feedbacks dos gestores.
 */

import { getSupabase } from "../../integrations/supabase";

export type MemoryType = "decisao" | "problema" | "padrao" | "feedback" | "alerta";

export interface GPIAMemory {
  id?: string;
  bu: "BU1" | "BU2";
  tipo: MemoryType;
  conteudo: string;
  cliente?: string;
  task_id?: string;
  criado_em?: string;
}

/** Salva uma memória no Supabase */
export async function saveMemory(mem: GPIAMemory): Promise<void> {
  const db = getSupabase();
  if (!db) return;

  const { error } = await db.from("gpia_memory").insert({
    bu:        mem.bu,
    tipo:      mem.tipo,
    conteudo:  mem.conteudo,
    cliente:   mem.cliente ?? null,
    task_id:   mem.task_id ?? null,
    criado_em: new Date().toISOString(),
  });

  if (error) console.error("[gpia/memory] Erro ao salvar:", error.message);
}

/** Busca as últimas N memórias de uma BU (opcionalmente filtradas por tipo/cliente) */
export async function getMemories(params: {
  bu: "BU1" | "BU2";
  tipo?: MemoryType;
  cliente?: string;
  limit?: number;
}): Promise<GPIAMemory[]> {
  const db = getSupabase();
  if (!db) return [];

  let query = db
    .from("gpia_memory")
    .select("*")
    .eq("bu", params.bu)
    .order("criado_em", { ascending: false })
    .limit(params.limit ?? 30);

  if (params.tipo)    query = query.eq("tipo", params.tipo);
  if (params.cliente) query = query.eq("cliente", params.cliente);

  const { data, error } = await query;
  if (error) {
    console.error("[gpia/memory] Erro ao buscar:", error.message);
    return [];
  }

  return (data ?? []) as GPIAMemory[];
}

/** Retorna um resumo textual das memórias para injetar no prompt do Claude */
export async function buildMemoryContext(bu: "BU1" | "BU2"): Promise<string> {
  const memories = await getMemories({ bu, limit: 20 });
  if (memories.length === 0) return "Nenhuma memória registrada ainda.";

  return memories
    .map(m => {
      const cliente = m.cliente ? ` [${m.cliente}]` : "";
      const data    = m.criado_em ? new Date(m.criado_em).toLocaleDateString("pt-BR") : "";
      return `• [${m.tipo.toUpperCase()}]${cliente} ${data}: ${m.conteudo}`;
    })
    .join("\n");
}
