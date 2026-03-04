"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { OrbState } from "./Orb";

const Orb = dynamic(() => import("./Orb"), { ssr: false });

const WAKE_WORDS   = ["max", "mais", "maps", "mac"];
const STOP_PHRASES = [
  "para de ouvir","pode parar","para ouvir","encerrar","encerra",
  "até logo","tchau","standby","pode descansar","pode dormir",
  "chega por hoje","obrigado max","valeu max","pode fechar",
  "encerrando","isso é tudo",
];

const SESSION_ID = "max_" + Math.random().toString(36).slice(2);

export default function VoiceController() {
  const [orbState,    setOrbState]    = useState<OrbState>("idle");
  const [statusText,  setStatusText]  = useState("Aguardando...");
  const [transcript,  setTranscript]  = useState("");
  const [fallback,    setFallback]    = useState("");
  const [muted,       setMuted]       = useState(false);

  const recogRef        = useRef<SpeechRecognition | null>(null);
  const wakeRef         = useRef(false);
  const bufferRef       = useRef("");
  const silenceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stayActiveRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const mutedRef        = useRef(false);

  mutedRef.current = muted;

  function getAudioCtx() {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } else if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }

  const applyState = useCallback((s: OrbState) => {
    setOrbState(s);
    const labels: Record<OrbState, string> = {
      idle: "Aguardando...", listening: "Ouvindo...",
      thinking: "Pensando...", speaking: "Falando...",
    };
    setStatusText(labels[s]);
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
          const src      = audioCtx.createBufferSource();
          src.buffer     = buf;
          src.connect(audioCtx.destination);
          src.start(0);
          src.onended = () => {
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
    if (STOP_PHRASES.some(p => message.toLowerCase().includes(p))) {
      goStandby(); return;
    }
    applyState("thinking");
    setTranscript(message);
    wakeRef.current   = false;
    bufferRef.current = "";
    try { recogRef.current?.stop(); } catch (_) {}

    try {
      const res = await fetch("/api/controller/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId: SESSION_ID }),
      });
      if (!res.ok) throw new Error("API error");
      const { text, audioBase64 } = await res.json();
      if (audioBase64) {
        await playAudio(audioBase64);
      } else {
        setFallback(text);
        setTimeout(() => setFallback(""), 14000);
        applyState("idle");
      }
    } catch (err) {
      console.error("[max]", err);
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
      if (wakeRef.current && bufferRef.current.trim().length > 2 && orbState === "listening") {
        sendToMAX(bufferRef.current.trim());
      }
    }, 1800);
  }, [orbState, sendToMAX]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setStatusText("Use o Google Chrome"); return; }

    const r: SpeechRecognition = new SR();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    recogRef.current = r;

    r.onresult = (event) => {
      if (mutedRef.current) return;
      const state = orbState;
      if (state === "thinking" || state === "speaking") return;

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

    r.onerror = (e) => { if (e.error !== "no-speech" && e.error !== "aborted") console.warn("[recog]", e.error); };
    r.onend   = () => { if (!mutedRef.current) try { r.start(); } catch (_) {} };
    try { r.start(); } catch (_) {}

    return () => { try { r.stop(); } catch (_) {} };
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

  return (
    <>
      <div className="logo">Monitor Ativo de Operações</div>

      <div
        className="orb-wrap"
        onClick={manualActivate}
        style={{ cursor: "pointer", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Orb state={orbState} size={260} />
      </div>

      <div className={`status status--${orbState}`}>{statusText}</div>
      <div className="transcript">{transcript}</div>

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
