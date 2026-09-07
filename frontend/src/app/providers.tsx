import { App as AntdApp, ConfigProvider, theme } from 'antd';
import type { ReactNode } from 'react';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => (
  <ConfigProvider
    theme={{
      algorithm: theme.defaultAlgorithm,
      token: {
        colorPrimary: '#3347f5',
        colorInfo: '#2563eb',
        colorLink: '#3347f5',
        borderRadius: 9,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    }}
  >
    <AntdApp>{children}</AntdApp>
  </ConfigProvider>
);
