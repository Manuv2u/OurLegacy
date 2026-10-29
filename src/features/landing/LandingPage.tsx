import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookHeart, Download, GitFork, Languages, Lock, MonitorSmartphone, ShieldCheck, UserRoundX, HardDrive, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ScaledContent } from '@/components/layout/ScaledTree';
import { StaticTree } from '@/features/family-tree/StaticTree';
import { createSampleTree } from '@/features/family-tree/sampleTree';
import { DEFAULT_CARD, layoutTree } from '@/features/family-tree/layout';
import { subTree } from '@/features/relationships/graph';
import { useI18n } from '@/i18n/useI18n';
import { useIsTablet } from '@/hooks/useMediaQuery';
import type { MessageKey } from '@/i18n';

const LARGE = ['Venkatesh', 'Lakshmi', 'Suresh', 'Eleanor', 'Arjun', 'Priya', 'Maya', 'Tom'];
const SMALL = ['Venkatesh', 'Lakshmi', 'Suresh', 'Eleanor', 'Arjun', 'Maya'];

function HeroPreview() {
  const { t } = useI18n();
  const wide = useIsTablet();
  const { tree, layout } = useMemo(() => {
    const full = createSampleTree();
    const names = new Set(wide ? LARGE : SMALL);
    const ids = new Set(full.people.filter((p) => names.has(p.firstName)).map((p) => p.id));
    const sub = subTree(full, ids);
    return { tree: sub, layout: layoutTree(sub, { direction: 'vertical', cardWidth: DEFAULT_CARD.width, cardHeight: DEFAULT_CARD.height }) };
  }, [wide]);
  const pad = 28;
  const w = Math.ceil(layout.bounds.width + pad * 2);
  const h = Math.ceil(layout.bounds.height + pad * 2);
  return (
    <figure className="mx-auto w-full max-w-5xl" aria-label={t('a11y.treePreview')}>
      <div className="card overflow-hidden bg-[radial-gradient(circle,#dfe5dc_1.5px,transparent_1.5px)] [background-size:26px_26px] p-3 sm:p-6" data-testid="hero-preview">
        <ScaledContent width={w} height={h} className="mx-auto" >
          <StaticTree tree={tree} layout={layout} padding={pad} />
        </ScaledContent>
      </div>
      <figcaption className="mt-3 text-center text-xs text-muted">{t('landing.preview.caption')}</figcaption>
    </figure>
  );
}

const FEATURES: { icon: typeof GitFork; title: MessageKey; body: MessageKey }[] = [
  { icon: GitFork, title: 'landing.feature.canvas.title', body: 'landing.feature.canvas.body' },
  { icon: BookHeart, title: 'landing.feature.stories.title', body: 'landing.feature.stories.body' },
  { icon: Lock, title: 'landing.feature.local.title', body: 'landing.feature.local.body' },
  { icon: FileDown, title: 'landing.feature.export.title', body: 'landing.feature.export.body' },
  { icon: Languages, title: 'landing.feature.languages.title', body: 'landing.feature.languages.body' },
  { icon: MonitorSmartphone, title: 'landing.feature.devices.title', body: 'landing.feature.devices.body' },
];

const STEPS: { title: MessageKey; body: MessageKey }[] = [
  { title: 'landing.how.step1.title', body: 'landing.how.step1.body' },
  { title: 'landing.how.step2.title', body: 'landing.how.step2.body' },
  { title: 'landing.how.step3.title', body: 'landing.how.step3.body' },
];

