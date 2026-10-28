import * as React from 'react';
import { Dialog, SheetContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Bottom-sheet wrapper: a Radix dialog styled as a sheet. */
export function Sheet({ open, onOpenChange, side = 'bottom', children, testId }: { open: boolean; onOpenChange: (o: boolean) => void; side?: 'bottom' | 'right'; children: React.ReactNode; testId?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <SheetContent side={side} data-testid={testId} aria-describedby={undefined}>
          {children}
        </SheetContent>
      )}
    </Dialog>
  );
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto pb-4', className)} {...props} />;
}
