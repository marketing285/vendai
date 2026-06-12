const defaultPosts = [
  {
    id: 1,
    client: "Venda Prime",
    title: "Carrossel educativo: compra segura",
    date: "2026-06-10",
    time: "09:00",
    network: "Instagram",
    format: "Carrossel",
    status: "Enviado para aprovação",
    pillar: "Educativo",
    goal: "Gerar confiança",
    owner: "Bianca",
    caption: "Comprar um imóvel premium exige método, análise e timing. Veja os critérios que protegem sua decisão.",
    art: "linear-gradient(135deg, #111827, #0f9f8f)",
    slides: [
      { title: "Capa", text: "Compra segura começa com critério.", mediaName: "lamina-01-capa.png" },
      { title: "Localização", text: "Avalie liquidez, mobilidade e potencial de valorização.", mediaName: "lamina-02-localizacao.png" },
      { title: "Planta", text: "Entenda se o imóvel acompanha seu momento de vida.", mediaName: "lamina-03-planta.png" },
      { title: "Documentação", text: "Confira segurança jurídica antes de avançar.", mediaName: "lamina-04-documentacao.png" },
      { title: "CTA", text: "Fale com um consultor para receber uma curadoria personalizada.", mediaName: "lamina-05-cta.png" }
    ]
  },
  {
    id: 2,
    client: "Clínica Essenza",
    title: "Reels: bastidores do protocolo",
    date: "2026-06-11",
    time: "14:30",
    network: "Instagram",
    format: "Reels",
    status: "Ajuste solicitado",
    pillar: "Bastidores",
    goal: "Humanizar",
    owner: "Rafa",
    caption: "Por trás de cada protocolo existe avaliação, segurança e acompanhamento próximo.",
    art: "linear-gradient(135deg, #e15d4f, #f3b33d)"
  },
  {
    id: 3,
    client: "Orbit Tech",
    title: "Post LinkedIn: automação comercial",
    date: "2026-06-12",
    time: "11:00",
    network: "LinkedIn",
    format: "LinkedIn",
    status: "Em revisão interna",
    pillar: "Autoridade",
    goal: "Educar decisores",
    owner: "João",
    caption: "Automação boa não substitui estratégia comercial. Ela remove atrito para o time vender melhor.",
    art: "linear-gradient(135deg, #3164d4, #111827)"
  },
  {
    id: 4,
    client: "Venda Prime",
    title: "Feed: imóvel destaque da semana",
    date: "2026-06-13",
    time: "18:00",
    network: "Instagram",
    format: "Feed",
    status: "Aprovado",
    pillar: "Comercial",
    goal: "Gerar lead",
    owner: "Marina",
    caption: "Uma cobertura pensada para quem busca vista, privacidade e localização estratégica.",
    art: "linear-gradient(135deg, #0f9f8f, #e15d4f)"
  },
  {
    id: 5,
    client: "Venda Prime",
    title: "Story: enquete sobre bairros",
    date: "2026-06-14",
    time: "10:00",
    network: "Instagram",
    format: "Story",
    status: "Agendado",
    pillar: "Institucional",
    goal: "Engajar",
    owner: "Ana",
    caption: "Qual bairro combina com seu próximo momento de vida?",
    art: "linear-gradient(135deg, #f3b33d, #111827)"
  },
  {
    id: 6,
    client: "Clínica Essenza",
    title: "Post: cuidados no inverno",
    date: "2026-06-15",
    time: "08:30",
    network: "Facebook",
    format: "Feed",
    status: "Publicado",
    pillar: "Educativo",
    goal: "Recorrência",
    owner: "Rafa",
    caption: "A pele muda com a temperatura. O cuidado também precisa mudar.",
    art: "linear-gradient(135deg, #0f9f8f, #3164d4)"
  },
  {
    id: 7,
    client: "Orbit Tech",
    title: "TikTok: rotina de integração",
    date: "2026-06-16",
    time: "16:00",
    network: "TikTok",
    format: "TikTok",
    status: "Em produção",
    pillar: "Bastidores",
    goal: "Atrair talentos",
    owner: "Bianca",
    caption: "Como um novo cliente sai do contrato para a primeira automação em produção.",
    art: "linear-gradient(135deg, #111827, #e15d4f)"
  },
  {
    id: 8,
    client: "Venda Prime",
    title: "Reels: autoridade do consultor",
    date: "2026-06-18",
    time: "13:00",
    network: "Instagram",
    format: "Reels",
    status: "Ideia",
    pillar: "Autoridade",
    goal: "Construir confiança",
    owner: "João",
    caption: "O consultor ideal interpreta mercado, risco e oportunidade antes de sugerir um imóvel.",
    art: "linear-gradient(135deg, #3164d4, #f3b33d)"
  }
];

let posts = loadPosts();
let activeModalPostId = null;

function loadPosts() {
  try {
    return JSON.parse(localStorage.getItem("gvPlannerPosts")) || defaultPosts;
  } catch {
    return defaultPosts;
  }
}

function savePosts() {
  localStorage.setItem("gvPlannerPosts", JSON.stringify(posts));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const statusClass = {
  "Ideia": "ideia",
  "Em produção": "producao",
  "Em revisão interna": "revisao",
  "Enviado para aprovação": "enviado",
  "Ajuste solicitado": "ajuste",
  "Aprovado": "aprovado",
  "Agendado": "agendado",
  "Publicado": "publicado"
};

const statusColor = {
  "Ideia": "#667085",
  "Em produção": "#f3b33d",
  "Em revisão interna": "#f3b33d",
  "Enviado para aprovação": "#3164d4",
  "Ajuste solicitado": "#c2413d",
  "Aprovado": "#2b9e66",
  "Agendado": "#3164d4",
  "Publicado": "#2b9e66"
};

const sections = [...document.querySelectorAll(".view")];
const navItems = [...document.querySelectorAll(".nav-item")];
const title = document.querySelector("#page-title");
const clientFilter = document.querySelector("#client-filter");
const statusFilter = document.querySelector("#status-filter");
const networkFilter = document.querySelector("#network-filter");
const search = document.querySelector("#global-search");
const modal = document.querySelector("#post-modal");
let activeSlideIndex = 0;
let builderArtData = null; // base64 data URL of uploaded or library art
let builderEditId = null;  // id of post being edited (null = new post)

function labelFor(sectionId) {
  const el = document.querySelector(`[data-section="${sectionId}"]`);
  if (!el) return "Dashboard";
  // Clone to remove badge/counter child elements before reading text
  const clone = el.cloneNode(true);
  clone.querySelectorAll("span, .badge, [id$='-badge']").forEach(n => n.remove());
  return clone.textContent.trim().replace(/^[^A-Za-zÀ-ÿ]+/, "").replace(/\s*\d+\s*$/, "") || "Dashboard";
}

function showSection(sectionId) {
  sections.forEach((section) => section.classList.toggle("is-visible", section.id === sectionId));
  navItems.forEach((item) => item.classList.toggle("is-active", item.dataset.section === sectionId));
  title.textContent = labelFor(sectionId);
}

function activePosts() {
  const term = search.value.trim().toLowerCase();
  return posts.filter((post) => {
    const byClient = clientFilter.value === "all" || post.client === clientFilter.value;
    const byStatus = statusFilter.value === "all" || post.status === statusFilter.value;
    const byNetwork = networkFilter.value === "all" || post.network === networkFilter.value;
    const haystack = `${post.client} ${post.title} ${post.owner} ${post.status} ${post.network}`.toLowerCase();
    const bySearch = !term || haystack.includes(term);
    return byClient && byStatus && byNetwork && bySearch;
  });
}

function statusPill(status) {
  return `<span class="status ${statusClass[status]}">${escapeHtml(status)}</span>`;
}

function openPost(post) {
  activeModalPostId = post.id;
  const modalArtEl = document.querySelector("#modal-art");
  if (modalArtEl) {
    const isUrl = post.art && post.art.includes("url(");
    if (isUrl) {
      modalArtEl.style.backgroundImage = post.art;
      modalArtEl.style.backgroundSize = "cover";
      modalArtEl.style.backgroundPosition = "center";
      modalArtEl.style.removeProperty("--art");
    } else {
      modalArtEl.style.backgroundImage = "";
      modalArtEl.style.backgroundSize = "";
      modalArtEl.style.backgroundPosition = "";
      modalArtEl.style.setProperty("--art", post.art || "linear-gradient(135deg, #111827, #0f9f8f)");
    }
  }
  document.querySelector("#modal-client").textContent = post.client;
  document.querySelector("#modal-title").textContent = post.title;
  document.querySelector("#modal-status").textContent = post.status;
  document.querySelector("#modal-status").className = `status ${statusClass[post.status] || "ideia"}`;
  document.querySelector("#modal-date").textContent = formatDate(post.date);
  document.querySelector("#modal-time").textContent = post.time;
  document.querySelector("#modal-format").textContent = post.format;
  document.querySelector("#modal-network").textContent = post.network;
  document.querySelector("#modal-cta").textContent = "Falar com consultor";
  document.querySelector("#modal-hashtags").textContent = "#grupovenda #conteudoestrategico";
  document.querySelector("#modal-pillar").textContent = post.pillar;
  document.querySelector("#modal-goal").textContent = post.goal;
  document.querySelector("#modal-caption").textContent = post.caption;
  document.querySelectorAll(".network-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.networkName === post.network);
  });
  const slides = post.format === "Carrossel" ? post.slides || [] : [];
  document.querySelector("#modal-carousel").classList.toggle("is-hidden", slides.length === 0);
  document.querySelector("#modal-slide-count").textContent = `${slides.length} lâminas`;
  document.querySelector("#modal-slide-strip").innerHTML = slides.map((slide, index) => `
    <article class="modal-slide-card">
      <span>${index + 1}</span>
      <strong>${escapeHtml(slide.title || defaultSlideTitle(index))}</strong>
      <p>${escapeHtml(slide.text || defaultSlideText(index))}</p>
      <small>${escapeHtml(slide.mediaName || "Mídia não informada")}</small>
    </article>
  `).join("");
  modal.showModal();
}

