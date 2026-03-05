"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { OrbState } from "./Orb";
import Eyes from "./Eyes";

const Orb    = dynamic(() => import("./Orb"),    { ssr: false });
const Galaxy = dynamic(() => import("./Galaxy"), { ssr: false });

const WAKE_WORDS   = ["max", "mais", "maps", "mac"];
const STOP_PHRASES = [
  "para de ouvir","pode parar","para ouvir","encerrar","encerra",
  "até logo","tchau","standby","pode descansar","pode dormir",
  "chega por hoje","obrigado max","valeu max","pode fechar",
  "encerrando","isso é tudo",
];

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

  const recogRef        = useRef<any>(null);
  const wakeRef         = useRef(false);
  const bufferRef       = useRef("");
  const silenceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stayActiveRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const audioSrcRef        = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef        = useRef<AnalyserNode | null>(null);
  const audioLevelRef      = useRef(0);
  const audioRafRef        = useRef<number | null>(null);
  const suppressRestartRef = useRef(false);
  const mutedRef           = useRef(false);
  const orbStateRef        = useRef<OrbState>("idle");

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
    orbStateRef.current = s;
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
          suppressRestartRef.current = true;
          try { recogRef.current?.stop(); } catch (_) {}
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
            suppressRestartRef.current = false;
            try { recogRef.current?.start(); } catch (_) {}
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

      if (orbStateRef.current === "speaking") return;

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

  const orbProps = ORB_PROPS[orbState];

  return (
    <>
      <Galaxy />

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
      </div>

      <Eyes state={orbState} />

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
