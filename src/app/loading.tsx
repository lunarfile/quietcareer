import { Shield } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Shield size={28} className="text-accent animate-pulse-gentle" />
    </div>
  );
}
