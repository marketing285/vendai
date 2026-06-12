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

function labelFor(sectionId) {
  return document.querySelector(`[data-section="${sectionId}"]`)?.textContent.trim().replace(/^[^A-Za-zÀ-ÿ]+/, "") || "Dashboard";
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
  document.querySelector("#modal-art").style.setProperty("--art", post.art);
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

function renderFeed() {
  const feed = document.querySelector("#instagram-grid");
  const feedPosts = activePosts().concat(posts).slice(0, 12);
  feed.innerHTML = feedPosts.map((post) => `
    <button class="feed-tile" data-post-id="${post.id}" style="--art:${post.art}">
      ${escapeHtml(post.pillar)}
    </button>
  `).join("");
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
    art: format === "Carrossel"
      ? "linear-gradient(135deg, #111827, #0f9f8f)"
      : "linear-gradient(135deg, #3164d4, #e15d4f)",
    slides: format === "Carrossel" ? getSlideData() : []
  };
}

function upsertBuilderPost(statusOverride) {
  const post = collectBuilderPost(statusOverride);
  posts = [post, ...posts];
  savePosts();
  renderAll();
  return post;
}

navItems.forEach((item) => item.addEventListener("click", () => showSection(item.dataset.section)));

document.querySelectorAll("[data-section-jump]").forEach((button) => {
  button.addEventListener("click", () => showSection(button.dataset.sectionJump));
});

[clientFilter, statusFilter, networkFilter, search].forEach((control) => control.addEventListener("input", renderAll));

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
  document.querySelector("#save-draft-btn").textContent = "Rascunho salvo";
  setTimeout(() => {
    document.querySelector("#save-draft-btn").textContent = "Salvar rascunho";
  }, 1600);
});

document.querySelector("#send-approval-btn").addEventListener("click", () => {
  document.querySelector("#builder-status").value = "Enviado para aprovação";
  upsertBuilderPost("Enviado para aprovação");
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

// ── Feed segmented toggle ─────────────────────────────────────────────────────
const feedSegmented = document.querySelector("#feed .segmented");
if (feedSegmented) {
  feedSegmented.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    feedSegmented.querySelectorAll("button").forEach((b) => b.classList.remove("is-selected"));
    btn.classList.add("is-selected");

    const filter = btn.textContent.trim();
    const feed = document.querySelector("#instagram-grid");
    let filtered;
    if (filter === "Aprovados") {
      filtered = posts.filter((p) => p.status === "Aprovado");
    } else if (filter === "Publicados") {
      filtered = posts.filter((p) => p.status === "Publicado");
    } else {
      filtered = activePosts().concat(posts);
    }
    feed.innerHTML = filtered.slice(0, 12).map((post) => `
      <button class="feed-tile" data-post-id="${post.id}" style="--art:${post.art}">
        ${escapeHtml(post.pillar)}
      </button>
    `).join("");
  });
}

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

document.querySelector("#files .primary-button")?.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.click();
  input.addEventListener("change", () => {
    if (input.files.length) showToast(`${input.files.length} arquivo(s) selecionado(s).`);
  });
});

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
    const rows = [
      `<div><dt>Responsável</dt><dd>${escapeHtml(c.owner || "—")}</dd></div>`,
      `<div><dt>Status</dt><dd>${escapeHtml(c.status)}</dd></div>`,
      c.instagram ? `<div><dt>Instagram</dt><dd>${escapeHtml(c.instagram)}</dd></div>` : "",
      c.linkedin ? `<div><dt>LinkedIn</dt><dd>${escapeHtml(c.linkedin)}</dd></div>` : "",
      c.site ? `<div><dt>Site</dt><dd>${escapeHtml(c.site)}</dd></div>` : "",
      `<div><dt>Início</dt><dd>${c.start ? formatDate(c.start) : "—"}</dd></div>`
    ].filter(Boolean).join("");
    return `
      <article class="client-card">
        <div class="client-logo ${color}">${initials}</div>
        <h3>${escapeHtml(c.name)}</h3>
        <p>${escapeHtml(c.segment || "")}</p>
        <dl>${rows}</dl>
      </article>
    `;
  }).join("");

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
  if (board) board.style.setProperty("--art", post.art);
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
  document.querySelector("#portal-art").style.setProperty("--art", post.art);
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
