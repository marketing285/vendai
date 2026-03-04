// ─── MAX — Controller de Voz ────────────────────────────────────────────────
// Estados: idle → listening → thinking → speaking → idle

const API = "";
const SESSION_ID = "max_" + Math.random().toString(36).slice(2);
const WAKE_WORDS = ["max", "mais", "maps", "mac"]; // variações fonéticas comuns

const STOP_PHRASES = [
  "para de ouvir", "pode parar", "para ouvir", "encerrar", "encerra",
  "até logo", "tchau", "standby", "pode descansar", "pode dormir",
  "chega por hoje", "obrigado max", "valeu max", "pode fechar",
  "encerrando", "isso é tudo",
];

let state = "idle";
let muted = false;
let micAnalyser = null;
let micStream = null;
let silenceTimer = null;
let commandBuffer = "";
let wakeWordDetected = false;
let animFrame = null;
let stayActiveTimer = null;

// ─── AudioContext compartilhado ──────────────────────────────────────────────
// Chrome exige criação após gesto do usuário — desbloqueamos no primeiro clique
let sharedAudioCtx = null;

function getAudioCtx() {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } else if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

// Desbloqueia no primeiro clique em qualquer lugar da página
document.addEventListener("click", () => getAudioCtx(), { once: true });

// ─── Canvas / Waveform ───────────────────────────────────────────────────────
const canvas = document.getElementById("waveCanvas");
const ctx2d = canvas.getContext("2d");
const W = canvas.width;   // 260
const H = canvas.height;  // 260
const CX = W / 2;
const CY = H / 2;
const NUM_BARS = 48;
const INNER_R = 76;
const OUTER_R = 122;

function drawWave(analyser) {
  ctx2d.clearRect(0, 0, W, H);
  if (!analyser) return;

  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  const color = state === "speaking" ? "#a78bfa" : "#6c63ff";

  for (let i = 0; i < NUM_BARS; i++) {
    const angle = (i / NUM_BARS) * Math.PI * 2 - Math.PI / 2;
    const dataIdx = Math.floor((i / NUM_BARS) * data.length * 0.6);
    const amp = data[dataIdx] / 255;
    const barLen = INNER_R + amp * (OUTER_R - INNER_R);

    const x1 = CX + Math.cos(angle) * INNER_R;
    const y1 = CY + Math.sin(angle) * INNER_R;
    const x2 = CX + Math.cos(angle) * barLen;
    const y2 = CY + Math.sin(angle) * barLen;

    ctx2d.beginPath();
    ctx2d.moveTo(x1, y1);
    ctx2d.lineTo(x2, y2);
    ctx2d.strokeStyle = color;
    ctx2d.lineWidth = 2.5;
    ctx2d.lineCap = "round";
    ctx2d.globalAlpha = 0.25 + amp * 0.75;
    ctx2d.stroke();
  }
  ctx2d.globalAlpha = 1;
}

function startWaveLoop(analyser) {
  cancelAnimationFrame(animFrame);
  function loop() {
    drawWave(analyser);
    animFrame = requestAnimationFrame(loop);
  }
  loop();
}

function stopWaveLoop() {
  cancelAnimationFrame(animFrame);
  ctx2d.clearRect(0, 0, W, H);
}

// ─── Microfone ───────────────────────────────────────────────────────────────
async function startMicAnalyser() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = getAudioCtx();
    const source = audioCtx.createMediaStreamSource(micStream);
    micAnalyser = audioCtx.createAnalyser();
    micAnalyser.fftSize = 256;
    source.connect(micAnalyser);
    startWaveLoop(micAnalyser);
  } catch (e) {
    console.warn("[mic] Sem acesso ao microfone para visualização:", e);
  }
}

function stopMicAnalyser() {
  stopWaveLoop();
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  // Não fecha o sharedAudioCtx — apenas desconecta o stream do microfone
  micAnalyser = null;
}

// ─── Estado da UI ────────────────────────────────────────────────────────────
const statusEl     = document.getElementById("status");
const transcriptEl = document.getElementById("transcript");
const fallbackEl   = document.getElementById("fallbackText");

function setState(s) {
  state = s;
  document.body.className = s === "idle" ? "" : s;
  const labels = { idle: "Aguardando...", listening: "Ouvindo...", thinking: "Pensando...", speaking: "Falando..." };
  statusEl.textContent = labels[s] ?? "";
}

function setTranscript(text) { transcriptEl.textContent = text; }

function showFallback(text) {
  fallbackEl.style.display = "block";
  fallbackEl.textContent = text;
  setTimeout(() => { fallbackEl.style.display = "none"; }, 14000);
}

// ─── Speech Recognition ──────────────────────────────────────────────────────
let recognition = null;

