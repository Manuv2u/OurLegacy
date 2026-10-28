import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as AlertPrimitive from '@radix-ui/react-alert-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { useI18n } from '@/i18n/useI18n';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const Overlay = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn('ol-overlay fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]', className)} {...props} />
));
Overlay.displayName = 'DialogOverlay';

interface ContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Hide the built-in close button (when the dialog renders its own). */
  hideClose?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

/** Centered modal. Becomes a bottom sheet on small screens. */
export const DialogContent = React.forwardRef<HTMLDivElement, ContentProps>(({ className, children, hideClose, size = 'md', ...props }, ref) => {
  const { t } = useI18n();
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'ol-modal fixed z-50 flex max-h-[92dvh] flex-col border border-line bg-white shadow-pop focus:outline-none',
          // mobile: bottom sheet
          'ol-sheet-bottom inset-x-0 bottom-0 w-full rounded-t-3xl',
          // >= sm: centered
          'sm:inset-auto sm:start-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:[animation-name:ol-pop-in] rtl:sm:translate-x-1/2',
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            aria-label={t('app.close')}
            className="absolute end-3 top-3 inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-sage hover:text-ink"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
DialogContent.displayName = 'DialogContent';

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1.5 px-6 pt-6 pe-14', className)} {...props} />;
}
export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 py-4', className)} {...props} />;
}
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end', className)} {...props} />;
}
export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('serif text-xl font-semibold text-ink', className)} {...props} />
));
DialogTitle.displayName = 'DialogTitle';
export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';

/** Side/bottom sheet used for the profile drawer and mobile action menu. */
export const SheetContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'bottom' | 'right'; hideClose?: boolean }
>(({ className, children, side = 'bottom', hideClose, ...props }, ref) => {
  const { t } = useI18n();
  return (
    <DialogPrimitive.Portal>
      <Overlay className="bg-ink/30" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 flex flex-col bg-white shadow-pop focus:outline-none',
          side === 'bottom' && 'ol-sheet-bottom inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl border-t border-line',
          side === 'right' && 'ol-sheet-right inset-y-0 end-0 w-[min(92vw,26rem)] border-s border-line',
          className,
        )}
        {...props}
      >
        {side === 'bottom' && <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line" />}
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            aria-label={t('app.close')}
            className="absolute end-3 top-3 inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-sage hover:text-ink"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
SheetContent.displayName = 'SheetContent';

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
}

/** Accessible confirmation (Radix AlertDialog: focus trap, Escape to cancel). */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, destructive = true, confirmDisabled, children }: ConfirmProps) {
  const { t } = useI18n();
  return (
    <AlertPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertPrimitive.Portal>
        <AlertPrimitive.Overlay className="ol-overlay fixed inset-0 z-[60] bg-ink/40 backdrop-blur-[2px]" />
        <AlertPrimitive.Content className="ol-modal fixed start-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-white p-6 shadow-pop focus:outline-none rtl:translate-x-1/2">
          <AlertPrimitive.Title className="serif text-lg font-semibold">{title}</AlertPrimitive.Title>
          <AlertPrimitive.Description asChild>
            <div className="mt-2 text-sm leading-relaxed text-muted">{description}</div>
          </AlertPrimitive.Description>
          {children}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertPrimitive.Cancel asChild>
              <Button variant="outline">{t('app.cancel')}</Button>
            </AlertPrimitive.Cancel>
            <AlertPrimitive.Action asChild>
              <Button variant={destructive ? 'danger' : 'primary'} disabled={confirmDisabled} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertPrimitive.Action>
          </div>
        </AlertPrimitive.Content>
      </AlertPrimitive.Portal>
    </AlertPrimitive.Root>
  );
}
