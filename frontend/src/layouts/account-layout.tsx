import {
  EnvironmentOutlined,
  FileTextOutlined,
  HeartOutlined,
  KeyOutlined,
  MessageOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Card, Menu, Space, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { PageBackNavigation } from '../components/common/page-back-navigation';
import { UserRole } from '../types/auth';

export const AccountLayout = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  return (
    <main className="page-container account-page">
      <PageBackNavigation />
      <Space direction="vertical" size="large" className="full-width">
        <div>
          <Typography.Title level={2}>
            <UserOutlined /> Tài khoản của tôi
          </Typography.Title>
          <Typography.Text type="secondary">
            Quản lý thông tin hồ sơ, bảo mật và địa chỉ giao hàng.
          </Typography.Text>
        </div>
        <Card>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            className="account-navigation"
            items={[
              {
                key: '/account/profile',
                icon: <UserOutlined />,
                label: <Link to="/account/profile">Hồ sơ</Link>,
              },
              {
                key: '/account/addresses',
                icon: <EnvironmentOutlined />,
                label: <Link to="/account/addresses">Sổ địa chỉ</Link>,
              },
              {
                key: '/account/wishlist',
                icon: <HeartOutlined />,
                label: <Link to="/account/wishlist">Yêu thích</Link>,
              },
              {
                key: '/account/orders',
                icon: <FileTextOutlined />,
                label: <Link to="/account/orders">Đơn hàng</Link>,
              },
              ...(user?.role === UserRole.CUSTOMER
                ? [
                    {
                      key: '/account/questions',
                      icon: <MessageOutlined />,
                      label: <Link to="/account/questions">Câu hỏi của tôi</Link>,
                    },
                  ]
                : []),
              {
                key: '/account/change-password',
                icon: <KeyOutlined />,
                label: <Link to="/account/change-password">Đổi mật khẩu</Link>,
              },
            ]}
          />
          <div className="account-content">
            <Outlet />
          </div>
        </Card>
      </Space>
    </main>
  );
};
