'use client';

import { useEffect, useState } from 'react';

interface ConfettiProps {
  trigger: boolean;
  duration?: number;
}

export function Confetti({ trigger, duration = 2000 }: ConfettiProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; delay: number; rotation: number }[]>([]);

  useEffect(() => {
    if (!trigger) return;

    const colors = ['#C9A84C', '#4A9E6B', '#7C8B9E', '#E8D48B', '#C4923A'];
    const newParticles = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: 40 + Math.random() * 20,
      y: 30 + Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.3,
      rotation: Math.random() * 360,
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => setParticles([]), duration);
    return () => clearTimeout(timer);
  }, [trigger, duration]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.color,
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${0.8 + Math.random() * 0.6}s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
          100% { opacity: 0; transform: translateY(${200 + Math.random() * 100}px) rotate(${180 + Math.random() * 360}deg) scale(0.3); }
        }
      `}</style>
    </div>
  );
}
