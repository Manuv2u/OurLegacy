import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const control =
  'w-full rounded-xl border border-line bg-white px-3 text-sm text-ink placeholder:text-muted transition-colors focus-visible:border-forest focus-visible:outline-2 focus-visible:outline-forest/30 focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(control, 'h-10', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(control, 'min-h-24 py-2 leading-relaxed', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn(control, 'h-10 appearance-none pe-9', className)} {...props}>
      {children}
    </select>
    <ChevronDown aria-hidden className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
  </div>
));
Select.displayName = 'Select';

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-ink', className)} {...props} />;
}

interface FieldProps {
  label: React.ReactNode;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: string;
  className?: string;
  children: React.ReactNode;
}

/** Label + control + hint/error, wired up with aria-describedby by the caller via ids `${htmlFor}-hint` / `${htmlFor}-error`. */
export function Field({ label, htmlFor, error, hint, optional, className, children }: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ms-1.5 text-xs font-normal text-muted">({optional})</span>}
      </Label>
      {children}
      {hint && !error && (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
