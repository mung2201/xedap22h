import { App as AntdApp, ConfigProvider, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps) => {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = (): void => setReducedMotion(media.matches);
    media.addEventListener('change', updatePreference);
    return () => media.removeEventListener('change', updatePreference);
  }, []);

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#3155c6',
          colorPrimaryHover: '#2547af',
          colorPrimaryActive: '#1e3a8a',
          colorInfo: '#3155c6',
          colorLink: '#3155c6',
          colorLinkHover: '#2547af',
          colorLinkActive: '#1e3a8a',
          colorSuccess: '#0f766e',
          colorWarning: '#b45309',
          colorError: '#dc2626',
          colorErrorHover: '#b91c1c',
          colorErrorActive: '#991b1b',
          colorText: '#172033',
          colorTextSecondary: '#52647a',
          colorTextTertiary: '#52647a',
          colorTextPlaceholder: '#64748b',
          colorBorder: '#dce1e9',
          colorBgLayout: '#f5f6fa',
          borderRadius: 10,
          controlHeight: 36,
          motion: !reducedMotion,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
};