function formatDate(date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${date}T12:00:00`));
}

function renderUpcoming() {
  const list = document.querySelector("#upcoming-list");
  list.innerHTML = activePosts().slice(0, 6).map((post) => `
    <button class="post-row" data-post-id="${post.id}">
      <span class="thumb" style="--art:${post.art}"></span>
      <span><strong>${escapeHtml(post.title)}</strong><span>${escapeHtml(post.client)} · ${formatDate(post.date)} às ${escapeHtml(post.time)}</span></span>
      ${statusPill(post.status)}
    </button>
  `).join("");
}

const WDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function renderCalendar() {
  const grid = document.querySelector("#calendar-grid");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayNum = now.getDate();

  const headers = WDAYS.map(d => `<div class="cal-wday-hdr">${d}</div>`).join("");
  const blanks  = Array.from({ length: firstDow }, () => `<div class="day-card is-empty"></div>`).join("");
  const cells   = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayPosts = activePosts().filter(p => p.date === iso);
    const isToday = day === todayNum;
    return `
      <article class="day-card${isToday ? " is-today" : ""}" data-day="${day}">
        <time class="day-num${isToday ? " is-today" : ""}">${day}</time>
        ${dayPosts.map(post => `
          <button class="mini-post" draggable="true" data-post-id="${post.id}" style="--status-color:${statusColor[post.status]}">
            <strong>${escapeHtml(post.client)}</strong><br>${escapeHtml(post.format)} · ${escapeHtml(post.network)}
          </button>`).join("")}
      </article>`;
  }).join("");

  grid.innerHTML = headers + blanks + cells;
}

function renderKanban() {
  const board = document.querySelector("#kanban-board");
  const cols = [
    { status: "Ideia",                  label: "Ideia",         icon: "💡", color: "#9ca3af" },
    { status: "Em produção",            label: "Em produção",   icon: "⚙️", color: "#f3b33d" },
    { status: "Enviado para aprovação", label: "Para aprovar",  icon: "👁",  color: "#3164d4" },
    { status: "Aprovado",               label: "Aprovado",      icon: "✓",   color: "#2b9e66" },
  ];
  board.innerHTML = cols.map(col => {
    const cards = activePosts().filter(p => p.status === col.status);
    const cardsHtml = cards.length
      ? cards.map(post => `
          <button class="kcard" data-post-id="${post.id}">
            <div class="kcard-art" style="background:${post.art}"></div>
            <div class="kcard-body">
              <strong class="kcard-title">${escapeHtml(post.title)}</strong>
              <p class="kcard-client">${escapeHtml(post.client)}</p>
              <div class="kcard-meta">
                <span class="kcard-badge">${escapeHtml(post.format)}</span>
                <span class="kcard-badge">${escapeHtml(post.network)}</span>
                <span class="kcard-date">📅 ${formatDate(post.date)}</span>
              </div>
            </div>
          </button>`).join("")
      : `<p class="kcol-empty">Nenhum post</p>`;
    return `
      <section class="kanban-col">
        <div class="kcol-head" style="--col-color:${col.color}">
          <span class="kcol-icon">${col.icon}</span>
          <span class="kcol-title">${col.label}</span>
          <span class="kcol-count">${cards.length}</span>
        </div>
        <div class="kcol-body">${cardsHtml}</div>
      </section>`;
  }).join("");
}

// ── Instagram Feed Simulator ──────────────────────────────────────────────────
let igFilter = "all";
let igActivePostId = null;

const colorMap = { coral: "var(--coral)", teal: "var(--teal)", ink: "var(--ink)", blue: "#3b82f6", yellow: "#f3b33d" };

function igFakeLikes(id) { return (Math.abs(id * 2971 + 371) % 2800) + 200; }
function igFakeViews(id) { return (Math.abs(id * 5171 + 1103) % 18000) + 2000; }

function renderFeed() {
  const clientName = clientFilter.value === "all" ? null : clientFilter.value;
  const clientInfo = clientName ? clients.find(c => c.name === clientName) : null;

  const allCP = clientName ? posts.filter(p => p.client === clientName) : posts;
  let gridPosts = [...allCP].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  if (igFilter !== "all") gridPosts = gridPosts.filter(p => p.status === igFilter);

  const approved  = allCP.filter(p => p.status === "Aprovado").length;
  const pending   = allCP.filter(p => !p.status || p.status === "Aguardando aprovação" || p.status === "Pendente").length;
  const initials  = clientInfo
    ? clientInfo.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "GV";
  const handle    = clientInfo?.instagram || (clientName ? "@" + clientName.toLowerCase().replace(/\s+/g, "") : "@cliente");
  const avColor   = colorMap[clientInfo?.color] || "var(--teal)";

  // ── Update profile header ───────────────────────────────────────────────────
  const $= id => document.getElementById(id);
  if ($("ig-appbar-handle")) $("ig-appbar-handle").textContent = handle;
  if ($("ig-pav"))           { $("ig-pav").textContent = initials; $("ig-pav").style.background = avColor; }
  if ($("ig-np"))            $("ig-np").textContent    = allCP.length;
  if ($("ig-nappr"))         $("ig-nappr").textContent = approved;
  if ($("ig-npend"))         $("ig-npend").textContent = pending;
  if ($("ig-bio-name"))      $("ig-bio-name").textContent = clientInfo?.name  || "Selecione um cliente";
  if ($("ig-bio-seg"))       $("ig-bio-seg").textContent  = clientInfo?.segment || "Grupo Venda · GV Planner";
  if ($("ig-bnav-me"))       { $("ig-bnav-me").textContent = initials; $("ig-bnav-me").style.background = avColor; }

  // ── Stories ─────────────────────────────────────────────────────────────────
  const storySrc = allCP.slice(0, 7).reverse();
  const storiesEl = $("ig-stories");
  if (storiesEl) {
    storiesEl.innerHTML = `<div class="ig-story">
      <div class="ig-story-ring is-seen"><div class="ig-story-inner" style="background:#f0f0f0;font-size:18px;color:#bbb">+</div></div>
      <span class="ig-story-lbl">Novo</span>
    </div>` + storySrc.map((p, i) => {
      const bg = p.art || "";
      const isUrl = bg.includes("url(");
      const inner = isUrl
        ? `style="background-image:${bg};background-size:cover;background-position:center"`
        : bg ? `style="background:${bg}"` : `style="background:linear-gradient(135deg,#111827,#0f9f8f)"`;
      return `<div class="ig-story" data-story-id="${p.id}">
        <div class="ig-story-ring${i < 2 ? "" : " is-seen"}">
          <div class="ig-story-inner" ${inner}>${isUrl ? "" : escapeHtml((p.pillar || "").slice(0, 3))}</div>
        </div>
        <span class="ig-story-lbl">${escapeHtml(p.title?.split(" ")[0] || "Post")}</span>
      </div>`;
    }).join("");

    storiesEl.querySelectorAll("[data-story-id]").forEach(el => {
      el.addEventListener("click", () => {
        const pid = parseInt(el.dataset.storyId);
        igActivePostId = pid;
        showIgDetail(pid);
        refreshIgGrid();
      });
    });
  }

  // ── Grid ────────────────────────────────────────────────────────────────────
  refreshIgGrid(gridPosts);
}

function refreshIgGrid(gridPosts) {
  if (!gridPosts) {
    const clientName = clientFilter.value === "all" ? null : clientFilter.value;
    const allCP = clientName ? posts.filter(p => p.client === clientName) : posts;
    gridPosts = [...allCP].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    if (igFilter !== "all") gridPosts = gridPosts.filter(p => p.status === igFilter);
  }

  const grid = document.getElementById("ig-grid");
  if (!grid) return;

  if (!gridPosts.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:36px 16px;text-align:center;color:#999;font-size:13px;background:#fff">
      Nenhum post${igFilter !== "all" ? " com este filtro" : " para este cliente"}
    </div>`;
    return;
  }

  grid.innerHTML = gridPosts.slice(0, 30).map(p => {
    const bg = p.art || "";
    const isUrl = bg.includes("url(");
    let style = "";
    if (isUrl) {
      const m = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      style = m ? `background-image:url('${m[1]}');background-size:cover;background-position:center`
                : `background:linear-gradient(135deg,#111827,#0f9f8f)`;
    } else {
      style = bg ? `background:${bg}` : "background:linear-gradient(135deg,#111827,#0f9f8f)";
    }

    const dotClass = p.status === "Aprovado"          ? "s-approved"
                   : p.status === "Ajuste solicitado" ? "s-adjust"
                   : p.status === "Publicado"          ? "s-published"
                   : "";

    const isCarousel = p.format === "Carrossel";
    const isReel     = p.format === "Reels" || p.format === "TikTok";
    const badge = isCarousel
      ? `<span class="ig-tile-badge"><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="2.5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M3 7l-2 2 2 2M21 7l2 2-2 2"/></svg></span>`
      : isReel
        ? `<span class="ig-tile-badge"><svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A1 1 0 0 0 8 6.82z"/></svg></span>`
        : "";

    const isActive = p.id === igActivePostId;
    const fakeLikes = igFakeLikes(p.id);
    const fakeCmts  = (loadComments()[p.id] || []).length;

    return `<button class="ig-tile${isActive ? " is-active" : ""}" data-pid="${p.id}" style="${style}">
      <div class="ig-tile-ov">
        <span><svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>${fakeLikes}</span>
        ${fakeCmts ? `<span><svg width="14" height="14" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>${fakeCmts}</span>` : ""}
      </div>
      ${badge}
      <div class="ig-tile-dot ${dotClass}"></div>
    </button>`;
  }).join("");

  grid.querySelectorAll(".ig-tile").forEach(tile => {
    tile.addEventListener("click", () => {
      const pid = parseInt(tile.dataset.pid);
      igActivePostId = pid;
      showIgDetail(pid);
      grid.querySelectorAll(".ig-tile").forEach(t => t.classList.toggle("is-active", t === tile));
    });
  });
}

