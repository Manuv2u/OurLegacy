import { Component, Suspense, lazy, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useDocumentLanguage, useI18n } from '@/i18n/useI18n';
import LandingPage from '@/features/landing/LandingPage';
import DashboardPage from '@/features/dashboard/DashboardPage';

// The editor pulls in React Flow and the export libraries; load it on demand.
const EditorPage = lazy(() => import('@/features/family-tree/EditorPage'));

function Loading() {
  const { t } = useI18n();
  return (
    <div className="flex h-dvh items-center justify-center text-muted" role="status">
      {t('app.loading')}
    </div>
  );
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="serif text-3xl font-semibold">{t('app.notFound.title')}</h1>
      <p className="max-w-md text-muted">{t('app.notFound.body')}</p>
      <Button asChild>
        <Link to="/app">{t('app.notFound.cta')}</Link>
      </Button>
    </div>
  );
}

function ErrorFallback() {
  const { t } = useI18n();
  return (
    <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="serif text-3xl font-semibold">{t('app.error.title')}</h1>
      <p className="max-w-md text-muted">{t('app.error.body')}</p>
      <Button onClick={() => window.location.reload()}>{t('app.error.reload')}</Button>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('Unhandled UI error', error);
  }
  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}

export default function App() {
  useDocumentLanguage();
  // Ask the browser to treat our storage as persistent so it isn't evicted under pressure (best effort).
  useEffect(() => {
    void navigator.storage?.persist?.().catch(() => undefined);
  }, []);
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/app/tree/:id" element={<EditorRoute />} />
              <Route path="/sample" element={<EditorPage sample />} />
              <Route path="/dashboard" element={<Navigate to="/app" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="bottom-center" mobileOffset={{ bottom: 92 }} toastOptions={{ classNames: { toast: '!rounded-xl !border !border-line !font-sans' } }} />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

/** Keyed by tree id so navigating between trees always remounts the editor with clean state. */
function EditorRoute() {
  const { id } = useParams();
  return <EditorPage key={id} />;
}
