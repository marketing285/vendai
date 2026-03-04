// ─── MAX — Sincronização Google Sheets → Supabase ────────────────────────────
//
// SETUP (fazer uma única vez):
//   1. No Sheets: Extensões > Apps Script > cole este código
//   2. No editor do Apps Script: Arquivo > Propriedades do projeto > Propriedades do script
//      Adicione as duas propriedades abaixo:
//        SUPABASE_URL  = https://lnzxjtzquxhxdlqqenjo.supabase.co
//        SUPABASE_KEY  = (cole aqui o SUPABASE_SERVICE_ROLE_KEY do .env)
//   3. Salve (Ctrl+S)
//   4. Clique em "Executar" na função setupTrigger abaixo para instalar o gatilho
//   5. Autorize as permissões quando solicitado
//
// Após o setup, qualquer edição na planilha sincroniza automaticamente com Supabase.
// ─────────────────────────────────────────────────────────────────────────────

// Colunas (1-based) — ajuste se a ordem mudar na planilha
var COL = {
  designerName        : 1,   // designerName
  clientName          : 2,   // ClientName
  date                : 3,   // Date
  urgency             : 4,   // Urgência
  itemType            : 5,   // itemType
  quantity            : 6,   // Quantity
  responsible         : 7,   // Responsavel
  briefing            : 8,   // Briefing
  status              : 9,   // Status
  approvalResponsible : 10,  // Responsável aprovação  ← nova
  deliveryLink        : 11,  // Link de entrega
  deliveryDate        : 12,  // Data de entrega
  neededRevision      : 13,  // Precisou de Alteração?
  complexity          : 14,  // Complexidade
  revisionCount       : 15,  // Nº de Alterações
  revisionDate        : 16,  // Data Alteração
};

var TOTAL_COLS = 16;
var HEADER_ROW = 1; // linha do cabeçalho (pula na sincronização)

// ─── Gatilho principal ───────────────────────────────────────────────────────
function onSheetEdit(e) {
  var sheet = e.source.getActiveSheet();
  var row   = e.range.getRow();

  // Ignora edições no cabeçalho ou linhas vazias
  if (row <= HEADER_ROW) return;

  // Lê toda a linha
  var values = sheet.getRange(row, 1, 1, TOTAL_COLS).getValues()[0];

  // Ignora linha completamente vazia
  if (!values[COL.clientName - 1] && !values[COL.designerName - 1]) return;

  syncRow(row, values);
}

// ─── Sincroniza uma linha com o Supabase ─────────────────────────────────────
function syncRow(rowNum, values) {
  var props      = PropertiesService.getScriptProperties();
  var supabaseUrl = props.getProperty("SUPABASE_URL");
  var supabaseKey = props.getProperty("SUPABASE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("ERRO: SUPABASE_URL ou SUPABASE_KEY não configurados nas propriedades do script.");
    return;
  }

  function fmt(v) {
    if (v instanceof Date) return Utilities.formatDate(v, "America/Sao_Paulo", "yyyy-MM-dd");
    if (v === "" || v === null || v === undefined) return null;
    return String(v).trim();
  }

  var payload = {
    sheet_row      : rowNum,
    designer_name  : fmt(values[COL.designerName   - 1]),
    client_name    : fmt(values[COL.clientName      - 1]),
    date           : fmt(values[COL.date            - 1]),
    urgency        : fmt(values[COL.urgency         - 1]),
    item_type      : fmt(values[COL.itemType        - 1]),
    quantity       : parseInt(values[COL.quantity   - 1]) || null,
    responsible    : fmt(values[COL.responsible     - 1]),
    briefing       : fmt(values[COL.briefing        - 1]),
    status               : fmt(values[COL.status              - 1]),
    approval_responsible : fmt(values[COL.approvalResponsible - 1]),
    delivery_link        : fmt(values[COL.deliveryLink        - 1]),
    delivery_date  : fmt(values[COL.deliveryDate    - 1]),
    needed_revision: fmt(values[COL.neededRevision  - 1]),
    complexity     : fmt(values[COL.complexity      - 1]),
    revision_count : parseInt(values[COL.revisionCount - 1]) || null,
    revision_date  : fmt(values[COL.revisionDate    - 1]),
    synced_at      : new Date().toISOString(),
  };

  var options = {
    method      : "POST",
    contentType : "application/json",
    headers     : {
      "apikey"       : supabaseKey,
      "Authorization": "Bearer " + supabaseKey,
      "Prefer"       : "resolution=merge-duplicates",  // upsert por sheet_row
    },
    payload     : JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  var url      = supabaseUrl + "/rest/v1/design_productions?on_conflict=sheet_row";
  var response = UrlFetchApp.fetch(url, options);
  var code     = response.getResponseCode();

  if (code >= 200 && code < 300) {
    Logger.log("Linha " + rowNum + " sincronizada com sucesso.");
  } else {
    Logger.log("ERRO linha " + rowNum + " — HTTP " + code + ": " + response.getContentText());
  }
}

// ─── Sincroniza TODAS as linhas preenchidas (executar manualmente se precisar) ──
function syncAllRows() {
  var sheet  = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();

  for (var row = HEADER_ROW + 1; row <= lastRow; row++) {
    var values = sheet.getRange(row, 1, 1, TOTAL_COLS).getValues()[0];
    if (values[COL.clientName - 1] || values[COL.designerName - 1]) {
      syncRow(row, values);
      Utilities.sleep(200); // evita rate limit do Supabase
    }
  }
  Logger.log("Sincronização completa — " + (lastRow - HEADER_ROW) + " linhas processadas.");
}

// ─── Instala o gatilho onEdit (executar uma única vez) ───────────────────────
function setupTrigger() {
  // Remove gatilhos duplicados se existirem
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "onSheetEdit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("onSheetEdit")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  Logger.log("Gatilho instalado com sucesso.");
}
