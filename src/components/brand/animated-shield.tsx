'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedShieldProps {
  size?: number;
  className?: string;
}

export function AnimatedShield({ size = 80, className }: AnimatedShieldProps) {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDrawn(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn('transition-opacity duration-500', className)}
    >
      {/* Shield body */}
      <path
        d="M32 4L8 16v16c0 14 10.7 24 24 28 13.3-4 24-14 24-28V16L32 4z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
        style={{
          strokeDasharray: 160,
          strokeDashoffset: drawn ? 0 : 160,
          transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />
      {/* Lock icon inside */}
      <rect
        x="24"
        y="28"
        width="16"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        className="text-accent"
        style={{
          strokeDasharray: 56,
          strokeDashoffset: drawn ? 0 : 56,
          transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
        }}
      />
      <path
        d="M28 28v-4a4 4 0 018 0v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="text-accent"
        style={{
          strokeDasharray: 24,
          strokeDashoffset: drawn ? 0 : 24,
          transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1s',
        }}
      />
      {/* Keyhole dot */}
      <circle
        cx="32"
        cy="34"
        r="1.5"
        className="text-accent"
        fill="currentColor"
        style={{
          opacity: drawn ? 1 : 0,
          transition: 'opacity 0.3s ease 1.3s',
        }}
      />
      {/* Subtle glow */}
      <path
        d="M32 4L8 16v16c0 14 10.7 24 24 28 13.3-4 24-14 24-28V16L32 4z"
        fill="currentColor"
        className="text-accent"
        style={{
          opacity: drawn ? 0.05 : 0,
          transition: 'opacity 0.8s ease 1s',
        }}
      />
    </svg>
  );
}