function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    statusEl.textContent = "Use o Google Chrome";
    statusEl.style.color = "#f87171";
    return;
  }

  recognition = new SR();
  recognition.lang = "pt-BR";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    if (muted || state === "thinking" || state === "speaking") return;

    let interim = "";
    let final = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript.toLowerCase().trim();
      if (event.results[i].isFinal) final += t + " ";
      else interim += t;
    }

    const allText = (final + interim).trim();

    // Fase 1: detectar wake word
    if (!wakeWordDetected) {
      const hasWake = WAKE_WORDS.some(w => allText.includes(w));
      if (hasWake) {
        wakeWordDetected = true;
        commandBuffer = "";
        setState("listening");
        startMicAnalyser();
        let rest = allText;
        WAKE_WORDS.forEach(w => { rest = rest.replace(new RegExp("\\b" + w + "\\b", "g"), "").trim(); });
        if (rest.length > 2) { commandBuffer = rest; setTranscript(rest); }
        resetSilenceTimer();
      }
      return;
    }

    // Fase 2: capturando comando
    if (final.trim()) {
      commandBuffer = final.trim();
      setTranscript(commandBuffer);
      resetSilenceTimer();
    } else if (interim.trim()) {
      setTranscript(interim);
    }
  };

  recognition.onerror = (e) => {
    if (e.error === "no-speech" || e.error === "aborted") return;
    console.warn("[recognition] erro:", e.error);
  };

  recognition.onend = () => {
    if (!muted && state !== "thinking" && state !== "speaking") {
      try { recognition.start(); } catch (_) {}
    }
  };

  try { recognition.start(); } catch (_) {}
}

function resetSilenceTimer() {
  clearTimeout(silenceTimer);
  clearTimeout(stayActiveTimer);
  silenceTimer = setTimeout(() => {
    if (wakeWordDetected && commandBuffer.trim().length > 2 && state === "listening") {
      sendToMAX(commandBuffer.trim());
    }
  }, 1800);
}

// ─── Standby ─────────────────────────────────────────────────────────────────
function goStandby() {
  stopMicAnalyser();
  clearTimeout(silenceTimer);
  clearTimeout(stayActiveTimer);
  wakeWordDetected = false;
  commandBuffer = "";
  setState("idle");
  setTranscript("Em standby. Fale MAX para continuar.");
  setTimeout(() => setTranscript(""), 3000);
}

// ─── Enviar para MAX ─────────────────────────────────────────────────────────
async function sendToMAX(message) {
  // Detecta comando de encerramento antes de chamar a API
  const lower = message.toLowerCase();
  if (STOP_PHRASES.some(p => lower.includes(p))) {
    goStandby();
    return;
  }

  stopMicAnalyser();
  setState("thinking");
  setTranscript(message);
  wakeWordDetected = false;
  commandBuffer = "";

  try { recognition?.stop(); } catch (_) {}

  try {
    const res = await fetch(`${API}/api/controller/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, sessionId: SESSION_ID }),
    });

    if (!res.ok) throw new Error("Erro na API");

    const { text, audioBase64 } = await res.json();

    if (audioBase64) {
      await playAudioWithWave(audioBase64);
    } else {
      showFallback(text);
      setState("idle");
    }
  } catch (err) {
    console.error("[max] erro:", err);
    setState("idle");
  } finally {
    setTranscript("");
    try { recognition?.start(); } catch (_) {}
  }
}

// ─── Reprodução de áudio com waveform real ───────────────────────────────────
async function playAudioWithWave(base64) {
  setState("speaking");

  return new Promise(async (resolve) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const audioCtx = getAudioCtx();
      // .slice(0) cria cópia do buffer — necessário pois decodeAudioData transfere ownership
      const audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));

      const source = audioCtx.createBufferSource();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;

      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);

      startWaveLoop(analyser);
      source.start(0);

      source.onended = () => {
        stopWaveLoop();
        analyser.disconnect();
        // Fica ativo por 12s aguardando próxima pergunta
        wakeWordDetected = true;
        commandBuffer = "";
        setState("listening");
        startMicAnalyser();
        clearTimeout(stayActiveTimer);
        stayActiveTimer = setTimeout(() => {
          wakeWordDetected = false;
          stopMicAnalyser();
          setState("idle");
        }, 12000);
        resolve();
      };
    } catch (e) {
      console.error("[audio] erro:", e);
      stopWaveLoop();
      setState("idle");
      resolve();
    }
  });
}

// ─── Ativação manual (clique no orbe) ────────────────────────────────────────
function manualActivate() {
  if (state === "thinking" || state === "speaking") return;
  if (muted) { toggleMute(); return; }
  if (!wakeWordDetected) {
    wakeWordDetected = true;
    commandBuffer = "";
    setState("listening");
    startMicAnalyser();
    resetSilenceTimer();
  }
}

// ─── Mute ────────────────────────────────────────────────────────────────────
function toggleMute() {
  muted = !muted;
  const btn = document.getElementById("muteBtn");
  if (muted) {
    btn.textContent = "🔇 Mudo";
    btn.classList.add("muted");
    stopMicAnalyser();
    wakeWordDetected = false;
    commandBuffer = "";
    setState("idle");
    try { recognition?.stop(); } catch (_) {}
  } else {
    btn.textContent = "🎤 Ativo";
    btn.classList.remove("muted");
    try { recognition?.start(); } catch (_) {}
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", setupRecognition);
