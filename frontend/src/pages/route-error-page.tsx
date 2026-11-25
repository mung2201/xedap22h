import { ReloadOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { PageBackLayout } from '../components/common/page-back-navigation';

/** Keep navigation available when a page crashes or its code cannot be loaded. */
export const RouteErrorPage = () => (
  <PageBackLayout>
    <main className="page-container" style={{ paddingBlock: 48, textAlign: 'center' }}>
      <section aria-labelledby="route-error-title" style={{ maxWidth: 560, marginInline: 'auto' }}>
        <Typography.Title level={2} id="route-error-title">Không thể hiển thị trang</Typography.Title>
        <Typography.Paragraph type="secondary" role="alert">
          Trang có thể chưa tải xong hoặc đang gặp sự cố. Bạn có thể tải lại,
          quay lại trang trước hoặc về trang chủ.
        </Typography.Paragraph>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => window.location.reload()}
        >
          Tải lại trang
        </Button>
      </section>
    </main>
  </PageBackLayout>
);