function showIgDetail(postId) {
  const post = posts.find(p => p.id === postId);
  if (!post) return;

  const clientInfo = clients.find(c => c.name === post.client);
  const initials = clientInfo?.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "GV";
  const handle   = clientInfo?.instagram || ("@" + (post.client || "cliente").toLowerCase().replace(/\s+/g, ""));
  const avColor  = colorMap[clientInfo?.color] || "var(--teal)";

  const fakeLikes  = igFakeLikes(post.id);
  const fakeViews  = (post.format === "Reels" || post.format === "TikTok") ? igFakeViews(post.id) : null;
  const cmts       = (loadComments()[post.id] || []);

  const statusConfig = {
    "Aprovado":           { cls: "aprovado",  icon: "✓", label: "Aprovado" },
    "Ajuste solicitado":  { cls: "ajuste",    icon: "↺", label: "Ajuste solicitado" },
    "Publicado":          { cls: "publicado", icon: "✓", label: "Publicado" },
  };
  const st = statusConfig[post.status] || { cls: "enviado", icon: "⏳", label: "Aguardando aprovação" };

  const fmtCaption = c => escapeHtml(c)
    .replace(/#(\w+)/g, `<span style="color:var(--teal)">#$1</span>`)
    .replace(/@(\w+)/g, `<span style="color:var(--teal)">@$1</span>`);

  const artBg  = post.art || "linear-gradient(135deg,#111827,#0f9f8f)";
  const isUrl  = artBg.includes("url(");
  const artSt  = isUrl ? `background-image:${artBg};background-size:cover;background-position:center`
                        : `background:${artBg}`;

  const cmtHtml = cmts.slice(-3).map(c => `
    <div class="ig-dcmt">
      <b>${escapeHtml(c.author)}</b> ${escapeHtml(c.text)}
      <div class="ig-dcmt-date">${c.date}</div>
    </div>`).join("");

  const canPublish = post.status === "Aprovado";
  const lockHint   = !canPublish
    ? `<small style="font-size:11px;color:var(--muted);display:block;margin-top:4px">Requer aprovação do cliente</small>`
    : "";

  document.getElementById("ig-detail").innerHTML = `
    <div class="ig-dpost">
      <div class="ig-dpost-hdr">
        <div class="ig-dpost-hdr-left">
          <div class="ig-dpost-av" style="background:${avColor}">${initials}</div>
          <div>
            <div class="ig-dpost-handle">${escapeHtml(handle)}</div>
            <div class="ig-dpost-client">${escapeHtml(post.client || "")}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <span class="status ${st.cls}" style="font-size:11px">${st.icon} ${st.label}</span>
          <button class="ghost-button" style="font-size:12px;min-height:30px;padding:0 10px"
            onclick="document.querySelector('[data-section=approval]').click();showApprovalForPost(${post.id})">
            Aprovação →
          </button>
        </div>
      </div>

      <div class="ig-dpost-img" style="${artSt}"></div>

      <div class="ig-dactions">
        <div class="ig-dact-row">
          <button class="ig-dact-btn" title="Curtidas simuladas">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <button class="ig-dact-btn" title="${cmts.length} comentários">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button class="ig-dact-btn">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <button class="ig-dact-btn">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>

      <div class="ig-dlikes">${fakeViews
        ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>${fakeViews.toLocaleString("pt-BR")} visualizações`
        : `${fakeLikes.toLocaleString("pt-BR")} curtidas`}
      </div>

      <div class="ig-dcaption">
        <b>${escapeHtml(handle)}</b> ${fmtCaption(post.caption || "")}
        ${post.hashtags ? `<div class="ig-dhashtags">${fmtCaption(post.hashtags)}</div>` : ""}
      </div>

      ${cmts.length ? `<div class="ig-dcomments">
        <div class="ig-dcomments-hd">Ver todos os ${cmts.length} comentários</div>
        ${cmtHtml}
      </div>` : ""}

      <div class="ig-dmeta">
        <div class="ig-dmeta-date">${formatDate(post.date)}${post.time ? " às " + post.time : ""}</div>
        <div class="ig-dmeta-tags">
          <span class="ig-dmeta-tag">📐 ${escapeHtml(post.format || "—")}</span>
          ${post.pillar ? `<span class="ig-dmeta-tag">🎯 ${escapeHtml(post.pillar)}</span>` : ""}
          <span class="ig-dmeta-tag">🌐 ${escapeHtml(post.network || "—")}</span>
        </div>
      </div>

      <div class="ig-dactions-bar">
        <button class="primary-button" style="flex:1;opacity:${canPublish ? 1 : .45};cursor:${canPublish ? "pointer" : "not-allowed"}"
          ${canPublish ? `onclick="changePostStatus(${post.id},'Publicado')"` : ""}
          title="${canPublish ? "Marcar como publicado" : "Aguardando aprovação do cliente"}">
          Marcar Publicado
        </button>
        ${lockHint}
        <button class="ghost-button" style="flex:1" onclick="openEditModal(${post.id})">Editar post</button>
      </div>
    </div>`;
}

function changePostStatus(postId, newStatus) {
  const i = posts.findIndex(p => p.id === postId);
  if (i < 0) return;
  posts[i].status = newStatus;
  savePosts();
  showToast(`Post marcado como "${newStatus}".`);
  renderAll();
  showIgDetail(postId);
  refreshIgGrid();
}

function showApprovalForPost(postId) {
  const pending = posts.filter(p => p.status === "Enviado para aprovação" || p.status === "Ajuste solicitado");
  const idx = pending.findIndex(p => p.id === postId);
  if (idx >= 0) { approvalPostIndex = idx; renderApprovalBoard(); }
}

function openEditModal(postId) {
  const post = posts.find(p => p.id === postId);
  if (post) openPost(post);
}

function renderStrategy() {
  const map = document.querySelector("#monthly-map");
  map.innerHTML = activePosts().slice(0, 8).map((post) => `
    <button class="strategy-post" data-post-id="${post.id}">
      <strong>${formatDate(post.date)} · ${escapeHtml(post.pillar)}</strong>
      <span>${escapeHtml(post.goal)}</span>
      <span>${escapeHtml(post.network)} · ${escapeHtml(post.status)}</span>
    </button>
  `).join("");
}

function renderAll() {
  renderUpcoming();
  renderCalendar();
  renderKanban();
  renderFeed();
  renderStrategy();
}

function collectBuilderPost(statusOverride) {
  const format = document.querySelector("#builder-format").value;
  return {
    id: Date.now(),
    client: document.querySelector("#builder-client").value,
    title: document.querySelector("#builder-title").value || "Novo conteúdo",
    date: document.querySelector("#builder-date").value || "2026-06-20",
    time: document.querySelector("#builder-time").value || "09:00",
    network: document.querySelector("#builder-network").value,
    format,
    status: statusOverride || document.querySelector("#builder-status").value,
    pillar: document.querySelector("#builder-pillar").value,
    goal: document.querySelector("#builder-goal").value || "Objetivo não informado",
    owner: "Gestor",
    caption: document.querySelector("#builder-caption").value || "Legenda não informada.",
    art: builderArtData
      ? `url('${builderArtData}')`
      : (format === "Carrossel"
        ? "linear-gradient(135deg, #111827, #0f9f8f)"
        : "linear-gradient(135deg, #3164d4, #e15d4f)"),
    slides: format === "Carrossel" ? getSlideData() : []
  };
}

function upsertBuilderPost(statusOverride) {
  const post = collectBuilderPost(statusOverride);
  if (builderEditId) {
    const idx = posts.findIndex(p => p.id === builderEditId);
    if (idx !== -1) {
      posts[idx] = { ...posts[idx], ...post, id: builderEditId };
    } else {
      posts = [post, ...posts];
    }
  } else {
    posts = [post, ...posts];
  }
  savePosts();
  renderAll();
  return post;
}

navItems.forEach((item) => item.addEventListener("click", () => showSection(item.dataset.section)));

document.querySelectorAll("[data-section-jump]").forEach((button) => {
  button.addEventListener("click", () => showSection(button.dataset.sectionJump));
});

[clientFilter, statusFilter, networkFilter, search].forEach((control) => {
  control.addEventListener("input", renderAll);
  control.addEventListener("change", renderAll);
});

document.querySelector("#clear-filters").addEventListener("click", () => {
  clientFilter.value = "all";
  statusFilter.value = "all";
  networkFilter.value = "all";
  search.value = "";
  renderAll();
});

function updateBuilderPreview() {
  const dateValue = document.querySelector("#builder-date").value;
  const formattedDate = dateValue ? formatDate(dateValue) : "Sem data";
  document.querySelector("#preview-title").textContent = document.querySelector("#builder-title").value || "Novo conteúdo";
  document.querySelector("#preview-client").textContent = document.querySelector("#builder-client").value;
  document.querySelector("#preview-schedule").textContent = `${formattedDate} às ${document.querySelector("#builder-time").value || "--:--"} · ${document.querySelector("#builder-network").value} · ${document.querySelector("#builder-format").value}`;
  document.querySelector("#preview-art-copy").textContent = document.querySelector("#builder-art-copy").value || "Copy da arte";
  document.querySelector("#preview-caption").textContent = document.querySelector("#builder-caption").value || "Legenda do conteúdo";
  document.querySelector("#preview-tags").textContent = document.querySelector("#builder-hashtags").value || "#hashtags";
  const status = document.querySelector("#builder-status").value;
  const previewStatus = document.querySelector("#preview-status");
  previewStatus.textContent = status;
  previewStatus.className = `status ${statusClass[status] || "ideia"}`;
  // Update art display
  const artEl = document.querySelector("#preview-art");
  if (artEl) {
    if (builderArtData) {
      artEl.style.backgroundImage = `url('${builderArtData}')`;
      artEl.style.backgroundSize = "cover";
      artEl.style.backgroundPosition = "center";
      artEl.style.background = "";
    } else {
      const fmt = document.querySelector("#builder-format").value;
      artEl.style.backgroundImage = "";
      artEl.style.backgroundSize = "";
      artEl.style.backgroundPosition = "";
      artEl.style.background = fmt === "Carrossel"
        ? "linear-gradient(135deg, #111827, #0f9f8f)"
        : "linear-gradient(135deg, #3164d4, #e15d4f)";
    }
  }
  updateActiveSlidePreview();
}

function renderCarouselSlides() {
  const format = document.querySelector("#builder-format").value;
  const isCarousel = format === "Carrossel";
  document.querySelectorAll(".carousel-only").forEach((element) => {
    element.classList.toggle("is-hidden", !isCarousel);
  });
  if (!isCarousel) return;

  const countField = document.querySelector("#builder-slides-count");
  const count = Math.max(2, Math.min(20, Number(countField.value) || 2));
  countField.value = count;
  const existingValues = [...document.querySelectorAll(".slide-card")].map((card) => ({
    title: card.querySelector(".slide-title")?.value || "",
    text: card.querySelector(".slide-text")?.value || "",
    mediaName: card.querySelector(".slide-media-name")?.textContent || ""
  }));
  const slides = Array.from({ length: count }, (_, index) => {
    const current = existingValues[index] || {};
    return `
      <div class="slide-card">
        <strong>Lâmina ${index + 1}</strong>
        <input class="slide-title" value="${escapeHtml(current.title || defaultSlideTitle(index))}" aria-label="Título da lâmina ${index + 1}" />
        <textarea class="slide-text" aria-label="Texto da lâmina ${index + 1}">${escapeHtml(current.text || defaultSlideText(index))}</textarea>
        <label class="slide-media-upload">
          <span>Mídia da lâmina</span>
          <input class="slide-media" type="file" accept=".jpg,.jpeg,.png,.mp4,.pdf" aria-label="Mídia da lâmina ${index + 1}" />
          <small class="slide-media-name">${escapeHtml(current.mediaName || "Nenhum arquivo selecionado")}</small>
        </label>
      </div>
    `;
  }).join("");
  document.querySelector("#slides-list").innerHTML = slides;
  document.querySelector("#preview-slides").innerHTML = Array.from({ length: count }, (_, index) => `
    <button type="button" class="preview-slide" data-slide-index="${index}">${index + 1}</button>
  `).join("");
  activeSlideIndex = Math.min(activeSlideIndex, count - 1);
  updateActiveSlidePreview();
}

function getSlideData() {
  return [...document.querySelectorAll(".slide-card")].map((card, index) => ({
    title: card.querySelector(".slide-title")?.value || defaultSlideTitle(index),
    text: card.querySelector(".slide-text")?.value || defaultSlideText(index),
    mediaName: card.querySelector(".slide-media-name")?.textContent || ""
  }));
}

function updateActiveSlidePreview() {
  const format = document.querySelector("#builder-format")?.value;
  const slides = getSlideData();
  const isCarousel = format === "Carrossel" && slides.length > 0;
  document.querySelector("#prev-slide").classList.toggle("is-hidden", !isCarousel);
  document.querySelector("#next-slide").classList.toggle("is-hidden", !isCarousel);
  if (!isCarousel) {
    document.querySelector("#preview-art-copy").textContent = document.querySelector("#builder-art-copy").value || "Copy da arte";
    return;
  }
  activeSlideIndex = Math.max(0, Math.min(activeSlideIndex, slides.length - 1));
  const active = slides[activeSlideIndex];
  document.querySelector("#preview-art-copy").textContent = active.title;
  document.querySelector("#active-slide-title").textContent = `Lâmina ${activeSlideIndex + 1}: ${active.title}`;
  document.querySelector("#active-slide-text").textContent = active.mediaName && active.mediaName !== "Nenhum arquivo selecionado"
    ? `${active.text} · Mídia: ${active.mediaName}`
    : active.text;
  document.querySelectorAll(".preview-slide").forEach((button, index) => {
    button.classList.toggle("is-active", index === activeSlideIndex);
  });
}

function moveSlide(direction) {
  const slides = getSlideData();
  if (!slides.length) return;
  activeSlideIndex = (activeSlideIndex + direction + slides.length) % slides.length;
  updateActiveSlidePreview();
}

function defaultSlideTitle(index) {
  const titles = ["Capa", "Contexto", "Critério", "Exemplo", "CTA"];
  return titles[index] || `Lâmina ${index + 1}`;
}

function defaultSlideText(index) {
  const texts = [
    "Gancho principal do carrossel.",
    "Explique o problema ou oportunidade.",
    "Mostre o principal critério de decisão.",
    "Traga um exemplo prático para o cliente.",
    "Finalize com chamada para ação."
  ];
  return texts[index] || "Conteúdo da lâmina.";
}

document.querySelectorAll("#post-builder-form input, #post-builder-form textarea, #post-builder-form select").forEach((field) => {
  field.addEventListener("input", () => {
    if (field.id === "builder-format" || field.id === "builder-slides-count") {
      renderCarouselSlides();
    }
    updateBuilderPreview();
  });
});

document.querySelector("#post-builder-form").addEventListener("input", (event) => {
  if (event.target.classList.contains("slide-media")) {
    const label = event.target.closest(".slide-media-upload")?.querySelector(".slide-media-name");
    if (label) {
      label.textContent = event.target.files?.[0]?.name || "Nenhum arquivo selecionado";
    }
  }
  if (event.target.closest(".slide-card")) {
    updateBuilderPreview();
  }
});

// Handle art file upload in builder
document.getElementById("builder-file")?.addEventListener("change", async function () {
  const file = this.files?.[0];
  const nameEl = document.getElementById("builder-file-name");
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    if (nameEl) nameEl.textContent = file.name;
    showToast(`Arquivo "${file.name}" adicionado (não é imagem — prévia indisponível).`);
    return;
  }
  if (nameEl) nameEl.textContent = "Processando…";
  try {
    builderArtData = await resizeImage(file, 1080);
    if (nameEl) nameEl.textContent = `✓ ${file.name}`;
    updateBuilderPreview();
    showToast(`Arte "${file.name}" carregada na prévia.`);
  } catch {
    if (nameEl) nameEl.textContent = "Erro ao processar imagem";
    showToast("Erro ao processar a imagem. Tente novamente.");
  }
});

document.querySelector("#preview-slides").addEventListener("click", (event) => {
  const button = event.target.closest("[data-slide-index]");
  if (!button) return;
  activeSlideIndex = Number(button.dataset.slideIndex);
  updateActiveSlidePreview();
});

document.querySelector("#prev-slide").addEventListener("click", () => moveSlide(-1));
document.querySelector("#next-slide").addEventListener("click", () => moveSlide(1));

document.querySelector("#save-draft-btn").addEventListener("click", () => {
  upsertBuilderPost("Ideia");
  builderEditId = null;
  document.querySelector("#save-draft-btn").textContent = "Rascunho salvo";
  setTimeout(() => {
    document.querySelector("#save-draft-btn").textContent = "Salvar rascunho";
  }, 1600);
});

document.querySelector("#send-approval-btn").addEventListener("click", () => {
  document.querySelector("#builder-status").value = "Enviado para aprovação";
  upsertBuilderPost("Enviado para aprovação");
  builderEditId = null;
  updateBuilderPreview();
  document.querySelector("#send-approval-btn").textContent = "Enviado ao cliente";
  setTimeout(() => {
    document.querySelector("#send-approval-btn").textContent = "Enviar para aprovação";
  }, 1800);
});

document.querySelector("#calendar-grid").addEventListener("dragstart", (event) => {
  const post = event.target.closest(".mini-post");
  if (!post) return;
  event.dataTransfer.setData("text/plain", post.dataset.postId);
  post.classList.add("is-dragging");
});

document.querySelector("#calendar-grid").addEventListener("dragend", (event) => {
  event.target.closest(".mini-post")?.classList.remove("is-dragging");
  document.querySelectorAll(".day-card.is-drop-target").forEach((card) => card.classList.remove("is-drop-target"));
});

document.querySelector("#calendar-grid").addEventListener("dragover", (event) => {
  const day = event.target.closest(".day-card");
  if (!day) return;
  event.preventDefault();
  day.classList.add("is-drop-target");
});

document.querySelector("#calendar-grid").addEventListener("dragleave", (event) => {
  event.target.closest(".day-card")?.classList.remove("is-drop-target");
});

document.querySelector("#calendar-grid").addEventListener("drop", (event) => {
  const day = event.target.closest(".day-card");
  if (!day) return;
  event.preventDefault();
  const postId = Number(event.dataTransfer.getData("text/plain"));
  const post = posts.find((item) => item.id === postId);
  if (!post) return;
  const newDay = String(day.dataset.day).padStart(2, "0");
  post.date = `2026-06-${newDay}`;
  savePosts();
  day.classList.remove("is-drop-target");
  renderAll();
});

document.querySelector("#new-post-btn").addEventListener("click", () => {
  showSection("builder");
  builderArtData = null;
  builderEditId = null;
  // reset builder form for a fresh post
  ["#builder-title","#builder-theme","#builder-goal","#builder-art-copy","#builder-caption","#builder-cta","#builder-hashtags"].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.value = "";
  });
  ["#builder-client","#builder-network","#builder-format","#builder-pillar","#builder-category","#builder-status"].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.selectedIndex = 0;
  });
  const dateEl = document.querySelector("#builder-date");
  if (dateEl) {
    const d = new Date();
    dateEl.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()+1).padStart(2,"0")}`;
  }
  const timeEl = document.querySelector("#builder-time");
  if (timeEl) timeEl.value = "09:00";
  const fileEl = document.getElementById("builder-file");
  if (fileEl) fileEl.value = "";
  const nameEl = document.getElementById("builder-file-name");
  if (nameEl) nameEl.textContent = "JPG, PNG, MP4, PDF, PSD ou AI";
  updateBuilderPreview();
});

// ◐ button → dark/light mode toggle
document.querySelector(".icon-button").addEventListener("click", function() {
  const isDark = document.documentElement.dataset.dark === "1";
  document.documentElement.dataset.dark = isDark ? "0" : "1";
  this.title = isDark ? "Modo escuro" : "Modo claro";
});

