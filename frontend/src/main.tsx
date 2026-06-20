import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const theme = extendTheme({
  colors: {
    brand: {
      50: '#f0f4ff',
      100: '#d9e2ff',
      200: '#b8ccff',
      300: '#8aadff',
      400: '#5c85ff',
      500: '#3b63f0',
      600: '#2c4bd4',
      700: '#223ba8',
      800: '#1c2f87',
      900: '#1a2a6e',
    },
  },
  fonts: {
    heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
