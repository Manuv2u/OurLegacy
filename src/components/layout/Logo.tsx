import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** The OurLegacy tree emblem. Decorative: the surrounding link carries the accessible name. */
export function LogoMark({ className }: { className?: string }) {
  return <img src="/logo-mark.png" alt="" width={176} height={176} draggable={false} className={cn('size-9 shrink-0 select-none object-contain', className)} />;
}

export function Logo({ to = '/', className, label = true }: { to?: string; className?: string; label?: boolean }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2 rounded-lg', className)} aria-label="OurLegacy">
      <LogoMark />
      {label && (
        <span className="serif text-xl font-semibold tracking-tight" aria-hidden>
          <span className="text-forest-800">Our</span>
          <span className="text-gold-800">Legacy</span>
        </span>
      )}
    </Link>
  );
}