document.querySelector("#copy-share-btn").addEventListener("click", () => {
  const client = clientFilter.value === "all" ? posts[0]?.client || "Cliente" : clientFilter.value;
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
  const base = window.location.href.replace(/[^/]*$/, "");
  const link = `${base}portal.html?client=${encodeURIComponent(client)}&month=${encodeURIComponent(month.charAt(0).toUpperCase() + month.slice(1))}`;
  navigator.clipboard?.writeText(link).catch(() => {});
  document.querySelector("#copy-share-btn").textContent = "Link copiado!";
  document.querySelector("#sharing .share-link input").value = link;
  setTimeout(() => {
    document.querySelector("#copy-share-btn").textContent = "Copiar link de aprovação";
  }, 2000);
});

document.querySelector("#sync-meta-btn")?.addEventListener("click", () => {
  const now = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
  document.querySelector("#sync-time").textContent = now;
  document.querySelector("#sync-meta-btn").textContent = "Ativos sincronizados";
  setTimeout(() => {
    document.querySelector("#sync-meta-btn").textContent = "Sincronizar ativos";
  }, 1800);
});

document.body.addEventListener("click", (event) => {
  const statusAction = event.target.closest("[data-modal-action]");
  if (statusAction && activeModalPostId) {
    const post = posts.find((item) => item.id === activeModalPostId);
    if (post) {
      post.status = statusAction.dataset.modalAction;
      savePosts();
      renderAll();
      openPost(post);
    }
    return;
  }

  const trigger = event.target.closest("[data-post-id]");
  if (!trigger) return;
  if (trigger.closest("#sharing")) return; // portal handles its own clicks
  const post = posts.find((item) => item.id === Number(trigger.dataset.postId));
  if (post) openPost(post);
});

renderAll();
renderCarouselSlides();
updateBuilderPreview();

// ── Toast utility ─────────────────────────────────────────────────────────────
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "gv-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => toast.remove(), 300);
  }, 2400);
}

// ── Fill builder from existing post (Editar) ──────────────────────────────────
function fillBuilderFromPost(post) {
  document.querySelector("#builder-client").value = post.client;
  document.querySelector("#builder-title").value = post.title;
  document.querySelector("#builder-date").value = post.date;
  document.querySelector("#builder-time").value = post.time;
  document.querySelector("#builder-network").value = post.network;
  document.querySelector("#builder-format").value = post.format;
  document.querySelector("#builder-status").value = post.status;
  document.querySelector("#builder-pillar").value = post.pillar;
  document.querySelector("#builder-goal").value = post.goal || "";
  document.querySelector("#builder-caption").value = post.caption || "";
  document.querySelector("#builder-art-copy").value = post.artCopy || "";
  document.querySelector("#builder-hashtags").value = post.hashtags || "";
  document.querySelector("#builder-cta").value = post.cta || "";
  if (post.format === "Carrossel") {
    document.querySelector("#builder-slides-count").value = (post.slides || []).length || 2;
  }
  renderCarouselSlides();
  updateBuilderPreview();
}

// ── Modal: Editar, Duplicar, Excluir ─────────────────────────────────────────
document.body.addEventListener("click", (event) => {
  const btn = event.target.closest(".ghost-button, .danger-button");
  if (!btn || !activeModalPostId) return;

  const post = posts.find((p) => p.id === activeModalPostId);
  if (!post) return;

  if (btn.textContent.trim() === "Editar") {
    modal.close();
    builderArtData = null;
    builderEditId = post.id;
    fillBuilderFromPost(post);
    showSection("builder");
    return;
  }

  if (btn.textContent.trim() === "Duplicar") {
    const copy = { ...post, id: Date.now(), title: `${post.title} (cópia)`, status: "Ideia" };
    posts = [copy, ...posts];
    savePosts();
    renderAll();
    showToast("Post duplicado com sucesso.");
    return;
  }

  if (btn.classList.contains("danger-button")) {
    posts = posts.filter((p) => p.id !== activeModalPostId);
    savePosts();
    renderAll();
    modal.close();
    showToast("Post excluído.");
  }
});

// ── Central de Aprovação: Aprovar / Solicitar ajuste ─────────────────────────
let approvalPostIndex = 0;

document.querySelector("#approval").addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn) return;

  const pending = posts.filter((p) => p.status === "Enviado para aprovação" || p.status === "Ajuste solicitado");
  if (!pending.length) return;
  const post = pending[approvalPostIndex];

  if (btn.textContent.trim() === "Aprovar conteúdo") {
    post.status = "Aprovado";
    savePosts();
    renderAll();
    renderApprovalBoard();
    showToast(`"${post.title}" aprovado.`);
    return;
  }

  if (btn.textContent.trim() === "Solicitar ajuste") {
    post.status = "Ajuste solicitado";
    savePosts();
    renderAll();
    showToast("Ajuste solicitado ao gestor.");
  }
});

// ── Calendar segmented toggle ─────────────────────────────────────────────────
const calendarSegmented = document.querySelector("#calendar .segmented");
if (calendarSegmented) {
  calendarSegmented.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    calendarSegmented.querySelectorAll("button").forEach((b) => b.classList.remove("is-selected"));
    btn.classList.add("is-selected");

    const view = btn.textContent.trim();
    const grid = document.querySelector("#calendar-grid");
    const kanban = document.querySelector("#kanban-board");

    if (view === "Kanban") {
      grid.classList.add("is-hidden");
      kanban.classList.remove("is-hidden");
      renderKanban();
    } else if (view === "Semana") {
      kanban.classList.add("is-hidden");
      grid.classList.remove("is-hidden");
      const today = new Date();
      const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return d;
      });
      grid.innerHTML = weekDays.map((date) => {
        const dayStr   = String(date.getDate()).padStart(2, "0");
        const monthStr = String(date.getMonth() + 1).padStart(2, "0");
        const isoDate  = `${date.getFullYear()}-${monthStr}-${dayStr}`;
        const dayPosts = activePosts().filter((p) => p.date === isoDate);
        const isToday  = date.toDateString() === today.toDateString();
        const wday     = WDAYS[date.getDay()];
        return `
          <article class="day-card${isToday ? " is-today" : ""}" data-day="${date.getDate()}">
            <div class="day-card-head">
              <span class="day-wday">${wday}</span>
              <time class="day-num${isToday ? " is-today" : ""}">${dayStr}/${monthStr}</time>
            </div>
            ${dayPosts.map((post) => `
              <button class="mini-post" draggable="true" data-post-id="${post.id}" style="--status-color:${statusColor[post.status]}">
                <strong>${escapeHtml(post.client)}</strong><br>${escapeHtml(post.format)} · ${escapeHtml(post.network)}
              </button>`).join("")}
          </article>`;
      }).join("");
    } else {
      kanban.classList.add("is-hidden");
      grid.classList.remove("is-hidden");
      renderCalendar();
    }
  });
}

// ── Instagram Feed segmented filter ──────────────────────────────────────────
document.getElementById("ig-seg")?.addEventListener("click", e => {
  const btn = e.target.closest("[data-igf]");
  if (!btn) return;
  igFilter = btn.dataset.igf;
  document.querySelectorAll("#ig-seg button").forEach(b => b.classList.toggle("is-selected", b === btn));
  renderFeed();
});

// ── ig-gtabs (decorative) ─────────────────────────────────────────────────────
document.getElementById("ig-grid")?.closest(".ig-screen")?.querySelector(".ig-gtabs")
  ?.addEventListener("click", e => {
    const btn = e.target.closest(".ig-gtab");
    if (!btn) return;
    document.querySelectorAll(".ig-gtab").forEach(b => b.classList.toggle("is-active", b === btn));
  });

// ── Prototype-only buttons (toast feedback) ───────────────────────────────────
document.querySelector("#clients .primary-button")?.addEventListener("click", () => {
  document.querySelector("#client-modal").showModal();
});

document.querySelector("#approval .primary-button:not(.full)")?.addEventListener("click", () => {
  showToast("Lote enviado para o cliente.");
});

document.querySelector("#strategy .ghost-button")?.addEventListener("click", () => {
  showToast("Exportação disponível em breve.");
});

// #files upload handled by initLibrary() → lib-upload-btn

document.querySelector("#report-pdf-btn")?.addEventListener("click", () => {
  showSection("reports");
  setTimeout(() => window.print(), 80);
});

document.querySelector("#report-excel-btn")?.addEventListener("click", () => {
  document.querySelector("#report-excel-btn").classList.add("is-selected");
  document.querySelector("#report-pdf-btn").classList.remove("is-selected");
  showToast("Exportação Excel disponível em breve.");
});

// ── Clients persistence ────────────────────────────────────────────────────────
const defaultClients = [
  { id: 1, name: "Venda Prime", segment: "Imobiliário premium", owner: "Ana Costa", status: "Contrato ativo", instagram: "@vendaprime", linkedin: "", site: "", start: "2026-01-10", color: "coral" },
  { id: 2, name: "Clínica Essenza", segment: "Saúde e estética", owner: "Dr. Renato Alves", status: "Contrato ativo", instagram: "@clinicaessenza", linkedin: "", site: "essenza.com.br", start: "2026-03-04", color: "teal" },
  { id: 3, name: "Orbit Tech", segment: "SaaS B2B", owner: "Lucas Meyer", status: "Onboarding", instagram: "", linkedin: "/company/orbit-tech", site: "", start: "2026-05-28", color: "ink" }
];

const clientColorCycle = ["coral", "teal", "ink", "blue", "yellow"];

let clients = (() => {
  try { return JSON.parse(localStorage.getItem("gvPlannerClients")) || defaultClients; } catch { return defaultClients; }
})();

function saveClients() {
  localStorage.setItem("gvPlannerClients", JSON.stringify(clients));
}

function renderClients() {
  const grid = document.querySelector(".client-grid");
  if (!grid) return;
  grid.innerHTML = clients.map((c, i) => {
    const initials = c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    const color = c.color || clientColorCycle[i % clientColorCycle.length];
    const postCount = posts.filter(p => p.client === c.name).length;
    const rows = [
      `<div><dt>Responsável</dt><dd>${escapeHtml(c.owner || "—")}</dd></div>`,
      `<div><dt>Status</dt><dd>${escapeHtml(c.status)}</dd></div>`,
      `<div><dt>Posts</dt><dd>${postCount}</dd></div>`,
      c.instagram ? `<div><dt>Instagram</dt><dd>${escapeHtml(c.instagram)}</dd></div>` : "",
      c.linkedin  ? `<div><dt>LinkedIn</dt><dd>${escapeHtml(c.linkedin)}</dd></div>`  : "",
      c.site      ? `<div><dt>Site</dt><dd>${escapeHtml(c.site)}</dd></div>`          : "",
      `<div><dt>Início</dt><dd>${c.start ? formatDate(c.start) : "—"}</dd></div>`
    ].filter(Boolean).join("");
    return `
      <article class="client-card panel">
        <button class="client-card-del" data-del-id="${c.id}" title="Excluir cliente">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
        <div class="client-logo ${color}">${initials}</div>
        <h3>${escapeHtml(c.name)}</h3>
        <p>${escapeHtml(c.segment || "")}</p>
        <dl>${rows}</dl>
      </article>
    `;
  }).join("");

  // Delete handler
  grid.querySelectorAll(".client-card-del").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.delId);
      const client = clients.find(c => c.id === id);
      if (!client) return;

      const clientPosts = posts.filter(p => p.client === client.name);
      const postCount   = clientPosts.length;
      const msg = postCount
        ? `Excluir "${client.name}"?\n\nIsso vai apagar permanentemente ${postCount} post(s) e todos os comentários associados. Esta ação não pode ser desfeita.`
        : `Excluir o cliente "${client.name}"? Esta ação não pode ser desfeita.`;

      if (!confirm(msg)) return;

      // Remove posts
      const deletedIds = new Set(clientPosts.map(p => p.id));
      posts = posts.filter(p => p.client !== client.name);
      savePosts();

      // Remove comments for those posts
      const allCmts = loadComments();
      deletedIds.forEach(pid => delete allCmts[pid]);
      saveComments(allCmts);

      // Remove client
      clients = clients.filter(c => c.id !== id);
      saveClients();

      renderClients();
      renderAll();
      showToast(`Cliente "${client.name}" e ${postCount} post(s) removidos.`);
    });
  });

  const options = clients.map((c) => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
  document.querySelector("#client-filter").innerHTML = `<option value="all">Todos os clientes</option>${options}`;
  document.querySelector("#builder-client").innerHTML = options;
}

renderClients();

// ── Client modal ──────────────────────────────────────────────────────────────
const clientModal = document.querySelector("#client-modal");

document.querySelector("#cm-cancel-btn")?.addEventListener("click", () => clientModal.close());

document.querySelector("#cm-save-btn")?.addEventListener("click", () => {
  const name = document.querySelector("#cm-name").value.trim();
  if (!name) { showToast("Nome do cliente é obrigatório."); return; }
  const newClient = {
    id: Date.now(),
    name,
    segment: document.querySelector("#cm-segment").value.trim(),
    owner: document.querySelector("#cm-owner").value.trim(),
    status: document.querySelector("#cm-status").value,
    instagram: document.querySelector("#cm-instagram").value.trim(),
    linkedin: document.querySelector("#cm-linkedin").value.trim(),
    site: document.querySelector("#cm-site").value.trim(),
    start: document.querySelector("#cm-start").value || new Date().toISOString().slice(0, 10),
    color: clientColorCycle[clients.length % clientColorCycle.length]
  };
  clients.push(newClient);
  saveClients();
  renderClients();
  clientModal.close();
  document.querySelector("#cm-name").value = "";
  document.querySelector("#cm-segment").value = "";
  document.querySelector("#cm-owner").value = "";
  document.querySelector("#cm-instagram").value = "";
  document.querySelector("#cm-linkedin").value = "";
  document.querySelector("#cm-site").value = "";
  document.querySelector("#cm-start").value = "";
  showToast(`Cliente "${name}" cadastrado com sucesso.`);
});

