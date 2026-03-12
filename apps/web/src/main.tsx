import { ChakraProvider, ColorModeScript, extendTheme } from '@chakra-ui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { OAuthCallback } from './OAuthCallback';

const theme = extendTheme({
  fonts: {
    heading: '"Avenir Next", "Segoe UI", sans-serif',
    body: '"Avenir Next", "Segoe UI", sans-serif',
  },
  radii: {
    xl: '18px',
    '2xl': '24px',
  },
  styles: {
    global: {
      body: {
        bgGradient: 'linear(to-b, #f3faf8, #f8fbff 45%, #eef4fb)',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        borderRadius: 'xl',
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorModeScript />
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/*" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
);
