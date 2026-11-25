import { ArrowLeftOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Space, Spin, Typography } from 'antd';
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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const loadPage = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);
      setStaticPage(null);
      try {
        const page = await cmsService.getPublicPage(slug);
        if (!active) return;
        setStaticPage(page);
        document.title = page.seoTitle ?? `${page.title} | XeDap22h`;
      } catch (error) {
        if (!active) return;
        setStaticPage(null);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadPage();
    return () => { active = false; };
  }, [slug, reloadKey]);

  useEffect(() => () => { document.title = 'XeDap22h'; }, []);

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
        <Alert
          type="error"
          showIcon
          message="Không thể tải trang nội dung"
          description={errorMessage ?? 'Không tìm thấy trang nội dung.'}
          action={<Button onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button>}
        />
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
        {slug === 'contact' ? (
          <Space wrap>
            <Link to="/products"><Button type="primary">Tìm sản phẩm cần tư vấn</Button></Link>
            <Link to="/track-order"><Button>Tra cứu đơn hàng</Button></Link>
            <Link to="/service-booking"><Button>Đặt lịch dịch vụ</Button></Link>
          </Space>
        ) : null}
      </Card>
    </main>
  );
};
