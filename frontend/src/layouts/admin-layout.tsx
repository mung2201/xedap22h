import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  ColumnHeightOutlined,
  CommentOutlined,
  DashboardOutlined,
  DownOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuOutlined,
  PictureOutlined,
  SafetyCertificateOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  TeamOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { App, Avatar, Breadcrumb, Button, ConfigProvider, Drawer, Dropdown, Grid, Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { PageBackNavigation } from '../components/common/page-back-navigation';
import { Permission, UserRole } from '../types/auth';
import { getErrorMessage } from '../utils/error-message';
import '../styles/admin.css';

interface NavigationItem {
  key: string;
  label: string;
  icon: ReactNode;
  permission?: Permission;
  anyOf?: Permission[];
}

const navigationGroups: Array<{ label: string; items: NavigationItem[] }> = [
  { label: 'Tổng quan', items: [
    { key: '/admin/dashboard', label: 'Báo cáo thống kê', icon: <DashboardOutlined />, anyOf: [Permission.VIEW_DASHBOARD, Permission.VIEW_STATISTICS] },
  ] },
  { label: 'Kinh doanh', items: [
    { key: '/admin/orders', label: 'Đơn hàng', icon: <ShoppingCartOutlined />, permission: Permission.MANAGE_ORDERS },
    { key: '/admin/products', label: 'Sản phẩm', icon: <AppstoreOutlined />, permission: Permission.MANAGE_PRODUCTS },
    { key: '/admin/users', label: 'Người dùng', icon: <TeamOutlined />, permission: Permission.MANAGE_USERS },
    { key: '/admin/service-bookings', label: 'Lịch dịch vụ', icon: <ToolOutlined />, permission: Permission.MANAGE_SERVICE_BOOKINGS },
    { key: '/admin/vouchers', label: 'Mã giảm giá', icon: <TagsOutlined />, permission: Permission.MANAGE_VOUCHERS },
  ] },
  { label: 'Danh mục & nội dung', items: [
    { key: '/admin/categories', label: 'Danh mục', icon: <AppstoreOutlined />, permission: Permission.MANAGE_CATEGORIES },
    { key: '/admin/brands', label: 'Thương hiệu', icon: <TagsOutlined />, permission: Permission.MANAGE_CATEGORIES },
    { key: '/admin/banners', label: 'Banner & Slider', icon: <PictureOutlined />, permission: Permission.MANAGE_CMS },
    { key: '/admin/pages', label: 'Trang nội dung', icon: <FileTextOutlined />, permission: Permission.MANAGE_CMS },
    { key: '/admin/size-guides', label: 'Hướng dẫn size', icon: <ColumnHeightOutlined />, permission: Permission.MANAGE_CMS },
  ] },
  { label: 'Chăm sóc khách hàng', items: [
    { key: '/admin/product-questions', label: 'Hỏi đáp sản phẩm', icon: <CommentOutlined />, permission: Permission.MANAGE_PRODUCTS },
    { key: '/admin/chatbot/faqs', label: 'FAQ Chatbot', icon: <CommentOutlined />, permission: Permission.MANAGE_CHATBOT },
  ] },
];

export const AdminLayout = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const isDesktop = Boolean(screens.lg);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const roleLabel = user?.role === UserRole.ADMIN ? 'Quản trị viên' : 'Nhân viên';

  const canManage = (permission: Permission): boolean =>
    user?.role === UserRole.ADMIN || Boolean(user?.permissions.includes(permission));
  const visibleGroups = navigationGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.anyOf
      ? item.anyOf.some(canManage)
      : Boolean(item.permission && canManage(item.permission))),
  })).filter((group) => group.items.length > 0);
  const selectedItem = visibleGroups.flatMap((group) => group.items)
    .find((item) => location.pathname.startsWith(item.key));
  const menuItems: MenuProps['items'] = visibleGroups.map((group) => ({
    type: 'group',
    key: group.label,
    label: group.label,
    children: group.items.map((item) => ({
      key: item.key,
      icon: item.icon,
      label: <Link to={item.key} onClick={() => setNavigationOpen(false)}>{item.label}</Link>,
    })),
  }));
  const breadcrumbs = [
    { title: 'Quản trị' },
    { title: selectedItem?.label ?? 'Cửa hàng' },
    ...(location.pathname.endsWith('/create') ? [{ title: 'Tạo mới' }] : []),
    ...(location.pathname.endsWith('/edit') ? [{ title: 'Chỉnh sửa' }] : []),
  ];

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/admin/login');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navigation = (
    <div className="admin-navigation">
      <Link to="/admin" className="admin-brand" onClick={() => setNavigationOpen(false)}>
        <span className="admin-brand-symbol" aria-hidden="true">22</span>
        <span className="admin-brand-copy">XeDap22h<small>QUẢN TRỊ CỬA HÀNG</small></span>
      </Link>
      <nav aria-label="Điều hướng quản trị" className="admin-navigation-menu">
        <Menu theme="dark" mode="inline" selectedKeys={selectedItem ? [selectedItem.key] : []} items={menuItems} />
      </nav>
      <Link className="admin-navigation-footer" to="/">
        <ArrowLeftOutlined /> Trở về cửa hàng
      </Link>
    </div>
  );

  return (
    <ConfigProvider theme={{
      token: {
        colorPrimary: '#4f46e5', colorPrimaryHover: '#4338ca', colorPrimaryActive: '#3730a3',
        colorInfo: '#4f46e5', colorLink: '#4f46e5', colorLinkHover: '#4338ca', colorLinkActive: '#3730a3',
        colorBgLayout: '#f5f6fa',
      },
      components: {
        Menu: { darkItemBg: '#111827', darkSubMenuItemBg: '#111827', darkItemSelectedBg: '#3730a3', darkItemColor: '#c4cbd8', darkGroupTitleColor: '#8994a8', itemHeight: 42, itemBorderRadius: 8 },
        Table: { headerBg: '#f8fafc', headerColor: '#475569', rowHoverBg: '#f7f7ff' },
      },
    }}>
      <Layout className="admin-layout">
        <a href="#admin-main-content" className="admin-skip-link">Đến nội dung chính</a>
        {isDesktop ? <Layout.Sider width={240} className="admin-sider">{navigation}</Layout.Sider> : null}
        <Drawer
          className="admin-navigation-drawer"
          title="Menu quản trị"
          placement="left"
          width={280}
          open={!isDesktop && navigationOpen}
          onClose={() => setNavigationOpen(false)}
          styles={{ body: { padding: 0, background: '#111827' } }}
        >
          {navigation}
        </Drawer>
        <Layout className="admin-workspace">
          <Layout.Header className="admin-header">
            <div className="admin-header-leading">
              {!isDesktop ? <Button type="text" icon={<MenuOutlined />} aria-label="Mở menu quản trị" aria-expanded={navigationOpen} onClick={() => setNavigationOpen(true)} /> : null}
              <Breadcrumb items={breadcrumbs} className="admin-breadcrumb" />
            </div>
            <div className="admin-header-actions">
              <Link to="/" className="admin-store-link" aria-label="Xem cửa hàng"><ShopOutlined /><span>Xem cửa hàng</span></Link>
              <Dropdown trigger={['click']} menu={{ items: [
                { key: 'role', label: roleLabel, icon: <SafetyCertificateOutlined />, disabled: true },
                { type: 'divider' },
                { key: 'logout', label: isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất', icon: <LogoutOutlined />, disabled: isLoggingOut, onClick: () => void handleLogout() },
              ] }}>
                <Button type="text" className="admin-user-menu" aria-label="Menu tài khoản quản trị">
                  <Avatar size={34} src={user?.avatarUrl}>{user?.fullName.trim().charAt(0).toUpperCase() ?? 'A'}</Avatar>
                  <span className="admin-user-copy"><strong>{user?.fullName}</strong><small>{roleLabel}</small></span>
                  <DownOutlined className="admin-user-chevron" />
                </Button>
              </Dropdown>
            </div>
          </Layout.Header>
          <Layout.Content className="admin-content" id="admin-main-content" tabIndex={-1}>
            <PageBackNavigation />
            <Outlet />
          </Layout.Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};