export default function LandingPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh bg-ivory">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-pop">
        {t('app.skipToContent')}
      </a>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav aria-label={t('nav.mainNav')} className="ms-6 hidden items-center gap-1 md:flex">
            {([['#features', 'nav.features'], ['#how', 'nav.howItWorks'], ['#privacy', 'nav.privacy']] as const).map(([href, key]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-sage hover:text-ink">
                {t(key)}
              </a>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild className="hidden sm:inline-flex" data-testid="nav-create">
              <Link to="/app?create=1">{t('nav.createTree')}</Link>
            </Button>
            <Button asChild size="sm" className="sm:hidden">
              <Link to="/app?create=1">{t('nav.openApp')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[28rem] bg-[radial-gradient(60%_60%_at_50%_0%,#e7efe8_0%,transparent_70%)]" />
          <div className="relative mx-auto max-w-3xl text-center">
            <img src="/logo-emblem.png" alt="" width={512} height={512} fetchPriority="high" data-testid="hero-emblem" className="ol-rise mx-auto mb-3 size-28 object-contain sm:size-36" />
            <h1 className="serif ol-rise text-balance text-4xl font-semibold leading-[1.15] text-forest-800 sm:text-6xl" style={{ animationDelay: '60ms' }}>
              {t('landing.hero.title')}
            </h1>
            <p className="ol-rise mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted sm:text-lg" style={{ animationDelay: '120ms' }}>
              {t('landing.hero.copy')}
            </p>
            <div className="ol-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: '180ms' }}>
              <Button asChild size="lg" data-testid="hero-create">
                <Link to="/app?create=1">
                  {t('landing.cta.create')} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" data-testid="hero-sample">
                <Link to="/sample">{t('landing.cta.sample')}</Link>
              </Button>
            </div>
            <ul className="ol-rise mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-forest-800" style={{ animationDelay: '240ms' }}>
              {[
                [UserRoundX, 'landing.benefit.noAccount'],
                [HardDrive, 'landing.benefit.browser'],
                [Download, 'landing.benefit.export'],
              ].map(([Icon, key]) => {
                const I = Icon as typeof Download;
                return (
                  <li key={key as string} className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-sage">
                      <I className="size-3.5" aria-hidden />
                    </span>
                    {t(key as MessageKey)}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="relative mt-14">
            <HeroPreview />
          </div>
        </section>

        <section id="features" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="serif text-3xl font-semibold text-forest-800 sm:text-4xl">{t('landing.features.title')}</h2>
              <p className="mt-3 text-muted">{t('landing.features.subtitle')}</p>
            </div>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="card p-6 transition-shadow hover:shadow-pop">
                  <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-sage text-forest">
                    <f.icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="serif text-lg font-semibold">{t(f.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(f.body)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how" className="scroll-mt-20 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="serif text-center text-3xl font-semibold text-forest-800 sm:text-4xl">{t('landing.how.title')}</h2>
            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative">
                  <span className="serif mb-3 flex size-10 items-center justify-center rounded-full bg-forest text-lg font-semibold text-white">{i + 1}</span>
                  <h3 className="serif text-lg font-semibold">{t(s.title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(s.body)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="privacy" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto grid max-w-5xl items-center gap-8 rounded-3xl bg-sage p-8 sm:p-12 md:grid-cols-[auto_1fr]">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-white text-forest shadow-card">
              <ShieldCheck className="size-8" aria-hidden />
            </span>
            <div>
              <h2 className="serif text-2xl font-semibold text-forest-800 sm:text-3xl">{t('landing.privacy.title')}</h2>
              <p className="mt-3 max-w-3xl leading-relaxed text-ink/80">{t('landing.privacy.body')}</p>
              <p className="mt-4 inline-block rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-forest-800" data-testid="landing-privacy-notice">
                {t('notice.privacy')}
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-3xl bg-forest px-6 py-14 text-center text-white sm:px-12">
            <h2 className="serif text-3xl font-semibold sm:text-4xl">{t('landing.final.title')}</h2>
            <p className="mt-3 text-white/80">{t('landing.final.body')}</p>
            <Button asChild size="lg" className="mt-7 bg-white text-forest-800 hover:bg-sage" data-testid="final-create">
              <Link to="/app?create=1">
                {t('landing.cta.create')} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo />
          <p className="text-center text-sm text-muted">{t('landing.footer.note')}</p>
          <p className="text-sm text-muted">{t('app.tagline')}</p>
        </div>
      </footer>
    </div>
  );
}
