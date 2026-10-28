import * as React from 'react';
import * as T from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => (
  <T.Provider delayDuration={350} skipDelayDuration={200}>
    {children}
  </T.Provider>
);

/** Wrap a focusable element to show a short label on hover/focus. */
export function Tip({ label, children, side = 'bottom' }: { label: string; children: React.ReactElement; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className={cn('z-[80] max-w-64 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white shadow-pop')}
        >
          {label}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
