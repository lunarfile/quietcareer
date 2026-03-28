'use client';

import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <Shield size={48} className="text-text-tertiary mb-6" strokeWidth={1} />
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Nothing here.
      </h2>
      <p className="text-sm text-text-secondary mb-8 max-w-sm">
        This page doesn&apos;t exist. Maybe it used to, maybe it never did. Either way, your data is safe.
      </p>
      <Link href="/dashboard">
        <Button>Back to My Week</Button>
      </Link>
    </div>
  );
}
