import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource/noto-sans-kannada/kannada-400.css';
import '@fontsource/noto-sans-kannada/kannada-500.css';
import '@fontsource/noto-sans-kannada/kannada-600.css';
import '@fontsource/noto-sans-kannada/kannada-700.css';
import '@fontsource/noto-serif-kannada/kannada-600.css';
import './index.css';
import App from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