// ── Comments system ───────────────────────────────────────────────────────────
function loadComments() {
  try { return JSON.parse(localStorage.getItem("gvPlannerComments")) || {}; } catch { return {}; }
}

function saveComments(all) {
  localStorage.setItem("gvPlannerComments", JSON.stringify(all));
}

function addComment(postId, author, text) {
  const all = loadComments();
  if (!all[postId]) all[postId] = [];
  const type = author === "Interno (equipe)" ? "Interno" : "Cliente";
  const now = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date());
  all[postId].push({ author, text, type, date: now });
  saveComments(all);
}

function renderApprovalComments(postId) {
  const list = document.querySelector("#approval-comments-list");
  if (!list) return;
  const all = loadComments();
  const items = all[postId] || [];
  list.innerHTML = items.length
    ? items.map((c) => `
        <div class="comment ${c.type === "Interno" ? "internal" : ""}">
          <strong>${escapeHtml(c.author)}</strong>
          <p>${escapeHtml(c.text)}</p>
          <small class="comment-date">${c.date}</small>
        </div>
      `).join("")
    : '<p class="no-comments">Sem comentários ainda.</p>';
}

// Re-render approval board with comments
function renderApprovalBoard() {
  const pending = posts.filter((p) => p.status === "Enviado para aprovação" || p.status === "Ajuste solicitado");
  const list = document.querySelector("#approval-comments-list");
  if (!pending.length) {
    if (list) list.innerHTML = '<p class="no-comments">Nenhum post aguardando aprovação.</p>';
    return;
  }
  approvalPostIndex = Math.max(0, Math.min(approvalPostIndex, pending.length - 1));
  const post = pending[approvalPostIndex];
  const board = document.querySelector("#approval-art");
  if (board) {
    const isUrl = post.art && post.art.includes("url(");
    if (isUrl) {
      board.style.backgroundImage = post.art.replace(/^url\(['"]?/, "url('").replace(/['"]?\)$/, "')");
      board.style.backgroundSize = "cover";
      board.style.backgroundPosition = "center";
    } else {
      board.style.backgroundImage = "";
      board.style.backgroundSize = "";
      board.style.backgroundPosition = "";
      board.style.setProperty("--art", post.art || "linear-gradient(135deg, #111827, #0f9f8f)");
    }
  }
  const label = document.querySelector(".art-label");
  if (label) label.innerHTML = `${escapeHtml(post.client)}<br>${escapeHtml(post.title)}`;
  renderApprovalComments(post.id);
}

renderApprovalBoard();

document.querySelector("#add-comment-btn")?.addEventListener("click", () => {
  const pending = posts.filter((p) => p.status === "Enviado para aprovação" || p.status === "Ajuste solicitado");
  if (!pending.length) { showToast("Nenhum post na fila de aprovação."); return; }
  const post = pending[approvalPostIndex];
  const text = document.querySelector("#approval-comment-text").value.trim();
  if (!text) { showToast("Escreva um comentário antes de enviar."); return; }
  const author = document.querySelector("#approval-comment-type").value;
  addComment(post.id, author, text);
  document.querySelector("#approval-comment-text").value = "";
  renderApprovalComments(post.id);
  showToast("Comentário adicionado.");
});

// ── Portal do cliente ─────────────────────────────────────────────────────────
const portalModal = document.querySelector("#portal-modal");

function openPortal(post) {
  const portalArtEl = document.querySelector("#portal-art");
  if (portalArtEl) {
    const isUrl = post.art && post.art.includes("url(");
    if (isUrl) {
      portalArtEl.style.backgroundImage = post.art;
      portalArtEl.style.backgroundSize = "cover";
      portalArtEl.style.backgroundPosition = "center";
    } else {
      portalArtEl.style.backgroundImage = "";
      portalArtEl.style.backgroundSize = "";
      portalArtEl.style.backgroundPosition = "";
      portalArtEl.style.setProperty("--art", post.art || "linear-gradient(135deg, #111827, #0f9f8f)");
    }
  }
  document.querySelector("#portal-client-name").textContent = post.client;
  document.querySelector("#portal-title").textContent = post.title;
  document.querySelector("#portal-status").textContent = post.status;
  document.querySelector("#portal-status").className = `status ${statusClass[post.status] || "ideia"}`;
  document.querySelector("#portal-date").textContent = formatDate(post.date);
  document.querySelector("#portal-format").textContent = post.format;
  document.querySelector("#portal-network").textContent = post.network;
  document.querySelector("#portal-caption").textContent = post.caption || "";
  document.querySelector("#portal-tags").textContent = post.hashtags || "#grupovenda";
  portalModal.dataset.postId = post.id;

  const all = loadComments();
  const items = (all[post.id] || []).filter((c) => c.type !== "Interno");
  document.querySelector("#portal-comments").innerHTML = items.length
    ? items.map((c) => `
        <div class="comment">
          <strong>${escapeHtml(c.author)}</strong>
          <p>${escapeHtml(c.text)}</p>
          <small class="comment-date">${c.date}</small>
        </div>
      `).join("")
    : '<p class="no-comments">Sem comentários ainda.</p>';

  document.querySelector("#portal-comment-text").value = "";
  portalModal.showModal();
}

document.querySelector("#sharing .client-approval-list")?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-post-id]");
  if (!row) return;
  const post = posts.find((p) => p.id === Number(row.dataset.postId));
  if (post) openPortal(post);
});

document.querySelector("#portal-add-comment")?.addEventListener("click", () => {
  const postId = Number(portalModal.dataset.postId);
  const text = document.querySelector("#portal-comment-text").value.trim();
  if (!text) return;
  addComment(postId, "Cliente", text);
  document.querySelector("#portal-comment-text").value = "";
  const all = loadComments();
  const items = (all[postId] || []).filter((c) => c.type !== "Interno");
  document.querySelector("#portal-comments").innerHTML = items.map((c) => `
    <div class="comment">
      <strong>${escapeHtml(c.author)}</strong>
      <p>${escapeHtml(c.text)}</p>
      <small class="comment-date">${c.date}</small>
    </div>
  `).join("");
  renderApprovalComments(postId);
  showToast("Comentário enviado.");
});

document.querySelector("#portal-approve-btn")?.addEventListener("click", () => {
  const postId = Number(portalModal.dataset.postId);
  const post = posts.find((p) => p.id === postId);
  if (!post) return;
  post.status = "Aprovado";
  savePosts();
  renderAll();
  renderApprovalBoard();
  portalModal.close();
  showToast(`"${post.title}" aprovado pelo cliente.`);
});

document.querySelector("#portal-adjust-btn")?.addEventListener("click", () => {
  const postId = Number(portalModal.dataset.postId);
  const post = posts.find((p) => p.id === postId);
  if (!post) return;
  const text = document.querySelector("#portal-comment-text").value.trim();
  if (text) {
    addComment(postId, "Cliente", text);
    document.querySelector("#portal-comment-text").value = "";
  }
  post.status = "Ajuste solicitado";
  savePosts();
  renderAll();
  renderApprovalBoard();
  portalModal.close();
  showToast("Ajuste solicitado. A equipe será notificada.");
});

// ════════════════════════════════════════════════════════════════════════════
// GV PLANNER — Enhancement Layer
// Inspired by: Planable, Later, ContentCal, Buffer
// ════════════════════════════════════════════════════════════════════════════

// ── Network colors ────────────────────────────────────────────────────────────
const netColor = {
  "Instagram": "#e1306c",
  "LinkedIn":  "#0a66c2",
  "TikTok":    "#010101",
  "Facebook":  "#1877f2",
};

// ── Activity log ──────────────────────────────────────────────────────────────
const ACT_KEY = "gvPlannerActivity";

function tsNowFull() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
  }).format(new Date());
}

function logActivity(msg) {
  try {
    const log = JSON.parse(localStorage.getItem(ACT_KEY)) || [];
    log.unshift({ msg, time: tsNowFull() });
    localStorage.setItem(ACT_KEY, JSON.stringify(log.slice(0, 20)));
  } catch {}
  renderActivityFeed();
}

function renderActivityFeed() {
  const el = document.getElementById("activity-list");
  if (!el) return;
  try {
    const log = JSON.parse(localStorage.getItem(ACT_KEY)) || [];
    if (!log.length) { el.innerHTML = '<p class="activity-empty">Nenhuma atividade ainda.</p>'; return; }
    el.innerHTML = log.slice(0, 7).map(a =>
      `<p><strong>Equipe</strong> ${escapeHtml(a.msg)}<span class="act-time">${a.time}</span></p>`
    ).join("");
  } catch { el.innerHTML = '<p class="activity-empty">Nenhuma atividade ainda.</p>'; }
}

// ── Dashboard: live stats from posts ──────────────────────────────────────────
function renderDashboard() {
  const total     = posts.length;
  const approved  = posts.filter(p => p.status === "Aprovado" || p.status === "Publicado").length;
  const pending   = posts.filter(p => p.status === "Enviado para aprovação").length;
  const adjusts   = posts.filter(p => p.status === "Ajuste solicitado").length;
  const published = posts.filter(p => p.status === "Publicado").length;
  const rate      = total > 0 ? Math.round((approved / total) * 100) : 0;

  function setEl(id, val) { const e = document.getElementById(id); if (e) e.textContent = val; }

  setEl("stat-clients",  clients.length);
  setEl("stat-clients-sub", `${clients.filter(c => c.status === "Contrato ativo").length} contratos ativos`);
  setEl("stat-posts",    total);
  setEl("stat-posts-sub", `${posts.filter(p => p.status === "Ideia").length} ideias · ${posts.filter(p => p.status === "Em produção").length} em produção`);
  setEl("stat-pending",  pending);
  setEl("stat-pending-sub", `Tempo médio: 2,4 dias`);
  setEl("stat-rate",     `${rate}%`);
  setEl("stat-rate-sub", `${approved} de ${total} aprovados`);
  setEl("stat-published",published);
  setEl("stat-published-sub", `${posts.filter(p => p.status === "Agendado").length} agendados`);
  setEl("stat-adjusts",  adjusts);
  setEl("stat-adjusts-sub", adjusts > 0 ? `${adjusts} pendente${adjusts > 1 ? "s" : ""}` : "Tudo em dia");

  // Notification badge on approval nav
  const badge = document.getElementById("approval-badge");
  const badgeCount = pending + adjusts;
  if (badge) { badge.textContent = badgeCount; badge.hidden = badgeCount === 0; }

  // Network breakdown chart
  const nets = ["Instagram", "LinkedIn", "TikTok", "Facebook"];
  const counts = nets.map(n => posts.filter(p => p.network === n).length);
  const maxCount = Math.max(...counts, 1);
  nets.forEach((n, i) => {
    const fill = document.querySelector(`[data-net-fill="${n}"]`);
    const cnt  = document.querySelector(`[data-net-count="${n}"]`);
    if (fill) fill.style.width = `${(counts[i] / maxCount) * 100}%`;
    if (cnt)  cnt.textContent  = counts[i];
  });

  // Month label
  const monthLabel = document.getElementById("dash-month-label");
  if (monthLabel) {
    monthLabel.textContent = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
      .format(new Date()).replace(/^\w/, c => c.toUpperCase());
  }

  // Upcoming: better card rendering
  renderUpcomingEnhanced();
  renderActivityFeed();
}

function renderUpcomingEnhanced() {
  const list = document.getElementById("upcoming-list");
  if (!list) return;
  const upcoming = activePosts()
    .filter(p => p.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
  if (!upcoming.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:12px 0">Nenhum post agendado.</p>';
    return;
  }
  list.innerHTML = upcoming.map(p => `
    <div class="upcoming-post">
      <div class="upcoming-thumb" style="background:${p.art}"></div>
      <div class="upcoming-body">
        <strong>${escapeHtml(p.title)}</strong>
        <span>${escapeHtml(p.client)} · ${formatDate(p.date)} às ${escapeHtml(p.time)}</span>
      </div>
      <span class="upcoming-net" style="background:${netColor[p.network]||'#667085'}" title="${escapeHtml(p.network)}"></span>
      ${statusPill(p.status)}
    </div>`).join("");
}

// Patch renderAll to include dashboard
const _origRenderAll = renderAll;
renderAll = function() {
  _origRenderAll();
  renderDashboard();
};

// ── Enhanced mini-post for calendar ──────────────────────────────────────────
function miniPostHtml(post) {
  const color = netColor[post.network] || "#667085";
  return `<button class="mini-post" draggable="true" data-post-id="${post.id}"
    data-network="${escapeHtml(post.network)}"
    style="--status-color:${statusColor[post.status]}">
    <span class="mini-row">
      <strong>${escapeHtml(post.client)}</strong>
      <span class="mini-time">${escapeHtml(post.time)}</span>
    </span>
    <span class="mini-sub">
      <span class="net-dot" style="background:${color}"></span>
      ${escapeHtml(post.format)} · ${escapeHtml(post.network)}
    </span>
  </button>`;
}

// Patch renderCalendar to use enhanced mini-post
const _origRenderCalendar = renderCalendar;
renderCalendar = function() {
  const grid = document.querySelector("#calendar-grid");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayNum = now.getDate();

  const headers  = WDAYS.map(d => `<div class="cal-wday-hdr">${d}</div>`).join("");
  const blanks   = Array.from({ length: firstDow }, () => `<div class="day-card is-empty"></div>`).join("");
  const cells    = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayPosts = activePosts().filter(p => p.date === iso);
    const isToday  = day === todayNum;
    return `<article class="day-card${isToday ? " is-today" : ""}" data-day="${day}">
      <time class="day-num${isToday ? " is-today" : ""}">${day}</time>
      ${dayPosts.map(miniPostHtml).join("")}
    </article>`;
  }).join("");
  grid.innerHTML = headers + blanks + cells;
};

