"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { OrbState } from "./Orb";
import Eyes from "./Eyes";

const Orb = dynamic(() => import("./Orb"), { ssr: false });

const WAKE_WORDS   = ["max", "mais", "maps", "mac", "mas", "mal", "mar", "mau", "mah", "maks"];
const STOP_PHRASES = [
  "pode parar","para de ouvir","encerrar","encerra",
  "até logo","tchau","standby","pode descansar","pode dormir",
  "chega por hoje","obrigado max","valeu max","pode fechar",
  "encerrando","isso é tudo",
];
// Palavras exatas que param o MAX (match de palavra inteira, não substring)
const STOP_WORDS_EXACT = ["ok", "okay"];

const SESSION_ID = "max_" + Math.random().toString(36).slice(2);

// Map voice state → Orb props
const ORB_PROPS: Record<OrbState, { hue: number; forceHoverState: boolean }> = {
  idle:      { hue: 0,   forceHoverState: false },
  listening: { hue: 0,   forceHoverState: true  },
  thinking:  { hue: 120, forceHoverState: true  },
  speaking:  { hue: 240, forceHoverState: true  },
};

export default function VoiceController() {
  const [orbState,    setOrbState]    = useState<OrbState>("idle");
  const [statusText,  setStatusText]  = useState("Aguardando...");
  const [transcript,  setTranscript]  = useState("");
  const [fallback,    setFallback]    = useState("");
  const [muted,       setMuted]       = useState(false);
  const [thinkingLogs, setThinkingLogs] = useState<{ id: number; msg: string }[]>([]);
  const [streamDone,   setStreamDone]   = useState(false);
  const [statusKey,    setStatusKey]    = useState(0);

  const recogRef        = useRef<any>(null);
  const wakeRef         = useRef(false);
  const bufferRef       = useRef("");
  const silenceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stayActiveRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusPollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const audioSrcRef        = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef        = useRef<AnalyserNode | null>(null);
  const audioLevelRef      = useRef(0);
  const audioRafRef        = useRef<number | null>(null);
  const suppressRestartRef = useRef(false);
  const mutedRef           = useRef(false);
  const orbStateRef        = useRef<OrbState>("idle");
  const logSinceRef        = useRef(0);
  const streamExitRef      = useRef<ReturnType<typeof setTimeout> | null>(null);

  mutedRef.current = muted;

  function getAudioCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } else if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  const STATUS_LABELS: Record<string, string> = {
    "contexto carregado":               "Carregando contexto...",
    "chamando Claude (1ª)...":          "Analisando pergunta...",
    "ativando agente de tráfego":       "Ativando agente...",
    "varrendo campanhas":               "Varrendo campanhas...",
    "entrando em nível de anúncio":     "Analisando anúncios...",
    "coletando métricas":               "Coletando métricas...",
    "levantando dados de investimento": "Levantando investimento...",
    "analisando conversões":            "Analisando leads...",
    "buscando dados de campanhas":      "Buscando campanhas...",
    "MAX identificando agentes":        "Identificando agentes...",
    "chamando webhook Meta Ads...":     "Consultando agente...",
    "webhook respondeu":                "Dados recebidos...",
    "chamando Claude (2ª, pós-tool)...":"Formulando resposta...",
    "gerando áudio TTS...":             "Preparando voz...",
  };

  const LOG_LABELS: [string, string][] = [
    ["contexto carregado",               "Contexto carregado"],
    ["chamando Claude (1ª)",             "Analisando pergunta"],
    ["chamando Claude (2ª",              "Formulando resposta"],
    ["ativando agente de tráfego",       "Ativando agente de tráfego"],
    ["varrendo campanhas",               "Varrendo campanhas ativas"],
    ["entrando em nível de anúncio",     "Analisando anúncios"],
    ["coletando métricas",               "Coletando métricas de performance"],
    ["levantando dados de investimento", "Levantando dados de investimento"],
    ["analisando conversões",            "Analisando conversões e leads"],
    ["buscando dados de campanhas",      "Buscando dados de campanhas"],
    ["MAX identificando agentes",        "MAX identificando agentes"],
    ["chamando webhook Meta Ads",        "Consultando agente de tráfego"],
    ["webhook respondeu",                "Dados do agente recebidos"],
    ["gerando áudio TTS",                "Preparando resposta em voz"],
  ];

  function formatLogMsg(msg: string): string {
    const clean = msg.replace(/\s*\|.*$/, "").trim();
    for (const [prefix, label] of LOG_LABELS) {
      if (clean.toLowerCase().startsWith(prefix.toLowerCase())) {
        // Preserva sufixo dinâmico (ex: "→ Empresa X")
        const rest = clean.slice(prefix.length).trim();
        return rest ? `${label} ${rest}` : label;
      }
    }
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  async function startStatusPoll() {
    if (statusPollRef.current) clearInterval(statusPollRef.current);
    setThinkingLogs([]);
    // Seed baseline: ignora logs anteriores à pergunta atual
    try {
      const r = await fetch("/api/controller/status");
      if (r.ok) { const e = await r.json(); logSinceRef.current = e?.id ?? 0; }
    } catch (_) { logSinceRef.current = 0; }

    statusPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/controller/logs?since=${logSinceRef.current}`);
        if (!res.ok) return;
        const entries: { id: number; msg: string; level: string }[] = await res.json();
        if (!entries.length) return;
        logSinceRef.current = entries[entries.length - 1].id;
        setThinkingLogs(prev =>
          [...prev, ...entries.map(e => ({ id: e.id, msg: e.msg }))].slice(-6)
        );
        const label = Object.entries(STATUS_LABELS).find(([k]) =>
          entries[entries.length - 1].msg.startsWith(k)
        )?.[1];
        if (label) setStatusText(label);
      } catch (_) {}
    }, 700);
  }

  function stopStatusPoll() {
    if (statusPollRef.current) { clearInterval(statusPollRef.current); statusPollRef.current = null; }
  }

  const applyState = useCallback((s: OrbState) => {
    orbStateRef.current = s;
    setOrbState(s);
    const labels: Record<OrbState, string> = {
      idle: "Aguardando...", listening: "Ouvindo...",
      thinking: "Pensando...", speaking: "Falando...",
    };
    setStatusText(labels[s]);
    setStatusKey(k => k + 1);
    if (s === "thinking") {
      if (streamExitRef.current) { clearTimeout(streamExitRef.current); streamExitRef.current = null; }
      setStreamDone(false);
      startStatusPoll();
    } else if (s === "speaking") {
      stopStatusPoll();
    } else {
      // idle ou listening — animação de saída suave
      stopStatusPoll();
      setStreamDone(true);
      streamExitRef.current = setTimeout(() => {
        setThinkingLogs([]);
        setStreamDone(false);
        streamExitRef.current = null;
      }, 1800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goStandby = useCallback(() => {
    clearTimeout(silenceRef.current!);
    clearTimeout(stayActiveRef.current!);
    wakeRef.current   = false;
    bufferRef.current = "";
    applyState("idle");
    setTranscript("Em standby. Fale MAX para continuar.");
    setTimeout(() => setTranscript(""), 3000);
  }, [applyState]);

  const playAudio = useCallback(async (base64: string) => {
    applyState("speaking");
    return new Promise<void>((resolve) => {
      try {
        const binary = atob(base64);
        const bytes  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const audioCtx = getAudioCtx();
        audioCtx.decodeAudioData(bytes.buffer.slice(0)).then((buf) => {
          const src = audioCtx.createBufferSource();
          src.buffer = buf;

          // Analyser para medir amplitude real (domínio do tempo, RMS)
          if (!analyserRef.current) {
            analyserRef.current = audioCtx.createAnalyser();
            analyserRef.current.fftSize = 1024;
            analyserRef.current.connect(audioCtx.destination);
          }
          src.connect(analyserRef.current);

          audioSrcRef.current = src;
          src.start(0);

          // RMS no domínio do tempo — amplitude real, sem viés de frequência
          const dataArray = new Uint8Array(analyserRef.current.fftSize);
          const readLevel = () => {
            analyserRef.current!.getByteTimeDomainData(dataArray);
            let sum = 0;
            for (const v of dataArray) { const n = (v - 128) / 128; sum += n * n; }
            audioLevelRef.current = Math.min(1, Math.sqrt(sum / dataArray.length) * 6);
            audioRafRef.current = requestAnimationFrame(readLevel);
          };
          audioRafRef.current = requestAnimationFrame(readLevel);

          src.onended = () => {
            // Para o loop de leitura e zera o nível
            if (audioRafRef.current) { cancelAnimationFrame(audioRafRef.current); audioRafRef.current = null; }
            audioLevelRef.current = 0;
            audioSrcRef.current = null;
            wakeRef.current   = true;
            bufferRef.current = "";
            applyState("listening");
            clearTimeout(stayActiveRef.current!);
            stayActiveRef.current = setTimeout(() => {
              wakeRef.current = false;
              applyState("idle");
            }, 12000);
            resolve();
          };
        });
      } catch (e) {
        console.error("[audio]", e);
        applyState("idle");
        resolve();
      }
    });
  }, [applyState]);

  const sendToMAX = useCallback(async (message: string) => {
    const lower = message.toLowerCase().trim();
    const isStop = STOP_PHRASES.some(p => lower.includes(p)) ||
      STOP_WORDS_EXACT.some(w => lower === w || lower.startsWith(w + " ") || lower.endsWith(" " + w));
    if (isStop) { goStandby(); return; }
    applyState("thinking");
    setTranscript(message);
    wakeRef.current   = false;
    bufferRef.current = "";
    try { recogRef.current?.stop(); } catch (_) {}

    try {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 90000);
      const res = await fetch("/api/controller/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId: SESSION_ID }),
        signal: abort.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error("API error");
      const { text, audioBase64 } = await res.json();
      if (audioBase64) {
        await playAudio(audioBase64);
      } else {
        setFallback(text);
        setTimeout(() => setFallback(""), 14000);
        applyState("idle");
      }
    } catch (err: any) {
      console.error("[max]", err);
      const msg = err?.name === "AbortError" ? "Timeout — sem resposta do servidor" : "Erro ao conectar com o MAX";
      setFallback(msg);
      setTimeout(() => setFallback(""), 8000);
      applyState("idle");
    } finally {
      setTranscript("");
      try { recogRef.current?.start(); } catch (_) {}
    }
  }, [applyState, goStandby, playAudio]);

  const resetSilence = useCallback(() => {
    clearTimeout(silenceRef.current!);
    clearTimeout(stayActiveRef.current!);
    silenceRef.current = setTimeout(() => {
      if (wakeRef.current && bufferRef.current.trim().length > 2 && orbStateRef.current === "listening") {
        sendToMAX(bufferRef.current.trim());
      }
    }, 900);
  }, [sendToMAX]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setStatusText("Use o Google Chrome"); return; }

    const r: any = new SR();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    recogRef.current = r;

    r.onresult = (event: any) => {
      if (mutedRef.current) return;
      if (orbStateRef.current === "thinking") return;

      if (orbStateRef.current === "speaking") {
        // Barge-in: só interrompe se ouvir a wake word "MAX"
        const interim2 = Array.from({ length: event.results.length - event.resultIndex }, (_, k) =>
          event.results[event.resultIndex + k][0].transcript
        ).join(" ").toLowerCase().trim();
        const isBargeIn = WAKE_WORDS.some(w => interim2.includes(w)) ||
          STOP_WORDS_EXACT.some(w => interim2 === w || interim2.startsWith(w + " ") || interim2.endsWith(" " + w));
        if (isBargeIn) {
          if (audioRafRef.current) { cancelAnimationFrame(audioRafRef.current); audioRafRef.current = null; }
          audioLevelRef.current = 0;
          const src = audioSrcRef.current;
          audioSrcRef.current = null;
          if (src) { src.onended = null; try { src.stop(); } catch (_) {} }
          wakeRef.current   = true;
          bufferRef.current = "";
          applyState("listening");
          clearTimeout(stayActiveRef.current!);
          stayActiveRef.current = setTimeout(() => { wakeRef.current = false; applyState("idle"); }, 12000);
        }
        return;
      }

      let interim = "", final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript.toLowerCase().trim();
        if (event.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      const all = (final + interim).trim();

      if (!wakeRef.current) {
        if (WAKE_WORDS.some(w => all.includes(w))) {
          wakeRef.current   = true;
          bufferRef.current = "";
          applyState("listening");
          let rest = all;
          WAKE_WORDS.forEach(w => { rest = rest.replace(new RegExp(`\\b${w}\\b`, "g"), "").trim(); });
          if (rest.length > 2) { bufferRef.current = rest; setTranscript(rest); }
          resetSilence();
        }
        return;
      }
      if (final.trim()) {
        bufferRef.current = final.trim();
        setTranscript(bufferRef.current);
        resetSilence();
      } else if (interim.trim()) {
        setTranscript(interim);
      }
    };

    r.onerror = (e: any) => { if (e.error !== "no-speech" && e.error !== "aborted") console.warn("[recog]", e.error); };
    r.onend   = () => { if (!mutedRef.current && !suppressRestartRef.current) try { r.start(); } catch (_) {} };
    try { r.start(); } catch (_) {}

    // Watchdog: reinicia o reconhecimento se morrer silenciosamente
    const watchdog = setInterval(() => {
      if (!mutedRef.current && orbStateRef.current !== "thinking" && orbStateRef.current !== "speaking") {
        try { r.start(); } catch (_) {}
      }
    }, 8000);

    return () => { clearInterval(watchdog); try { r.stop(); } catch (_) {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function manualActivate() {
    if (orbState === "thinking" || orbState === "speaking") return;
    getAudioCtx();
    if (muted) { setMuted(false); try { recogRef.current?.start(); } catch (_) {} return; }
    if (!wakeRef.current) {
      wakeRef.current = true;
      bufferRef.current = "";
      applyState("listening");
      resetSilence();
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    if (next) {
      wakeRef.current = false;
      bufferRef.current = "";
      applyState("idle");
      try { recogRef.current?.stop(); } catch (_) {}
    } else {
      try { recogRef.current?.start(); } catch (_) {}
    }
  }

  const orbProps = ORB_PROPS[orbState];

  return (
    <>
      <div className="logo">Monitor Ativo de Operações</div>

      <div
        className="orb-wrap"
        onClick={manualActivate}
        style={{ cursor: "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}
      >
        <Orb
          hue={orbProps.hue}
          forceHoverState={orbProps.forceHoverState}
          hoverIntensity={0.3}
          rotateOnHover={true}
          backgroundColor="#0c0c0c"
          audioLevelRef={audioLevelRef}
        />
        <Eyes state={orbState} />
      </div>

      {(orbState === "idle" || (orbState === "listening" && !transcript.trim())) && (
        <div key={statusKey} className={`status status--${orbState}`}>{statusText}</div>
      )}

      {(orbState === "listening" && !!transcript.trim()) || orbState === "thinking" || orbState === "speaking" || streamDone
        ? (
          <div className={`ts${streamDone ? " ts--exiting" : ""}`}>
            <div className="ts__bar" style={orbState !== "thinking" ? { animationPlayState: "paused", opacity: 0.15 } : undefined} />
            <div className="ts__entries">
              {transcript.trim() && (
                <div className="ts__entry ts__entry--user">
                  <span className="ts__mic">◎</span>
                  <span>{transcript}</span>
                </div>
              )}
              {thinkingLogs.map((entry, i) => {
                const isActive = orbState === "thinking" && i === thinkingLogs.length - 1;
                return (
                  <div key={entry.id} className={`ts__entry${isActive ? " ts__entry--active" : ""}`}>
                    {isActive
                      ? <span className="ts__spinner" />
                      : <span className="ts__check">›</span>
                    }
                    <span>{formatLogMsg(entry.msg)}</span>
                  </div>
                );
              })}
              {streamDone && (
                <div className="ts__entry ts__entry--done">
                  <span className="ts__check ts__check--done">✓</span>
                  <span>Análise concluída</span>
                </div>
              )}
            </div>
          </div>
        ) : null
      }

      {fallback && <div className="fallback">{fallback}</div>}

      <div className="hint">Diga &ldquo;<strong>MAX</strong>&rdquo; para ativar &nbsp;·&nbsp; ou clique no orbe</div>

      <button
        className={`mute-btn${muted ? " muted" : ""}`}
        onClick={toggleMute}
      >
        {muted ? "🔇 Mudo" : "🎤 Ativo"}
      </button>
    </>
  );
}
