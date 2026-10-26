import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/600.css';
import './ui/tokens.css';
import './ui/app.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App, type PageModules, loadPageModules } from './app';
import { I18nProvider } from './i18n/i18n';

/**
 * Renders the app. Pages outside the main bundle (legal, yearly) load first, so a yearly page's HTML
 * prerendered at build time stays on screen until React replaces it with the same page. If that code cannot
 * load, a prerendered page is left as it is (readable, its links work); otherwise the failure is shown.
 */
async function start(root: HTMLElement): Promise<void> {
  let modules: PageModules | undefined;
  try {
    modules = await loadPageModules(window.location.pathname);
  } catch (error) {
    console.error('page code failed to load', error instanceof Error ? error.message : typeof error);
    if (root.hasChildNodes()) return;
  }
  createRoot(root).render(
    <StrictMode>
      <I18nProvider>
        <App pathname={window.location.pathname} modules={modules} />
      </I18nProvider>
    </StrictMode>,
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('#root missing from index.html');
void start(root);
