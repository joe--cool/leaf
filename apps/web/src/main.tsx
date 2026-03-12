import { ChakraProvider, ColorModeScript, extendTheme } from '@chakra-ui/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { App } from './App';
import { OAuthCallback } from './OAuthCallback';

const theme = extendTheme({
  config: {
    initialColorMode: 'system',
    useSystemColorMode: true,
  },
  colors: {
    leaf: {
      50: '#eef4ef',
      100: '#d3e2d5',
      200: '#b7d0bb',
      300: '#97bd9f',
      400: '#739f7e',
      500: '#4f7658',
      600: '#3d5f45',
      700: '#2c4732',
      800: '#1b2f20',
      900: '#0b170f',
    },
    clay: {
      50: '#fbefe9',
      100: '#f2d7c7',
      200: '#e5b69f',
      300: '#d59477',
      400: '#c47252',
      500: '#c05828',
      600: '#96431d',
      700: '#6d3115',
      800: '#441e0d',
      900: '#1f0b05',
    },
  },
  fonts: {
    heading: '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", serif',
    body: '"Avenir Next", "Segoe UI", sans-serif',
  },
  radii: {
    xl: '18px',
    '2xl': '24px',
    '3xl': '32px',
  },
  styles: {
    global: {
      ':root': {
        colorScheme: 'light dark',
      },
      body: {
        color: 'inherit',
        bg: 'transparent',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        borderRadius: 'xl',
      },
      baseStyle: {
        fontWeight: '600',
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'leaf.500',
      },
    },
    Select: {
      defaultProps: {
        focusBorderColor: 'leaf.500',
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
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
