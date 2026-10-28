import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn('size-8', className)}>
      <rect width="64" height="64" rx="16" fill="#315C46" />
      <g stroke="#F8F8F5" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M32 20v12M32 32H18v10M32 32h14v10" />
      </g>
      <circle cx="32" cy="16" r="6" fill="#C8A96B" />
      <circle cx="18" cy="46" r="5" fill="#F8F8F5" />
      <circle cx="46" cy="46" r="5" fill="#F8F8F5" />
    </svg>
  );
}

export function Logo({ to = '/', className, label = true }: { to?: string; className?: string; label?: boolean }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 rounded-lg', className)} aria-label="OurLegacy">
      <LogoMark />
      {label && <span className="serif text-xl font-semibold tracking-tight text-forest-800">OurLegacy</span>}
    </Link>
  );
}