// Patch week view in segmented toggle to use enhanced mini-post
// (handled via the calendarSegmented listener — override the Semana branch)
const _calSeg = document.querySelector("#calendar .segmented");
if (_calSeg) {
  _calSeg.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn || btn.textContent.trim() !== "Semana") return;
    const grid = document.querySelector("#calendar-grid");
    const today = new Date();
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() + i); return d;
    });
    grid.innerHTML = weekDays.map(date => {
      const dayStr   = String(date.getDate()).padStart(2, "0");
      const monthStr = String(date.getMonth() + 1).padStart(2, "0");
      const isoDate  = `${date.getFullYear()}-${monthStr}-${dayStr}`;
      const dayPosts = activePosts().filter(p => p.date === isoDate);
      const isToday  = date.toDateString() === today.toDateString();
      return `<article class="day-card${isToday ? " is-today" : ""}" data-day="${date.getDate()}">
        <div class="day-card-head">
          <span class="day-wday">${WDAYS[date.getDay()]}</span>
          <time class="day-num${isToday ? " is-today" : ""}">${dayStr}/${monthStr}</time>
        </div>
        ${dayPosts.map(miniPostHtml).join("")}
      </article>`;
    }).join("");
  });
}

// ── Caption & hashtag counters ────────────────────────────────────────────────
function updateCounters() {
  const captionEl   = document.getElementById("builder-caption");
  const hashtagEl   = document.getElementById("builder-hashtags");
  const networkEl   = document.getElementById("builder-network");
  const capCounter  = document.getElementById("caption-counter");
  const tagCounter  = document.getElementById("hashtag-counter");

  if (captionEl && capCounter) {
    const len   = captionEl.value.length;
    const limit = networkEl?.value === "LinkedIn" ? 3000 : 2200;
    capCounter.textContent = `${len} / ${limit}`;
    capCounter.className   = `char-counter${len > limit ? " over" : len > limit * 0.9 ? " warn" : ""}`;
  }
  if (hashtagEl && tagCounter) {
    const tags = (hashtagEl.value.match(/#\w+/g) || []).length;
    tagCounter.textContent = `${tags} / 30 hashtags`;
    tagCounter.className   = `char-counter${tags >= 30 ? " over" : tags > 26 ? " warn" : ""}`;
  }
}

document.getElementById("builder-caption")?.addEventListener("input", updateCounters);
document.getElementById("builder-hashtags")?.addEventListener("input", updateCounters);
document.getElementById("builder-network")?.addEventListener("change", updateCounters);
updateCounters();

// ── Auto-save builder to localStorage ────────────────────────────────────────
let _autoSaveTimer = null;
const DRAFT_KEY = "gvPlannerBuilderDraft";

function triggerAutoSave() {
  const ind = document.getElementById("autosave-ind");
  if (ind) { ind.textContent = "Salvando..."; ind.className = "autosave-ind show saving"; }
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    const draft = {};
    ["builder-client","builder-title","builder-date","builder-time","builder-network",
     "builder-format","builder-pillar","builder-category","builder-status","builder-theme",
     "builder-goal","builder-art-copy","builder-caption","builder-cta","builder-hashtags"].forEach(id => {
       const el = document.getElementById(id);
       if (el) draft[id] = el.value;
     });
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    if (ind) { ind.textContent = "✓ Rascunho salvo"; ind.className = "autosave-ind show saved"; }
    setTimeout(() => { if (ind) ind.className = "autosave-ind"; }, 2200);
  }, 1200);
}

document.querySelector("#post-builder-form")?.addEventListener("input", triggerAutoSave);

// Restore draft on page load
(function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (!draft) return;
    Object.entries(draft).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    updateBuilderPreview();
    updateCounters();
    const ind = document.getElementById("autosave-ind");
    if (ind) { ind.textContent = "↩ Rascunho restaurado"; ind.className = "autosave-ind show saved"; setTimeout(() => { ind.className = "autosave-ind"; }, 2500); }
  } catch {}
})();

// ── Approval board: prev/next navigation ─────────────────────────────────────
function renderApprovalNav() {
  const pending = posts.filter(p => p.status === "Enviado para aprovação" || p.status === "Ajuste solicitado");
  const total   = posts.filter(p => ["Enviado para aprovação","Ajuste solicitado","Aprovado"].includes(p.status)).length;
  const approved = posts.filter(p => p.status === "Aprovado").length;

  const title   = document.getElementById("approval-nav-title");
  const sub     = document.getElementById("approval-nav-sub");
  const pbar    = document.getElementById("approval-pbar");
  const pLabel  = document.getElementById("approval-pbar-label");

  if (!pending.length) {
    if (title) title.textContent = "Tudo aprovado! 🎉";
    if (sub)   sub.textContent = "Nenhum post aguardando";
    if (pbar)  pbar.style.width = "100%";
    if (pLabel) pLabel.textContent = `${approved} de ${approved} aprovados`;
    return;
  }
  approvalPostIndex = Math.max(0, Math.min(approvalPostIndex, pending.length - 1));
  const post = pending[approvalPostIndex];
  if (title) title.textContent = `${escapeHtml(post.title)} — ${escapeHtml(post.client)}`;
  if (sub)   sub.textContent = `Post ${approvalPostIndex + 1} de ${pending.length} pendentes`;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
  if (pbar)  pbar.style.width = `${pct}%`;
  if (pLabel) pLabel.textContent = `${approved} de ${total} aprovados (${pct}%)`;
}

document.getElementById("approval-prev")?.addEventListener("click", () => {
  const pending = posts.filter(p => p.status === "Enviado para aprovação" || p.status === "Ajuste solicitado");
  if (!pending.length) return;
  approvalPostIndex = (approvalPostIndex - 1 + pending.length) % pending.length;
  renderApprovalBoard();
  renderApprovalNav();
});

document.getElementById("approval-next")?.addEventListener("click", () => {
  const pending = posts.filter(p => p.status === "Enviado para aprovação" || p.status === "Ajuste solicitado");
  if (!pending.length) return;
  approvalPostIndex = (approvalPostIndex + 1) % pending.length;
  renderApprovalBoard();
  renderApprovalNav();
});

// Patch renderApprovalBoard to also update nav
const _origApprovalBoard = renderApprovalBoard;
renderApprovalBoard = function() {
  _origApprovalBoard();
  renderApprovalNav();
};
renderApprovalNav();

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener("keydown", e => {
  if (e.target.matches("input, textarea, select")) return;
  if (e.key === "n" || e.key === "N") {
    document.getElementById("new-post-btn")?.click();
  }
  if (e.key === "Escape" && modal?.open) {
    modal.close();
  }
  const inApproval = document.querySelector("#approval.is-visible");
  if (inApproval) {
    if (e.key === "ArrowRight") document.getElementById("approval-next")?.click();
    if (e.key === "ArrowLeft")  document.getElementById("approval-prev")?.click();
    if (e.key === "a" || e.key === "A") {
      const pending = posts.filter(p => p.status === "Enviado para aprovação" || p.status === "Ajuste solicitado");
      if (!pending.length) return;
      const post = pending[approvalPostIndex];
      post.status = "Aprovado";
      savePosts();
      renderAll();
      renderApprovalBoard();
      logActivity(`aprovou "${post.title}" (${post.client})`);
      showToast(`"${post.title}" aprovado.`);
    }
  }
  // 1-9 = jump to nav sections
  const SECTION_KEYS = { "1":"dashboard","2":"clients","3":"builder","4":"calendar","5":"feed","6":"approval","7":"sharing","8":"strategy","9":"reports" };
  if (SECTION_KEYS[e.key] && !e.ctrlKey && !e.metaKey) showSection(SECTION_KEYS[e.key]);
});

// ── Log actions into activity feed ───────────────────────────────────────────
// Patch key existing actions to log

const _origSaveApproval = document.querySelector("#approval .primary-button.full");
if (_origSaveApproval) {
  const _origClick = _origSaveApproval.onclick;
  _origSaveApproval.addEventListener("click", () => {
    const pending = posts.filter(p => p.status === "Enviado para aprovação" || p.status === "Ajuste solicitado");
    if (pending.length) {
      const post = pending[approvalPostIndex];
      if (post.status !== "Aprovado") logActivity(`aprovou "${post.title}" (${post.client})`);
    }
  });
}

document.getElementById("send-approval-btn")?.addEventListener("click", () => {
  const title = document.getElementById("builder-title")?.value || "Novo post";
  const client = document.getElementById("builder-client")?.value || "Cliente";
  logActivity(`enviou "${title}" para aprovação — ${client}`);
}, { capture: true });

document.getElementById("save-draft-btn")?.addEventListener("click", () => {
  const title = document.getElementById("builder-title")?.value || "Novo post";
  logActivity(`salvou rascunho: "${title}"`);
}, { capture: true });

// ── Search result count badge ─────────────────────────────────────────────────
const globalSearch = document.getElementById("global-search");
globalSearch?.addEventListener("input", () => {
  const term = globalSearch.value.trim();
  if (!term) {
    document.querySelector(".search-count-badge")?.remove();
    return;
  }
  const count = activePosts().length;
  let badge = document.querySelector(".search-count-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "search-count-badge search-count";
    globalSearch.parentElement.appendChild(badge);
  }
  badge.textContent = `${count} resultado${count !== 1 ? "s" : ""}`;
});

// ── Best time to post hint in builder ────────────────────────────────────────
const BEST_TIMES = {
  "Instagram": "Melhores horários: seg-sex 11h–13h ou 19h–21h",
  "LinkedIn":  "Melhores horários: ter–qui 8h–10h ou 12h",
  "TikTok":    "Melhores horários: ter–sex 19h–23h",
  "Facebook":  "Melhores horários: qua–qui 13h–16h",
};

const builderNetworkSel = document.getElementById("builder-network");
const builderTimeSel    = document.getElementById("builder-time");

function renderBestTime() {
  const net  = builderNetworkSel?.value;
  const hint = BEST_TIMES[net];
  let el = document.getElementById("best-time-hint");
  if (!hint) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = "best-time-hint";
    el.className = "best-time-badge";
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span></span>`;
    builderTimeSel?.closest("label")?.appendChild(el);
  }
  el.querySelector("span").textContent = hint;
}

builderNetworkSel?.addEventListener("change", renderBestTime);
renderBestTime();

// ── Biblioteca ───────────────────────────────────────────────────────────────
const LIB_KEY = "gvPlannerFiles";

const LIB_CATS = [
  { id: "all",       label: "Todos",       icon: "🗂" },
  { id: "logos",     label: "Logos",       icon: "🎨" },
  { id: "fotos",     label: "Fotos",       icon: "📷" },
  { id: "artes",     label: "Artes",       icon: "✏️" },
  { id: "videos",    label: "Vídeos",      icon: "🎬" },
  { id: "refs",      label: "Referências", icon: "🔗" },
  { id: "briefings", label: "Briefings",   icon: "📋" },
  { id: "docs",      label: "Documentos",  icon: "📄" },
];

let libFiles    = [];
let libCat      = "all";
let libClient   = "all";
let libView     = "grid";
let libSearch   = "";
let libStagedFiles = [];
let libPreviewId   = null;

function loadLibFiles() {
  try { return JSON.parse(localStorage.getItem(LIB_KEY)) || []; } catch { return []; }
}
function saveLibFiles() {
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(libFiles));
  } catch (e) {
    showToast("Armazenamento cheio. Remova arquivos antigos.");
  }
}

function fileIcon(mime) {
  if (!mime) return "📎";
  if (mime.startsWith("image/")) return "🖼";
  if (mime.startsWith("video/")) return "🎬";
  if (mime === "application/pdf") return "📑";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("sheet") || mime.includes("excel")) return "📊";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "📊";
  if (mime.startsWith("text/")) return "📄";
  return "📎";
}

function fmtFileSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function libCatLabel(catId) {
  return LIB_CATS.find(c => c.id === catId)?.label || catId;
}

// Resize image to max dimension, return data URL
function resizeImage(file, maxDim) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function readFileFull(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => resolve(ev.target.result);
    reader.readAsDataURL(file);
  });
}

async function processAndStoreFiles(files, clientName, category) {
  const now = new Date().toLocaleDateString("pt-BR");
  let added = 0;
  for (const file of files) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    let thumb = null;
    let data  = null;

    try {
      if (isImage) {
        thumb = await resizeImage(file, 300);          // always small thumbnail
        if (file.size < 2 * 1024 * 1024) {            // full data only if < 2MB
          data = await resizeImage(file, 1920);
        } else {
          data = thumb; // use thumbnail as art fallback
        }
      } else if (file.size < 500 * 1024) {             // non-images < 500KB: store full
        data = await readFileFull(file);
      }
    } catch (e) { /* skip data on error */ }

    libFiles.push({
      id:       `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name:     file.name,
      mime:     file.type,
      size:     file.size,
      client:   clientName,
      category,
      date:     now,
      thumb,
      data,
    });
    added++;
  }
  saveLibFiles();
  return added;
}

