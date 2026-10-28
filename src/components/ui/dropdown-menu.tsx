import * as React from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Menu.Content>>(({ className, sideOffset = 6, ...props }, ref) => (
  <Menu.Portal>
    <Menu.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn('z-[70] min-w-48 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-pop', className)}
      {...props}
    />
  </Menu.Portal>
));
DropdownMenuContent.displayName = 'DropdownMenuContent';

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof Menu.Item> & { danger?: boolean }>(({ className, danger, ...props }, ref) => (
  <Menu.Item
    ref={ref}
    className={cn(
      'flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-sage [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted',
      danger && 'text-danger data-[highlighted]:bg-danger-50 [&_svg]:text-danger',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuSeparator = () => <Menu.Separator className="my-1 h-px bg-line" />;
export const DropdownMenuLabel = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof Menu.Label>) => (
  <Menu.Label className={cn('px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted', className)} {...props} />
);
