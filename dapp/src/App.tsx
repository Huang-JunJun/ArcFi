import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { ArcFiThemeContext, type ArcFiThemeMode } from '@/common/themeMode';
import { wagmiConfig } from '@/wagmi';
import AppRouter from './router';

const THEME_STORAGE_KEY = 'arcfi-theme-mode';
const queryClient = new QueryClient();

const applyThemeMode = (mode: ArcFiThemeMode) => {
  document.documentElement.dataset.theme = mode;
  document.body.dataset.theme = mode;
};

const getInitialThemeMode = (): ArcFiThemeMode => {
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  const initialMode = saved === 'light' || saved === 'dark' ? saved : 'dark';
  applyThemeMode(initialMode);
  return initialMode;
};

const App = () => {
  const [mode, setMode] = useState<ArcFiThemeMode>(getInitialThemeMode);
  const isDark = mode === 'dark';

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    applyThemeMode(mode);
  }, [mode]);

  const themeContextValue = useMemo(
    () => ({
      mode,
      isDark,
      toggleMode: () => setMode((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [isDark, mode],
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#4c8dff',
          colorInfo: '#4c8dff',
          colorSuccess: '#27c281',
          colorWarning: '#f5b740',
          colorError: '#ff6b6b',
          colorBgBase: isDark ? '#070b14' : '#f3f6fb',
          colorBgContainer: isDark ? '#101725' : '#ffffff',
          colorBgElevated: isDark ? '#121b2b' : '#ffffff',
          colorBorder: isDark ? 'rgba(132, 153, 191, 0.22)' : 'rgba(33, 53, 84, 0.14)',
          colorBorderSecondary: isDark
            ? 'rgba(132, 153, 191, 0.14)'
            : 'rgba(33, 53, 84, 0.1)',
          colorText: isDark ? '#f5f7ff' : '#162033',
          colorTextSecondary: isDark ? 'rgba(226, 234, 255, 0.68)' : 'rgba(22, 32, 51, 0.64)',
          borderRadius: 16,
          borderRadiusLG: 20,
          boxShadowSecondary: isDark
            ? '0 18px 50px rgba(0, 0, 0, 0.28)'
            : '0 18px 50px rgba(30, 54, 92, 0.12)',
        },
      }}
    >
      <ArcFiThemeContext.Provider value={themeContextValue}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AppRouter />
            </BrowserRouter>
          </QueryClientProvider>
        </WagmiProvider>
      </ArcFiThemeContext.Provider>
    </ConfigProvider>
  );
};

export default App;
