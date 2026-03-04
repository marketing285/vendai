// Gera IDs de protocolo no formato AAAA-MM-DD-XXXX
// Usa contador em memória (substituir por sequência no Supabase quando disponível)

let counter = 1;

export function generateProtocolId(): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0]; // AAAA-MM-DD
  const seq = String(counter++).padStart(4, "0");
  return `${date}-${seq}`;
}

// Versão que usa Supabase para contador persistente
export async function generateProtocolIdFromDB(): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl === "https://xxxx.supabase.co") {
    return generateProtocolId();
  }

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().split("T")[0];

  // Conta tasks criadas hoje para gerar o próximo número
  const { count } = await db
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .like("protocol_id", `${today}-%`);

  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `${today}-${seq}`;
}
