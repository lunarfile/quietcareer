'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState<'enter' | 'idle'>('enter');

  useEffect(() => {
    setTransitionStage('enter');
    setDisplayChildren(children);
    const timer = setTimeout(() => setTransitionStage('idle'), 350);
    return () => clearTimeout(timer);
  }, [pathname, children]);

  return (
    <div
      style={{
        opacity: transitionStage === 'enter' ? 0 : 1,
        transform: transitionStage === 'enter' ? 'translateY(6px)' : 'translateY(0)',
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
      }}
    >
      {displayChildren}
    </div>
  );
}
