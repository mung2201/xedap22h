import {
  AppstoreOutlined,
  CommentOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  PictureOutlined,
  ColumnHeightOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Space, Typography } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { Permission, UserRole } from '../types/auth';

const { Header, Sider, Content } = Layout;

export const AdminLayout = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const canManage = (permission: Permission): boolean =>
    user?.role === UserRole.ADMIN || Boolean(user?.permissions.includes(permission));
  const canViewDashboard =
    canManage(Permission.VIEW_DASHBOARD) || canManage(Permission.VIEW_STATISTICS);
  const adminSections = [
    '/admin/products',
    '/admin/product-questions',
    '/admin/categories',
    '/admin/brands',
    '/admin/orders',
    '/admin/service-bookings',
    '/admin/users',
    '/admin/vouchers',
    '/admin/banners',
    '/admin/pages',
    '/admin/size-guides',
    '/admin/chatbot',
  ];
  const selectedKey =
    adminSections.find((section) => location.pathname.startsWith(section)) ??
    '/admin/dashboard';

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <Layout className="admin-layout">
      <Sider breakpoint="lg" collapsedWidth="0" className="admin-sider">
        <Link to="/admin" className="admin-brand">
          XeDap22h Admin
        </Link>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={[
            ...(canViewDashboard
              ? [
                  {
                    key: '/admin/dashboard',
                    icon: <DashboardOutlined />,
                    label: <Link to="/admin/dashboard">Dashboard</Link>,
                  },
                ]
              : []),
            ...(canManage(Permission.MANAGE_PRODUCTS)
              ? [
                  {
                    key: '/admin/products',
                    icon: <AppstoreOutlined />,
                    label: <Link to="/admin/products">Sản phẩm</Link>,
                  },
                  {
                    key: '/admin/product-questions',
                    icon: <CommentOutlined />,
                    label: <Link to="/admin/product-questions">Hỏi đáp sản phẩm</Link>,
                  },
                ]
              : []),
            ...(canManage(Permission.MANAGE_CATEGORIES)
              ? [
                  {
                    key: '/admin/categories',
                    icon: <TagsOutlined />,
                    label: <Link to="/admin/categories">Danh mục</Link>,
                  },
                  {
                    key: '/admin/brands',
                    icon: <TagsOutlined />,
                    label: <Link to="/admin/brands">Thương hiệu</Link>,
                  },
                ]
              : []),
            ...(canManage(Permission.MANAGE_ORDERS)
              ? [
                  {
                    key: '/admin/orders',
                    icon: <ShoppingCartOutlined />,
                    label: <Link to="/admin/orders">Đơn hàng</Link>,
                  },
                ]
              : []),
            ...(canManage(Permission.MANAGE_SERVICE_BOOKINGS)
              ? [
                  {
                    key: '/admin/service-bookings',
                    icon: <ToolOutlined />,
                    label: <Link to="/admin/service-bookings">Lịch dịch vụ</Link>,
                  },
                ]
              : []),
            ...(canManage(Permission.MANAGE_USERS)
              ? [
                  {
                    key: '/admin/users',
                    icon: <TeamOutlined />,
                    label: <Link to="/admin/users">Người dùng</Link>,
                  },
                ]
              : []),
            ...(canManage(Permission.MANAGE_VOUCHERS)
              ? [
                  {
                    key: '/admin/vouchers',
                    icon: <TagsOutlined />,
                    label: <Link to="/admin/vouchers">Voucher</Link>,
                  },
                ]
              : []),
            ...(canManage(Permission.MANAGE_CMS)
              ? [
                  {
                    key: '/admin/banners',
                    icon: <PictureOutlined />,
                    label: <Link to="/admin/banners">Banner & Slider</Link>,
                  },
                  {
                    key: '/admin/pages',
                    icon: <FileTextOutlined />,
                    label: <Link to="/admin/pages">Trang nội dung</Link>,
                  },
                  {
                    key: '/admin/size-guides',
                    icon: <ColumnHeightOutlined />,
                    label: <Link to="/admin/size-guides">Hướng dẫn size</Link>,
                  },
                ]
              : []),
            ...(canManage(Permission.MANAGE_CHATBOT)
              ? [
                  {
                    key: '/admin/chatbot',
                    icon: <CommentOutlined />,
                    label: <Link to="/admin/chatbot/faqs">FAQ Chatbot</Link>,
                  },
                ]
              : []),
          ]}
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Space>
            <SafetyCertificateOutlined />
            <Typography.Text>
              {user?.fullName} · {user?.role}
            </Typography.Text>
          </Space>
          <Button
            icon={<LogoutOutlined />}
            onClick={() => void handleLogout()}
          >
            Đăng xuất
          </Button>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
