import { ArrowLeftOutlined } from '@ant-design/icons';
import { Alert, Card, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cmsService } from '../api/services/cms.service';
import type { StaticPage } from '../types/cms';
import { getErrorMessage } from '../utils/error-message';

export const StaticPagePage = () => {
  const { slug = '' } = useParams();
  const [staticPage, setStaticPage] = useState<StaticPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadPage = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const page = await cmsService.getPublicPage(slug);
        setStaticPage(page);
        document.title = page.seoTitle ?? `${page.title} | XeDap22h`;
      } catch (error) {
        setStaticPage(null);
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadPage();
  }, [slug]);

  if (isLoading) {
    return (
      <main className="static-page-loading">
        <Spin size="large" />
      </main>
    );
  }

  if (!staticPage) {
    return (
      <main className="page-container static-page-container">
        <Alert type="error" showIcon message={errorMessage ?? 'Không tìm thấy trang nội dung.'} />
      </main>
    );
  }

  return (
    <main className="page-container static-page-container">
      <Link to="/" className="back-link">
        <ArrowLeftOutlined /> Về trang chủ
      </Link>
      <Card className="static-page-card">
        <Typography.Title level={1}>{staticPage.title}</Typography.Title>
        {staticPage.excerpt ? (
          <Typography.Paragraph className="static-page-excerpt">
            {staticPage.excerpt}
          </Typography.Paragraph>
        ) : null}
        <Typography.Paragraph className="static-page-content">
          {staticPage.content}
        </Typography.Paragraph>
      </Card>
    </main>
  );
};
