'use client';

import { useState, useCallback, type DragEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  onDrop: (file: File) => void;
  accept?: string;
  children?: ReactNode;
  className?: string;
}

export function DropZone({ onDrop, accept = '.json', children, className }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) onDrop(file);
    },
    [onDrop]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-[var(--radius-md)] border-2 border-dashed transition-all duration-200 p-6',
        dragging
          ? 'border-accent bg-accent-muted scale-[1.01]'
          : 'border-surface-border hover:border-surface-border-hover',
        className
      )}
    >
      {children ?? (
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload size={24} className={cn('transition-colors', dragging ? 'text-accent' : 'text-text-tertiary')} />
          <p className="text-sm text-text-secondary">
            {dragging ? 'Drop to import' : 'Drag a JSON file here to import'}
          </p>
          <p className="text-xs text-text-tertiary">or use the Import button above</p>
        </div>
      )}
    </div>
  );
}