function libFilteredFiles() {
  return libFiles.filter(f => {
    const matchCat    = libCat === "all" || f.category === libCat;
    const matchClient = libClient === "all" || f.client === libClient;
    const matchSearch = !libSearch || f.name.toLowerCase().includes(libSearch.toLowerCase());
    return matchCat && matchClient && matchSearch;
  });
}

function renderLibNav() {
  const tree = document.getElementById("lib-nav-tree");
  if (!tree) return;

  // Count per category
  const counts = {};
  LIB_CATS.forEach(c => {
    counts[c.id] = c.id === "all"
      ? libFiles.length
      : libFiles.filter(f => f.category === c.id).length;
  });

  tree.innerHTML = LIB_CATS.map(c => `
    <button class="lib-nav-item${libCat === c.id ? " is-active" : ""}" data-libcat="${c.id}">
      <span class="lib-nav-icon">${c.icon}</span>
      ${escapeHtml(c.label)}
      <span class="lib-nav-count">${counts[c.id]}</span>
    </button>
  `).join("");

  tree.querySelectorAll("[data-libcat]").forEach(btn => {
    btn.addEventListener("click", () => {
      libCat = btn.dataset.libcat;
      renderLibNav();
      renderLibMain();
    });
  });
}

function renderLibMain() {
  const filtered = libFilteredFiles();
  const container = document.getElementById("lib-files-container");
  const emptyEl   = document.getElementById("lib-empty");
  const countEl   = document.getElementById("lib-count");
  const crumb     = document.getElementById("lib-breadcrumb");
  if (!container) return;

  const catInfo = LIB_CATS.find(c => c.id === libCat);
  if (crumb) crumb.textContent = catInfo ? catInfo.icon + " " + catInfo.label : "Todos";
  if (countEl) countEl.textContent = filtered.length + " arquivo" + (filtered.length !== 1 ? "s" : "");

  if (!filtered.length) {
    container.innerHTML = "";
    emptyEl?.removeAttribute("hidden");
    return;
  }
  emptyEl?.setAttribute("hidden", "");

  if (libView === "list") {
    container.innerHTML = `
      <div class="lib-list">
        <div class="lib-list-hdr">
          <div></div>
          <div>Nome</div>
          <div>Cliente</div>
          <div>Categoria</div>
          <div>Tamanho</div>
          <div>Data</div>
        </div>
        ${filtered.map(f => libListRow(f)).join("")}
      </div>`;
  } else {
    container.innerHTML = `<div class="lib-grid">${filtered.map(f => libGridCard(f)).join("")}</div>`;
  }

  container.querySelectorAll("[data-lib-preview]").forEach(el => {
    el.addEventListener("click", e => {
      if (e.target.closest("[data-lib-act]")) return; // action btn
      libPreviewFile(el.dataset.libPreview);
    });
  });
  container.querySelectorAll("[data-lib-act]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.dataset.libAct;
      const act = btn.dataset.act;
      if (act === "del") libDeleteFile(id);
      if (act === "art") libUseAsArt(id);
      if (act === "prev") libPreviewFile(id);
    });
  });
}

function libThumb(f) {
  if (f.thumb) return `<img src="${f.thumb}" alt="${escapeHtml(f.name)}" loading="lazy" />`;
  return `<span>${fileIcon(f.mime)}</span>`;
}

function libGridCard(f) {
  const isImg = f.mime?.startsWith("image/");
  return `
    <div class="lib-file" data-lib-preview="${f.id}">
      <div class="lib-file-thumb">${libThumb(f)}</div>
      <div class="lib-file-info">
        <div class="lib-file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
        <div class="lib-file-meta">${fmtFileSize(f.size)} · ${escapeHtml(f.date)}</div>
      </div>
      <div class="lib-file-actions">
        <button class="lib-file-act" data-lib-act="${f.id}" data-act="prev" title="Visualizar">👁</button>
        ${isImg ? `<button class="lib-file-act" data-lib-act="${f.id}" data-act="art" title="Usar como arte">✨</button>` : ""}
        <button class="lib-file-act del" data-lib-act="${f.id}" data-act="del" title="Excluir">🗑</button>
      </div>
    </div>`;
}

function libListRow(f) {
  const isImg = f.mime?.startsWith("image/");
  return `
    <div class="lib-list-row" data-lib-preview="${f.id}">
      <div class="lib-list-icon">${libThumb(f)}</div>
      <div class="lib-list-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</div>
      <div style="font-size:12px;color:var(--muted)">${escapeHtml(f.client || "—")}</div>
      <div style="font-size:12px;color:var(--muted)">${libCatLabel(f.category)}</div>
      <div style="font-size:12px;color:var(--muted)">${fmtFileSize(f.size)}</div>
      <div class="lib-list-actions">
        ${isImg ? `<button class="icon-button" data-lib-act="${f.id}" data-act="art" title="Usar como arte" style="font-size:13px">✨</button>` : ""}
        <button class="icon-button" data-lib-act="${f.id}" data-act="del" title="Excluir" style="font-size:13px">🗑</button>
      </div>
    </div>`;
}

function libPreviewFile(id) {
  // eslint-disable-next-line eqeqeq
  const f = libFiles.find(x => x.id == id);
  if (!f) return;
  libPreviewId = f.id; // store actual id from the file object
  // Reset inline delete confirm state
  const dc = document.getElementById("lib-prev-del-confirm");
  const db = document.getElementById("lib-prev-delete");
  if (dc) dc.style.display = "none";
  if (db) db.style.display = "";
  const modal = document.getElementById("lib-preview-modal");
  const body  = document.getElementById("lib-preview-body");
  const name  = document.getElementById("lib-prev-name");
  const meta  = document.getElementById("lib-preview-meta");
  const useArt = document.getElementById("lib-prev-use-art");
  const dlBtn  = document.getElementById("lib-prev-download");

  name.textContent = f.name;
  meta.innerHTML = `${escapeHtml(f.client || "Sem cliente")} · ${libCatLabel(f.category)} · ${fmtFileSize(f.size)} · ${escapeHtml(f.date)}`;

  const isImg   = f.mime?.startsWith("image/");
  const isVideo = f.mime?.startsWith("video/");
  body.innerHTML = "";
  if (isImg && (f.data || f.thumb)) {
    const img = document.createElement("img");
    img.alt = f.name;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "70vh";
    img.style.objectFit = "contain";
    img.style.display = "block";
    img.onerror = () => {
      body.innerHTML = `<div class="lib-prev-icon">🖼️</div><small style="color:#aaa;font-size:12px;margin-top:8px">Prévia indisponível</small>`;
    };
    img.src = f.data || f.thumb;
    body.appendChild(img);
  } else if (isVideo && f.data) {
    const vid = document.createElement("video");
    vid.src = f.data;
    vid.controls = true;
    vid.style.maxWidth = "100%";
    vid.style.maxHeight = "70vh";
    body.appendChild(vid);
  } else {
    body.innerHTML = `<div class="lib-prev-icon">${fileIcon(f.mime)}</div>`;
  }

  if (isImg) {
    useArt.removeAttribute("hidden");
    useArt.onclick = () => { libUseAsArt(id); modal.close(); };
  } else {
    useArt.setAttribute("hidden", "");
  }

  if (f.data) {
    dlBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = f.data;
      a.download = f.name;
      a.click();
    };
  } else {
    dlBtn.style.opacity = ".4";
    dlBtn.title = "Arquivo grande — download indisponível no armazenamento local";
  }

  modal.showModal();
}

function libDeleteFile(id) {
  // eslint-disable-next-line eqeqeq
  const f = libFiles.find(x => x.id == id);
  if (!f) return;
  // eslint-disable-next-line eqeqeq
  libFiles = libFiles.filter(x => x.id != id);
  saveLibFiles();
  renderLibNav();
  renderLibMain();
  showToast(`"${f.name}" removido.`);
}

function libUseAsArt(id) {
  // eslint-disable-next-line eqeqeq
  const f = libFiles.find(x => x.id == id);
  if (!f || !f.data) { showToast("Arquivo sem dados disponíveis."); return; }
  builderArtData = f.data;
  document.querySelector("[data-section='builder']")?.click();
  updateBuilderPreview();
  showToast(`Arte "${f.name}" selecionada no builder.`);
}

function renderLibClientFilter() {
  const sel = document.getElementById("lib-client-filter");
  const upSel = document.getElementById("lib-up-client");
  if (!sel) return;
  const opts = clients.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
  sel.innerHTML = `<option value="all">Todos os clientes</option>${opts}`;
  if (upSel) upSel.innerHTML = opts;
  sel.value = libClient;
}

function clearAllLibFiles() {
  localStorage.removeItem(LIB_KEY);
  libFiles = [];
  renderLibNav();
  renderLibMain();
  showToast("Biblioteca limpa.");
}

function initLibrary() {
  libFiles = loadLibFiles();
  // Remove arquivo.jpg genérico que não pôde ser excluído
  libFiles = libFiles.filter(f => f.name?.toLowerCase() !== "arquivo.jpg");
  saveLibFiles();
  renderLibClientFilter();
  renderLibNav();
  renderLibMain();

  // Clear all button
  document.getElementById("lib-clear-btn")?.addEventListener("click", () => {
    clearAllLibFiles();
  });

  // View toggle
  document.getElementById("lib-view-seg")?.addEventListener("click", e => {
    const btn = e.target.closest("[data-lview]");
    if (!btn) return;
    libView = btn.dataset.lview;
    document.querySelectorAll("#lib-view-seg button").forEach(b => b.classList.toggle("is-selected", b === btn));
    renderLibMain();
  });

  // Nav search
  document.getElementById("lib-search")?.addEventListener("input", e => {
    libSearch = e.target.value;
    renderLibMain();
  });

  // Client filter
  document.getElementById("lib-client-filter")?.addEventListener("change", e => {
    libClient = e.target.value;
    renderLibMain();
  });

  // Upload button
  document.getElementById("lib-upload-btn")?.addEventListener("click", () => openLibUpload());
  document.getElementById("lib-empty-upload")?.addEventListener("click", () => openLibUpload());

  // Drag-and-drop on main area
  const mainEl = document.getElementById("lib-main");
  const overlay = document.getElementById("lib-dropzone-overlay");
  if (mainEl) {
    mainEl.addEventListener("dragover", e => { e.preventDefault(); overlay?.removeAttribute("hidden"); });
    mainEl.addEventListener("dragleave", e => { if (!mainEl.contains(e.relatedTarget)) overlay?.setAttribute("hidden", ""); });
    mainEl.addEventListener("drop", e => {
      e.preventDefault();
      overlay?.setAttribute("hidden", "");
      const files = [...e.dataTransfer.files];
      if (files.length) { openLibUpload(files); }
    });
  }

  // Upload modal
  const uploadModal = document.getElementById("lib-upload-modal");
  const dropArea    = document.getElementById("lib-drop-area");
  const fileInput   = document.getElementById("lib-file-input");
  const staged      = document.getElementById("lib-staged");
  const saveBtn     = document.getElementById("lib-up-save");

  document.getElementById("lib-upload-close")?.addEventListener("click", () => uploadModal?.close());
  document.getElementById("lib-up-cancel")?.addEventListener("click", () => uploadModal?.close());

  dropArea?.addEventListener("click", () => fileInput?.click());
  dropArea?.addEventListener("dragover", e => { e.preventDefault(); dropArea.classList.add("is-over"); });
  dropArea?.addEventListener("dragleave", () => dropArea.classList.remove("is-over"));
  dropArea?.addEventListener("drop", e => {
    e.preventDefault();
    dropArea.classList.remove("is-over");
    addStagedFiles([...e.dataTransfer.files]);
  });
  fileInput?.addEventListener("change", () => { addStagedFiles([...fileInput.files]); fileInput.value = ""; });

  document.getElementById("lib-up-save")?.addEventListener("click", async () => {
    if (!libStagedFiles.length) return;
    const clientVal   = document.getElementById("lib-up-client")?.value || clients[0]?.name || "";
    const categoryVal = document.getElementById("lib-up-category")?.value || "artes";
    saveBtn.textContent = "Salvando…";
    saveBtn.disabled = true;
    const count = await processAndStoreFiles(libStagedFiles, clientVal, categoryVal);
    libStagedFiles = [];
    uploadModal?.close();
    renderLibNav();
    renderLibMain();
    showToast(`${count} arquivo(s) adicionado(s) à biblioteca.`);
    saveBtn.textContent = "Salvar arquivos";
    saveBtn.disabled = false;
  });

  // Preview modal
  const previewModal = document.getElementById("lib-preview-modal");
  const delConfirm   = document.getElementById("lib-prev-del-confirm");
  const delBtn       = document.getElementById("lib-prev-delete");

  document.getElementById("lib-preview-close")?.addEventListener("click", () => {
    if (delConfirm) delConfirm.style.display = "none";
    if (delBtn) delBtn.style.display = "";
    previewModal?.close();
  });

  // First click → show inline confirm; second click (Sim) → delete
  delBtn?.addEventListener("click", () => {
    if (delConfirm) delConfirm.style.display = "flex";
    delBtn.style.display = "none";
  });
  document.getElementById("lib-prev-del-yes")?.addEventListener("click", () => {
    if (delConfirm) delConfirm.style.display = "none";
    if (delBtn) delBtn.style.display = "";
    if (libPreviewId) { libDeleteFile(libPreviewId); previewModal?.close(); }
  });
  document.getElementById("lib-prev-del-no")?.addEventListener("click", () => {
    if (delConfirm) delConfirm.style.display = "none";
    if (delBtn) delBtn.style.display = "";
  });
}

