import React, { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ThemeContext = createContext();

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeContextProvider = ({ children }) => {
  const [mode, setMode] = useState('light');
  const toggleTheme = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  const theme = useMemo(() =>
    createTheme({
      palette: {
        mode,
        ...(mode === 'dark' && {
          background: {
            default: '#121212',   // Page background
            paper: '#2E2E2E',     // Card and surfaces
          },
          text: {
            primary: '#ffffff',
            secondary: '#cccccc',
          },
        }),
        ...(mode === 'light' && {
          background: {
            default: '#f5f5f5',
            paper: '#ffffff',
          },
        }),
      },
      typography: {
        fontFamily: 'Roboto, Arial, sans-serif',
      },
    }), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
