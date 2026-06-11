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

function renderCalendar() {
  const grid = document.querySelector("#calendar-grid");
  const days = Array.from({ length: 30 }, (_, index) => index + 1);
  grid.innerHTML = days.map((day) => {
    const dayPosts = activePosts().filter((post) => Number(post.date.slice(-2)) === day);
    return `
      <article class="day-card" data-day="${day}">
        <time>${String(day).padStart(2, "0")}/06</time>
        ${dayPosts.map((post) => `
          <button class="mini-post" draggable="true" data-post-id="${post.id}" style="--status-color:${statusColor[post.status]}">
            <strong>${escapeHtml(post.client)}</strong><br>${escapeHtml(post.format)} · ${escapeHtml(post.network)}
          </button>
        `).join("")}
      </article>
    `;
  }).join("");
}

function renderKanban() {
  const board = document.querySelector("#kanban-board");
  const columns = ["Ideia", "Em produção", "Enviado para aprovação", "Aprovado"];
  board.innerHTML = columns.map((status) => `
    <section class="kanban-column">
      <h3>${status}</h3>
      ${activePosts().filter((post) => post.status === status).map((post) => `
        <button class="post-row" data-post-id="${post.id}">
          <span class="thumb" style="--art:${post.art}"></span>
          <span><strong>${escapeHtml(post.title)}</strong><span>${escapeHtml(post.client)}</span></span>
        </button>
      `).join("")}
    </section>
  `).join("");
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
  showSection("calendar");
  setTimeout(() => openPost(posts[0]), 120);
});

document.querySelector("#copy-share-btn").addEventListener("click", () => {
  const link = "https://gvplanner.com.br/c/venda-prime/junho-2026";
  navigator.clipboard?.writeText(link).catch(() => {});
  document.querySelector("#copy-share-btn").textContent = "Link copiado";
  setTimeout(() => {
    document.querySelector("#copy-share-btn").textContent = "Copiar link de aprovação";
  }, 1800);
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
  const post = posts.find((item) => item.id === Number(trigger.dataset.postId));
  if (post) openPost(post);
});

renderAll();
renderCarouselSlides();
updateBuilderPreview();