function openLibUpload(preloadFiles) {
  libStagedFiles = preloadFiles || [];
  const staged = document.getElementById("lib-staged");
  renderStagedList();
  document.getElementById("lib-up-save").disabled = !libStagedFiles.length;
  renderLibClientFilter();
  document.getElementById("lib-upload-modal")?.showModal();
}

function addStagedFiles(files) {
  libStagedFiles.push(...files);
  renderStagedList();
  const saveBtn = document.getElementById("lib-up-save");
  if (saveBtn) saveBtn.disabled = false;
}

function renderStagedList() {
  const staged = document.getElementById("lib-staged");
  if (!staged) return;
  if (!libStagedFiles.length) { staged.setAttribute("hidden", ""); return; }
  staged.removeAttribute("hidden");
  staged.innerHTML = libStagedFiles.map((f, i) => `
    <div class="lib-staged-item">
      <span class="ficon">${fileIcon(f.type)}</span>
      <span class="fname">${escapeHtml(f.name)}</span>
      <span class="fsize">${fmtFileSize(f.size)}</span>
    </div>`).join("");
}

// Initialise when #files section is shown
const _origShowSection = showSection;
showSection = function(id) {
  _origShowSection(id);
  if (id === "files") {
    renderLibClientFilter();
    renderLibNav();
    renderLibMain();
  }
};

// Init on load if #files is already visible
initLibrary();

// ── Admin PDF export ─────────────────────────────────────────────────────────
function adminDownloadPDF() {
  const client = clientFilter.value === "all" ? (posts[0]?.client || "Todos os clientes") : clientFilter.value;
  const month = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
  const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
  const clientPosts = clientFilter.value === "all" ? posts : posts.filter(p => p.client === client);
  if (!clientPosts.length) { alert("Nenhum post para exportar."); return; }

  const base = document.baseURI || location.href;
  function abs(src) { try { return new URL(src, base).href; } catch { return src; } }
  const logoUrl = abs("./logo-grupo-venda.png");
  const now = new Date();
  const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const approved = clientPosts.filter(p => p.status === "Aprovado").length;
  const adjusts  = clientPosts.filter(p => p.status === "Ajuste solicitado").length;
  const pending  = clientPosts.filter(p => !p.status || p.status === "Aguardando aprovação" || p.status === "Pendente").length;

  const allCmts = JSON.parse(localStorage.getItem("gvPlannerComments") || "{}");
  const netColors = { Instagram:"#e1306c", LinkedIn:"#0a66c2", TikTok:"#010101", Facebook:"#1877f2", YouTube:"#ff0000", Twitter:"#1da1f2", Pinterest:"#e60023" };

  function esc(s) { return (s||"").toString().replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function fmtD(d) { if(!d) return "—"; const [y,m,day]=d.split("-"); return `${day}/${m}/${y}`; }
  function netColor(n) { return netColors[n] || "#667085"; }
  function statusLabel(s) { return s==="Aprovado"?"✓ Aprovado":s==="Ajuste solicitado"?"↺ Ajuste":"⏳ Aguardando"; }
  function statusBg(s) { return s==="Aprovado"?"#dcfce7":s==="Ajuste solicitado"?"#fee2e2":"#eff6ff"; }
  function statusFg(s) { return s==="Aprovado"?"#166534":s==="Ajuste solicitado"?"#991b1b":"#1e40af"; }
  function imgFromArt(art) { const m=art&&art.match(/url\(['"]?([^'")\s]+)['"]?\)/); return m?abs(m[1]):""; }

  function buildComments(postId) {
    const cmts = (allCmts[postId] || []).filter(c => c.type !== "Interno");
    if (!cmts.length) return "";
    return `<div class="pdf-cmts"><div class="pdf-cmts-hd">Comentários</div>${
      cmts.map(c=>`<div class="pdf-cmt">
        ${c.pin?`<span class="pdf-pin-ref">📍 Ponto referenciado na imagem</span>`:""}
        <div class="pdf-cmt-author">${esc(c.author)}</div>
        <div class="pdf-cmt-text">${esc(c.text)}</div>
        <div class="pdf-cmt-date">${c.date}</div>
      </div>`).join("")}
    </div>`;
  }

  const coverHtml = `<div class="pdf-cover">
    <div class="pdf-cover-inner">
      <div class="pdf-cover-logo-wrap">
        <img src="${logoUrl}" class="pdf-cover-logo" />
        <div class="pdf-cover-divider"></div>
        <span class="pdf-cover-tag">Relatório de Aprovação de Conteúdo</span>
      </div>
      <div class="pdf-cover-client">${esc(client)}</div>
      <div class="pdf-cover-period">${esc(monthLabel)}</div>
      <div class="pdf-cover-stats">
        <div class="pdf-stat"><strong>${clientPosts.length}</strong><span>Total</span></div>
        <div class="pdf-stat pdf-stat-ok"><strong>${approved}</strong><span>Aprovados</span></div>
        <div class="pdf-stat pdf-stat-warn"><strong>${adjusts}</strong><span>Ajustes</span></div>
        <div class="pdf-stat pdf-stat-pend"><strong>${pending}</strong><span>Aguardando</span></div>
      </div>
      <div class="pdf-cover-foot">Documento gerado em ${dateStr} · GV Planner · Grupo Venda</div>
    </div>
  </div>`;

  const pagesHtml = clientPosts.map(p => {
    const img = imgFromArt(p.art);
    const nc  = netColor(p.network);
    return `<div class="pdf-page">
      <div class="pdf-hdr">
        <img src="${logoUrl}" class="pdf-logo" />
        <div class="pdf-hdr-mid">
          <strong>${esc(client)}</strong>
          <span>${esc(monthLabel)}</span>
        </div>
        <span class="pdf-badge" style="background:${statusBg(p.status)};color:${statusFg(p.status)}">${statusLabel(p.status)}</span>
      </div>
      ${img?`<div class="pdf-img-wrap"><img src="${img}" class="pdf-img" /></div>`:`<div class="pdf-img-placeholder"><span>Sem imagem</span></div>`}
      <div class="pdf-body">
        <div class="pdf-title-row">
          <h2>${esc(p.title||"Sem título")}</h2>
          <span class="pdf-net" style="background:${nc}20;color:${nc};border-color:${nc}40">${esc(p.network||"")}</span>
        </div>
        <div class="pdf-meta-row">
          <div class="pdf-meta-item"><span>📅</span><span>${fmtD(p.date)}${p.time?" às "+esc(p.time):""}</span></div>
          <div class="pdf-meta-item"><span>📐</span><span>${esc(p.format||"—")}</span></div>
          ${p.pillar?`<div class="pdf-meta-item"><span>🎯</span><span>${esc(p.pillar)}</span></div>`:""}
        </div>
        ${p.caption?`<div class="pdf-caption-block"><div class="pdf-sec-label">Legenda</div><p class="pdf-caption">${esc(p.caption)}</p></div>`:""}
        ${p.hashtags?`<div class="pdf-tags-block"><div class="pdf-sec-label">Hashtags</div><p class="pdf-tags">${esc(p.hashtags)}</p></div>`:""}
        ${buildComments(p.id)}
      </div>
      <div class="pdf-foot"><img src="${logoUrl}" class="pdf-foot-logo" /> GV Planner · Grupo Venda · Documento de aprovação</div>
    </div>`;
  }).join("");

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    @page{size:A4 portrait;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact;color:#111827}
    .pdf-cover{width:210mm;min-height:297mm;background:#101828;display:flex;align-items:center;justify-content:center;page-break-after:always;break-after:page}
    .pdf-cover-inner{text-align:center;padding:20mm;display:flex;flex-direction:column;align-items:center;gap:16px}
    .pdf-cover-logo-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;margin-bottom:12px}
    .pdf-cover-logo{height:52px;filter:brightness(0) invert(1)}
    .pdf-cover-divider{width:60px;height:3px;background:#0f9f8f;border-radius:2px}
    .pdf-cover-tag{font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#8892a4}
    .pdf-cover-client{font-size:36px;font-weight:900;color:#fff;line-height:1.1;margin-top:8px}
    .pdf-cover-period{font-size:16px;color:#8892a4;font-weight:500;margin-top:4px}
    .pdf-cover-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px;width:100%}
    .pdf-stat{background:#1e2d3d;border-radius:10px;padding:16px 12px;text-align:center}
    .pdf-stat strong{display:block;font-size:32px;font-weight:900;color:#fff;line-height:1}
    .pdf-stat span{display:block;font-size:10px;color:#667085;text-transform:uppercase;letter-spacing:.08em;margin-top:6px}
    .pdf-stat-ok strong{color:#34d399} .pdf-stat-warn strong{color:#f87171} .pdf-stat-pend strong{color:#60a5fa}
    .pdf-cover-foot{font-size:10px;color:#4b5563;margin-top:28px}
    .pdf-page{width:210mm;min-height:297mm;background:#fff;display:flex;flex-direction:column;page-break-after:always;break-after:page;overflow:hidden}
    .pdf-page:last-child{page-break-after:avoid;break-after:avoid}
    .pdf-hdr{display:flex;align-items:center;gap:12px;padding:7mm 12mm 6mm;background:#101828;flex-shrink:0}
    .pdf-logo{height:26px;filter:brightness(0) invert(1)}
    .pdf-hdr-mid{flex:1;padding-left:12px;border-left:2px solid #2d3e50}
    .pdf-hdr-mid strong{display:block;font-size:12px;color:#fff;font-weight:700}
    .pdf-hdr-mid span{display:block;font-size:10px;color:#8892a4}
    .pdf-badge{font-size:10px;font-weight:700;padding:4px 12px;border-radius:99px;white-space:nowrap;flex-shrink:0}
    .pdf-img-wrap{width:100%;height:88mm;overflow:hidden;background:#111827;flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .pdf-img{width:100%;height:88mm;object-fit:cover;display:block}
    .pdf-img-placeholder{width:100%;height:40mm;background:#f8fafc;flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .pdf-img-placeholder span{font-size:12px;color:#9ca3af}
    .pdf-body{flex:1;padding:7mm 12mm 5mm;display:flex;flex-direction:column;gap:8px;overflow:hidden}
    .pdf-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
    h2{font-size:18px;font-weight:800;color:#111827;line-height:1.2}
    .pdf-net{font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;border:1px solid;flex-shrink:0;align-self:flex-start;margin-top:3px}
    .pdf-meta-row{display:flex;gap:16px;flex-wrap:wrap}
    .pdf-meta-item{display:flex;align-items:center;gap:5px;font-size:11px;color:#667085}
    .pdf-caption-block,.pdf-tags-block{background:#f8fafc;border-radius:8px;padding:8px 12px;border:1px solid #e5e7eb}
    .pdf-sec-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;margin-bottom:5px}
    .pdf-caption{font-size:13px;line-height:1.7;color:#374151}
    .pdf-tags{font-size:12px;color:#3164d4;line-height:1.6}
    .pdf-cmts{border-top:1px solid #f0f2f5;padding-top:8px}
    .pdf-cmts-hd{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#0f9f8f;margin-bottom:6px}
    .pdf-cmt{background:#f0faf8;border-left:3px solid #0f9f8f;border-radius:0 6px 6px 0;padding:6px 10px;margin-bottom:5px}
    .pdf-pin-ref{font-size:9px;color:#e15d4f;font-weight:600;margin-bottom:3px}
    .pdf-cmt-author{font-size:11px;font-weight:700;color:#0f9f8f}
    .pdf-cmt-text{font-size:12px;color:#374151;margin-top:2px;line-height:1.5}
    .pdf-cmt-date{font-size:9px;color:#9ca3af;margin-top:3px}
    .pdf-foot{display:flex;align-items:center;justify-content:center;gap:10px;border-top:1px solid #e5e7eb;padding:4mm 12mm;font-size:9px;color:#9ca3af;flex-shrink:0;background:#f9fafb}
    .pdf-foot-logo{height:14px;filter:grayscale(1) opacity(.4)}
  `;

  const win = window.open("", "_blank", "width=960,height=780");
  if (!win) { alert("Ative pop-ups para exportar o PDF."); return; }
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="utf-8"/>
    <title>Aprovação — ${esc(client)} — ${esc(monthLabel)}</title>
    <base href="${base}"/>
    <style>${css}</style>
  </head><body>${coverHtml}${pagesHtml}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 1200);
}

// ── Init: call renderDashboard on first load ──────────────────────────────────
renderDashboard();
