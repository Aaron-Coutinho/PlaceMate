"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export default function InteractiveLoadingScreen({
  days,
  topicsCount,
  subjectsCount,
}: {
  days: number;
  topicsCount: number;
  subjectsCount: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fact, setFact] = useState<string>("Initializing placement preparation system...");
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  // Fetch fact from Groq endpoint
  const fetchFact = async () => {
    try {
      const data = await api.get<{ fact: string }>("/plan/study-fact");
      if (data && data.fact) {
        setFact(data.fact);
      }
    } catch (e) {
      console.error("Failed to fetch study fact:", e);
    }
  };

  useEffect(() => {
    fetchFact();
    const interval = setInterval(fetchFact, 9000);
    return () => clearInterval(interval);
  }, []);

  // Particle simulation logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    const colors = ["#6366f1", "#a855f7", "#ec4899", "#3b82f6", "#14b8a6"];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const createParticle = (x: number, y: number): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.015 + 0.01,
      };
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;

      // Spawn a couple of particles on mouse move
      for (let i = 0; i < 2; i++) {
        particles.push(createParticle(e.clientX, e.clientY));
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const handleClick = (e: MouseEvent) => {
      // Explode a bunch of particles on click!
      for (let i = 0; i < 20; i++) {
        particles.push(createParticle(e.clientX, e.clientY));
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("click", handleClick);

    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render ambient cursor glow
      if (mouseRef.current.active) {
        const gradient = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          100
        );
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.15)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Update and draw particles
      particles = particles.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        // Apply a little friction
        p.vx *= 0.98;
        p.vy *= 0.98;

        if (p.alpha <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();

        return true;
      });

      // Spawn ambient particles slowly
      if (Math.random() < 0.05) {
        particles.push(
          createParticle(
            Math.random() * canvas.width,
            Math.random() * canvas.height
          )
        );
      }

      animationId = requestAnimationFrame(update);
    };
    update();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("click", handleClick);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center relative overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-pointer"
      />

      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none animate-pulse" />

      <div className="relative z-10 text-center max-w-lg mx-6 bg-gray-900/60 backdrop-blur-md border border-gray-800/60 p-8 rounded-3xl shadow-2xl">
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-2 border-4 border-purple-500/20 rounded-full" />
          <div className="absolute inset-2 border-4 border-purple-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">
          Generating Your Study Plan
        </h2>
        
        <p className="text-gray-400 text-sm mb-6">
          Our AI is crafting a personalized {days}-day plan
          <br />
          covering {topicsCount} topics across {subjectsCount} subjects...
        </p>

        {/* Fact Box */}
        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4 mb-6 transition-all duration-500 ease-in-out min-h-[90px] flex items-center justify-center">
          <p className="text-indigo-200 text-sm leading-relaxed italic">
            "{fact}"
          </p>
        </div>

        <p className="text-gray-500 text-xs mb-4">
          🖱️ Click or move your mouse around to play with particles!
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {["Analyzing topics...", "Building schedule...", "Creating notes..."].map(
            (step, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-gray-800/50 text-gray-400 text-xs rounded-full animate-pulse border border-gray-800"
                style={{ animationDelay: `${i * 0.5}s` }}
              >
                {step}
              </span>
            )
          )}
        </div>
      </div>
    </main>
  );
}
