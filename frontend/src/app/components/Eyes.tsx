"use client";

import { useEffect, useState } from "react";
import type { OrbState } from "./Orb";
import "./Eyes.css";

interface EyesProps {
  state: OrbState;
}

export default function Eyes({ state }: EyesProps) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    async function loop() {
      while (!cancelled) {
        await delay(2800 + Math.random() * 4000);
        if (cancelled) break;
        setBlink(true);
        await delay(300);
        setBlink(false);
        // piscada dupla ocasional
        if (Math.random() < 0.25) {
          await delay(160);
          if (cancelled) break;
          setBlink(true);
          await delay(300);
          setBlink(false);
        }
      }
    }

    loop();
    return () => { cancelled = true; };
  }, []);

  const cls = `eye ${state}${blink ? " blink" : ""}`;

  return (
    <div className="eyes">
      <div className={cls}><div className="shine" /></div>
      <div className={cls}><div className="shine" /></div>
    </div>
  );
}
