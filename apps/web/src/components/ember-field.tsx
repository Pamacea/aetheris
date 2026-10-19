"use client";

import { useEffect, useRef } from "react";

type Ember = {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  life: number;
  maxLife: number;
  hue: number;
};

/**
 * Champ de braises en fond de page — canvas plein écran, particules
 * orange/rouge qui s'élèvent en fondant. Désactivé si l'utilisateur
 * préfère les animations réduites.
 */
export function EmberField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let last = performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const embers: Ember[] = [];

    const spawn = (seeded: boolean): Ember => {
      const maxLife = 5_000 + Math.random() * 7_000;
      return {
        x: Math.random() * width,
        y: seeded ? Math.random() * height : height + 12,
        size: 0.5 + Math.random() * 1.7,
        speed: 10 + Math.random() * 26,
        drift: (Math.random() - 0.5) * 14,
        phase: Math.random() * Math.PI * 2,
        life: seeded ? Math.random() * maxLife : 0,
        maxLife,
        hue: 8 + Math.random() * 28, // orange sombre → rouge ardent
      };
    };

    const targetCount = () => Math.round(Math.min(110, Math.max(35, (width * height) / 16_000)));

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = targetCount();
      while (embers.length < target) embers.push(spawn(true));
      if (embers.length > target) embers.length = target;
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        e.life += dt * 1000;
        if (e.life >= e.maxLife || e.y < -24) {
          embers[i] = spawn(false);
          continue;
        }
        e.y -= e.speed * dt;
        e.x += e.drift * dt + Math.sin(e.phase + e.life / 850) * 9 * dt;

        const t = e.life / e.maxLife;
        const alpha = Math.sin(Math.PI * t) * 0.9;
        if (alpha <= 0.01) continue;

        // halo
        ctx.globalAlpha = alpha * 0.16;
        ctx.fillStyle = `hsl(${e.hue} 92% 52%)`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 3.6, 0, Math.PI * 2);
        ctx.fill();

        // cœur incandescent
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${e.hue + 8} 95% ${58 + e.size * 7}%)`;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className ?? "pointer-events-none fixed inset-0"}
    />
  );
}
