import {
  DownOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  LogoutOutlined,
  MenuOutlined,
  ShoppingCartOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  UserOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Badge,
  Button,
  Col,
  Drawer,
  Dropdown,
  FloatButton,
  Layout,
  Row,
  Space,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { brandService } from '../api/services/brand.service';
import { categoryService } from '../api/services/category.service';
import { GlobalProductSearch } from '../components/common/global-product-search';
import { CustomerLoginModal } from '../components/auth/customer-login-modal';
import { FaqChatbotWidget } from '../components/chatbot/faq-chatbot-widget';
import { CompareTray } from '../components/products/compare-tray';
import { useAuthStore } from '../stores/auth.store';
import { useCommerceStore } from '../stores/commerce.store';
import type { Brand, CategoryTreeNode } from '../types/catalog';

const { Header, Content, Footer } = Layout;

export const CustomerLayout = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const cartItemCount = useCommerceStore((state) => state.cartItemCount);
  const wishlistCount = useCommerceStore((state) => state.wishlistCount);
  const refreshCounts = useCommerceStore((state) => state.refreshCounts);
  const resetCommerce = useCommerceStore((state) => state.reset);
  const [categories, setCategories] = useState<CategoryTreeNode[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [postLoginDestination, setPostLoginDestination] = useState<string | null>(null);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isNavigationDataLoading, setIsNavigationDataLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      resetCommerce();
      return;
    }

    void refreshCounts();
  }, [user, refreshCounts, resetCommerce]);

  const loadNavigationData = useCallback(async (): Promise<void> => {
    setIsNavigationDataLoading(true);

    try {
      const [categoryResult, brandResult] = await Promise.allSettled([
        categoryService.getTree(),
        brandService.getPublicList(),
      ]);

      if (categoryResult.status === 'fulfilled') {
        setCategories(categoryResult.value);
      }

      if (brandResult.status === 'fulfilled') {
        setBrands(brandResult.value);
      }
    } finally {
      setIsNavigationDataLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNavigationData();
  }, [loadNavigationData]);

  const handleLogout = async (): Promise<void> => {
    await logout();
    resetCommerce();
    navigate('/');
  };

  const requestLogin = (destination?: string): void => {
    setPostLoginDestination(destination ?? null);
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (): void => {
    if (postLoginDestination) {
      navigate(postLoginDestination);
    }
  };

  const megaCategoryGroups = useMemo(
    () =>
      categories.slice(0, 4).map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        items: category.children.length ? category.children : [category],
      })),
    [categories],
  );

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/account/profile">Tài khoản của tôi</Link>,
    },
    {
      key: 'orders',
      icon: <ShoppingCartOutlined />,
      label: <Link to="/account/orders">Đơn hàng của tôi</Link>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: () => void handleLogout(),
    },
  ];

  return (
    <Layout className="site-layout">
      <div className="store-topbar">
        <div className="page-container store-topbar-content">
          <Space wrap size={20} className="store-topbar-benefits">
            <span>
              <SafetyCertificateOutlined /> Thông tin xe và phụ kiện minh bạch
            </span>
            <span>
              <ThunderboltOutlined /> Kiểm tra tồn kho theo màu và kích cỡ
            </span>
          </Space>
          <Link to="/size-guide" className="store-topbar-size-link">
            <EnvironmentOutlined /> Hướng dẫn chọn size
          </Link>
        </div>
      </div>

      <Header className="site-header">
        <div className="page-container site-header-main">
          <Button
            type="text"
            className="store-mobile-menu-button"
            icon={<MenuOutlined />}
            aria-label="Mở menu danh mục"
            onClick={() => setIsMobileMenuOpen(true)}
          />
          <Link to="/" className="brand-link" aria-label="XeDap22h - Trang chủ">
            <img
              src="/images/xedap22h-logo.png"
              alt="XeDap22h"
              className="brand-logo-image"
            />
          </Link>

          <GlobalProductSearch />

          <Space size={4} className="header-actions">
            <Badge count={wishlistCount} size="small" overflowCount={99}>
              <Button
                type="text"
                className="store-icon-action"
                icon={<HeartOutlined />}
                aria-label="Danh sách yêu thích"
                onClick={() => {
                  if (!user) {
                    requestLogin('/account/wishlist');
                    return;
                  }

                  navigate('/account/wishlist');
                }}
              >
                <span>Yêu thích</span>
              </Button>
            </Badge>
            <Badge count={cartItemCount} size="small" overflowCount={99}>
              <Button
                type="text"
                className="store-icon-action"
                icon={<ShoppingCartOutlined />}
                aria-label="Giỏ hàng"
                onClick={() => {
                  if (!user) {
                    requestLogin('/cart');
                    return;
                  }

                  navigate('/cart');
                }}
              >
                <span>Giỏ hàng</span>
              </Button>
            </Badge>
            {user ? (
              <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
                <Button type="text" className="store-account-action">
                  <Avatar size={28} src={user.avatarUrl} icon={<UserOutlined />} />
                  <span className="store-account-copy">
                    <small>Tài khoản</small>
                    <strong>{user.fullName}</strong>
                  </span>
                  <DownOutlined className="store-account-chevron" />
                </Button>
              </Dropdown>
            ) : (
              <Button
                type="text"
                className="store-account-action store-guest-action"
                icon={<UserOutlined />}
                onClick={() => requestLogin()}
              >
                <span className="store-account-copy">
                  <small>Tài khoản</small>
                  <strong>Đăng nhập</strong>
                </span>
              </Button>
            )}
          </Space>
        </div>
      </Header>

      <nav className="store-category-nav" aria-label="Danh mục sản phẩm">
        <div className="page-container store-category-nav-content">
          <div
            className="store-category-mega"
            onMouseEnter={() => {
              setIsMegaMenuOpen(true);
              if (!megaCategoryGroups.length || !brands.length) {
                void loadNavigationData();
              }
            }}
            onMouseLeave={() => setIsMegaMenuOpen(false)}
          >
            <Button
              type="text"
              className={`store-category-menu-trigger ${isMegaMenuOpen ? 'is-open' : ''}`}
              icon={<MenuOutlined />}
              aria-expanded={isMegaMenuOpen}
              aria-haspopup="menu"
              onClick={() => {
                setIsMegaMenuOpen(true);
                if (!megaCategoryGroups.length || !brands.length) {
                  void loadNavigationData();
                }
              }}
            >
              Sản phẩm
              <DownOutlined className="store-category-menu-chevron" />
            </Button>
            {isMegaMenuOpen ? (
              <div className="store-category-mega-panel" role="menu">
                {megaCategoryGroups.length ? (
                  <div className="store-category-mega-groups">
                    {megaCategoryGroups.map((group) => (
                      <section key={group.id} className="store-category-mega-group">
                        <Link
                          to={`/products?category=${group.slug}`}
                          className="store-category-mega-title"
                          onClick={() => setIsMegaMenuOpen(false)}
                        >
                          {group.name}
                        </Link>
                        <div className="store-category-mega-links">
                          {group.items.map((item) => (
                            <Link
                              key={item.id}
                              to={`/products?category=${item.slug}`}
                              onClick={() => setIsMegaMenuOpen(false)}
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="store-category-mega-empty">
                    <Typography.Text strong>
                      {isNavigationDataLoading
                        ? 'Đang tải danh mục…'
                        : 'Chưa thể tải danh mục. Hãy thử lại sau ít giây.'}
                    </Typography.Text>
                  </div>
                )}
                <aside className="store-category-mega-brands">
                  <Typography.Text className="store-category-mega-brand-title">
                    Thương hiệu
                  </Typography.Text>
                  <div className="store-category-mega-brand-list">
                    {brands.slice(0, 10).map((brand) => (
                      <Link
                        key={brand.id}
                        to={`/products?brand=${brand.slug}`}
                        className="store-category-mega-brand"
                        onClick={() => setIsMegaMenuOpen(false)}
                      >
                        {brand.logoUrl ? (
                          <img src={brand.logoUrl} alt={brand.name} />
                        ) : (
                          <span>{brand.name}</span>
                        )}
                      </Link>
                    ))}
                    {!brands.length ? (
                      <Typography.Text type="secondary">
                        {isNavigationDataLoading
                          ? 'Đang tải thương hiệu…'
                          : 'Thương hiệu sẽ hiển thị khi có dữ liệu.'}
                      </Typography.Text>
                    ) : null}
                  </div>
                </aside>
              </div>
            ) : null}
          </div>
          <Link to="/products">Xe đạp & phụ kiện</Link>
          <Link to="/service-booking">Dịch vụ</Link>
          <Link to="/products?onSale=true">Chương trình khuyến mãi</Link>
          <Link to="/products?featured=true">Xe đạp nổi bật</Link>
          <Link to="/size-guide">Tư vấn chọn size</Link>
          <Link to="/compare">So sánh xe</Link>
        </div>
      </nav>

      <Content className="site-content">
        <Outlet />
      </Content>

      <Footer className="site-footer">
        <div className="page-container site-footer-content">
          <Row gutter={[32, 32]} className="site-footer-grid">
            <Col xs={24} sm={12} lg={8}>
              <Link to="/" className="footer-brand">
                <span className="brand-mark">22</span>
                <span>XeDap22h</span>
              </Link>
              <Typography.Paragraph>
                Không gian mua sắm xe đạp và phụ kiện, với dữ liệu giá, biến thể và tồn kho
                được cập nhật từ hệ thống.
              </Typography.Paragraph>
            </Col>
            <Col xs={12} sm={6} lg={4}>
              <Typography.Title level={5}>Mua sắm</Typography.Title>
              <div className="footer-link-list">
                <Link to="/products">Tất cả sản phẩm</Link>
                <Link to="/products?onSale=true">Ưu đãi hôm nay</Link>
                <Link to="/size-guide">Hướng dẫn chọn size</Link>
              </div>
            </Col>
            <Col xs={12} sm={6} lg={4}>
              <Typography.Title level={5}>Hỗ trợ</Typography.Title>
              <div className="footer-link-list">
                <Link to="/pages/warranty-policy">Chính sách bảo hành</Link>
                <Link to="/pages/return-policy">Chính sách đổi trả</Link>
                <Link to="/pages/contact">Liên hệ</Link>
                <Link to="/track-order">Tra cứu đơn hàng</Link>
                <Link to="/service-booking">Đặt lịch dịch vụ</Link>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={8}>
              <Typography.Title level={5}>Tư vấn trước khi mua</Typography.Title>
              <Typography.Paragraph>
                Dùng công cụ chọn size hoặc chatbot ở góc màn hình để tìm chiếc xe phù hợp
                với nhu cầu và chiều cao của bạn.
              </Typography.Paragraph>
              <Space wrap>
                <Link to="/size-guide">
                  <Button>Tính size xe</Button>
                </Link>
                <Link to="/products">
                  <Button type="primary">Xem xe đang bán</Button>
                </Link>
              </Space>
            </Col>
          </Row>
          <div className="site-footer-bottom">
            <Typography.Text>© {new Date().getFullYear()} XeDap22h. All rights reserved.</Typography.Text>
            <Space wrap size="middle">
              <Link to="/pages/about-us">Giới thiệu</Link>
              <Link to="/pages/contact">Liên hệ</Link>
            </Space>
          </div>
        </div>
      </Footer>
      <Drawer
        title="Khám phá XeDap22h"
        placement="left"
        className="store-mobile-drawer"
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <div className="mobile-store-navigation">
          {!user ? (
            <Button
              type="primary"
              icon={<UserOutlined />}
              className="mobile-store-login-button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                requestLogin();
              }}
            >
              Đăng nhập / Đăng ký
            </Button>
          ) : (
            <Link to="/account/profile" onClick={() => setIsMobileMenuOpen(false)}>
              Tài khoản của tôi
            </Link>
          )}
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
            Trang chủ
          </Link>
          <Link to="/products" onClick={() => setIsMobileMenuOpen(false)}>
            Tất cả sản phẩm
          </Link>
          <Link to="/products?onSale=true" onClick={() => setIsMobileMenuOpen(false)}>
            Deal hot hôm nay
          </Link>
          <Link to="/size-guide" onClick={() => setIsMobileMenuOpen(false)}>
            Hướng dẫn chọn size
          </Link>
          {categories.length ? <Typography.Title level={5}>Danh mục</Typography.Title> : null}
          <Link to="/compare" onClick={() => setIsMobileMenuOpen(false)}>
            So sánh xe
          </Link>
          <Link to="/track-order" onClick={() => setIsMobileMenuOpen(false)}>
            Tra cứu đơn hàng
          </Link>
          <Link to="/service-booking" onClick={() => setIsMobileMenuOpen(false)}>
            Đặt lịch dịch vụ
          </Link>
          {categories.map((category) => (
            <div key={category.id} className="mobile-store-category-group">
              <Link
                className="mobile-store-category-parent"
                to={`/products?category=${category.slug}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {category.name}
              </Link>
              {category.children.map((child) => (
                <Link
                  key={child.id}
                  to={`/products?category=${child.slug}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          ))}
        </div>
      </Drawer>
      <CustomerLoginModal
        open={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setPostLoginDestination(null);
        }}
        onLoginSuccess={handleLoginSuccess}
      />
      <FloatButton.BackTop
        className="store-back-to-top"
        visibilityHeight={360}
        tooltip="Lên đầu trang"
        icon={<VerticalAlignTopOutlined />}
      />
      <CompareTray />
      <FaqChatbotWidget />
    </Layout>
  );
};
