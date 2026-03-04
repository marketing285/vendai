"use client";

import { useEffect, useRef, useState } from "react";
import type { OrbState } from "./Orb";

interface EyesProps {
  state: OrbState;
  orbRef: React.RefObject<HTMLDivElement | null>;
}

// Quanto a pálpebra superior fecha (0 = totalmente fechado, 1 = totalmente aberto)
const LID_OPENNESS: Record<OrbState, number> = {
  idle:      0.50,
  listening: 0.95,
  thinking:  0.65,
  speaking:  0.80,
};

const EYE_R  = 14;  // raio do olho (círculo branco)
const PUP_R  = 6;   // raio da pupila
const MAX_PUP = 5;  // deslocamento máximo da pupila em px

export default function Eyes({ state, orbRef }: EyesProps) {
  const [pup, setPup]     = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const blinkTimer        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rastreia o mouse para mover a pupila
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = orbRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top  + r.height / 2;
      const dx = (e.clientX - cx) / (r.width  / 2);
      const dy = (e.clientY - cy) / (r.height / 2);
      setPup({
        x: Math.max(-MAX_PUP, Math.min(MAX_PUP, dx * MAX_PUP)),
        y: Math.max(-MAX_PUP, Math.min(MAX_PUP, dy * MAX_PUP)),
      });
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [orbRef]);

  // Piscada aleatória
  useEffect(() => {
    function schedule() {
      blinkTimer.current = setTimeout(() => {
        setBlink(true);
        setTimeout(() => { setBlink(false); schedule(); }, 120);
      }, 2500 + Math.random() * 3500);
    }
    schedule();
    return () => { if (blinkTimer.current) clearTimeout(blinkTimer.current); };
  }, []);

  // Pensando: pupila olha para cima e à direita
  const extra = state === "thinking" ? { x: 3, y: -4 } : { x: 0, y: 0 };
  const px = pup.x + extra.x;
  const py = pup.y + extra.y;

  // Abertura da pálpebra: 0 = fechado, EYE_R*2 = totalmente aberto
  const openness = blink ? 0 : LID_OPENNESS[state];
  // Clip da pálpebra superior: de cima para baixo, cobre (1-openness) do olho
  const lidClip = (1 - openness) * EYE_R * 2; // px que a pálpebra ocupa de cima

  function renderEye(key: string, cx: number, cy: number) {
    return (
      <g key={key}>
        {/* Esclera */}
        <circle cx={cx} cy={cy} r={EYE_R} fill="rgba(255,255,255,0.92)" />

        {/* Íris + pupila */}
        <circle
          cx={cx + px}
          cy={cy + py}
          r={PUP_R}
          fill="#0d0b2e"
          style={{ transition: "cx 0.08s, cy 0.08s" }}
        />

        {/* Pálpebra superior (retângulo que cobre o topo do olho) */}
        <rect
          x={cx - EYE_R}
          y={cy - EYE_R}
          width={EYE_R * 2}
          height={lidClip}
          fill="#080810"
          style={{
            transition: blink ? "height 0.07s ease-in" : "height 0.18s ease-out",
          }}
        />

        {/* Pálpebra inferior (linha fina fixa) */}
        <rect
          x={cx - EYE_R}
          y={cy + EYE_R - 3}
          width={EYE_R * 2}
          height={3}
          fill="#080810"
        />

        {/* Máscara circular para não vazar fora do olho */}
        <circle
          cx={cx}
          cy={cy}
          r={EYE_R}
          fill="none"
          stroke="#080810"
          strokeWidth={2}
          style={{ pointerEvents: "none" }}
        />
      </g>
    );
  }

  // Posições dos olhos dentro do SVG 260x260 (orb size)
  const W = 260;
  const H = 260;
  const eyeY  = H * 0.44;
  const eyeGap = 36;
  const leftX  = W / 2 - eyeGap;
  const rightX = W / 2 + eyeGap;

  return (
    <svg
      width={W}
      height={H}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
      }}
    >
      {renderEye("L", leftX, eyeY)}
      {renderEye("R", rightX, eyeY)}
    </svg>
  );
}
