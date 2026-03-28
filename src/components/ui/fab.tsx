'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';

const HIDDEN_ON = ['/', '/onboarding', '/journal', '/settings'];

export function FloatingActionButton() {
  const pathname = usePathname();

  if (HIDDEN_ON.some((route) => pathname === route || pathname.startsWith('/journal'))) {
    return null;
  }

  return (
    <Link
      href="/journal"
      className="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-accent text-text-inverse shadow-lg shadow-accent/30 flex items-center justify-center active:scale-90 transition-transform"
      aria-label="New field note"
    >
      <Plus size={24} strokeWidth={2.5} />
    </Link>
  );
}
