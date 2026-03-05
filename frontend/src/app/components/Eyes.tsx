"use client";

import { useEffect, useState } from "react";
import type { OrbState } from "./Orb";
import "./Eyes.css";

interface EyesProps {
  state: OrbState;
}

export default function Eyes({ state }: EyesProps) {
  const [blink, setBlink]   = useState(false);
  const [look,  setLook]    = useState({ x: 0, y: 0 });
  const [squint, setSquint] = useState(false);

  // Piscada natural
  useEffect(() => {
    let cancelled = false;
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    async function loop() {
      while (!cancelled) {
        await delay(2500 + Math.random() * 4500);
        if (cancelled) break;
        setBlink(true);
        await delay(300);
        setBlink(false);
        if (Math.random() < 0.25) {
          await delay(150);
          if (cancelled) break;
          setBlink(true);
          await delay(280);
          setBlink(false);
        }
      }
    }
    loop();
    return () => { cancelled = true; };
  }, []);

  // Olhar para os lados / micro-expressões
  useEffect(() => {
    let cancelled = false;
    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    async function loop() {
      while (!cancelled) {
        await delay(4000 + Math.random() * 7000);
        if (cancelled) break;

        const rand = Math.random();
        if (rand < 0.5) {
          // Olha para um lado
          const x = (Math.random() - 0.5) * 18;
          const y = (Math.random() - 0.5) * 8;
          setLook({ x, y });
          await delay(800 + Math.random() * 1200);
          if (cancelled) break;
          setLook({ x: 0, y: 0 });
        } else if (rand < 0.75) {
          // Semicerra (squint) — pensativo
          setSquint(true);
          await delay(600 + Math.random() * 800);
          if (cancelled) break;
          setSquint(false);
        } else {
          // Olha rápido esq → dir (como lendo)
          setLook({ x: -10, y: 0 });
          await delay(300);
          if (cancelled) break;
          setLook({ x: 10, y: 0 });
          await delay(400);
          if (cancelled) break;
          setLook({ x: 0, y: 0 });
        }
      }
    }
    loop();
    return () => { cancelled = true; };
  }, []);

  const cls = `eye ${state}${blink ? " blink" : ""}${squint ? " squint" : ""}`;
  const eyeStyle = {
    transform: `translate(${look.x}px, ${look.y}px)`,
    transition: "transform 0.35s cubic-bezier(.22,1,.36,1)",
  };

  return (
    <div className="eyes">
      <div className={cls} style={eyeStyle}><div className="shine" /></div>
      <div className={cls} style={eyeStyle}><div className="shine" /></div>
    </div>
  );
}
