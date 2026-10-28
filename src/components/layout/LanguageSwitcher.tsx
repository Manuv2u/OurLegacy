import { Check, Languages } from 'lucide-react';
import { LOCALES } from '@/i18n';
import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const current = LOCALES.find((l) => l.code === locale)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? 'icon' : 'md'} aria-label={`${t('a11y.langSwitch')}: ${current.native}`} data-testid="language-switcher">
          <Languages />
          {!compact && <span>{current.native}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l.code} onSelect={() => setLocale(l.code)} data-testid={`lang-${l.code}`} lang={l.code}>
            <span className="flex-1">{l.native}</span>
            {l.code === locale && <Check aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
