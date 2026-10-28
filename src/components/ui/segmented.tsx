import { cn } from '@/lib/utils';

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}

/** Radio-group-semantics segmented control. */
export function Segmented<T extends string>({ value, onChange, options, label, className, size = 'md' }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-xl bg-sage/70 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              active ? 'bg-white text-forest-800 shadow-sm' : 'text-muted hover:text-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
