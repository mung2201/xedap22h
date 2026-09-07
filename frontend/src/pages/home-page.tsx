import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Carousel,
  Col,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryService } from '../api/services/category.service';
import { cmsService } from '../api/services/cms.service';
import { productService } from '../api/services/product.service';
import { CategoryCard } from '../components/catalog/category-card';
import { ProductSection } from '../components/products/product-section';
import { RideMatchLauncher } from '../components/recommendations/ride-match-launcher';
import type { Category, CategoryTreeNode, Product } from '../types/catalog';
import { ProductSort } from '../types/catalog';
import { CmsBannerPosition, CmsBannerType } from '../types/cms';
import type { CmsBanner } from '../types/cms';
import { getErrorMessage } from '../utils/error-message';
import {
  clearRecentlyViewedProducts,
  getRecentlyViewedProductSlugs,
} from '../utils/recently-viewed-products';

interface HomeCategorySection {
  category: Category;
  products: Product[];
}

interface HomeCatalogData {
  categories: CategoryTreeNode[];
  featured: Product[];
  newest: Product[];
  discounted: Product[];
  categorySections: HomeCategorySection[];
  sliders: CmsBanner[];
  promotionalBanners: CmsBanner[];
}

const getShowcaseCategories = (categories: CategoryTreeNode[]): Category[] => {
  const children = categories.flatMap((category) => category.children);
  return (children.length ? children : categories).slice(0, 6);
};

const getHomeRailCategories = (categories: CategoryTreeNode[]): Category[] => {
  const allCategories = categories.flatMap((category) => [category, ...category.children]);
  const categoriesBySlug = new Map(allCategories.map((category) => [category.slug, category]));
  const preferredSlugs = [
    'mountain-bike',
    'womens-bikes',
    'city-bike',
    'road-bike',
    'bike-accessories',
    'bike-parts',
    'accessories',
  ];

  return preferredSlugs.flatMap((slug) => {
    const category = categoriesBySlug.get(slug);
    return category ? [category] : [];
  });
};

const isExternalLink = (link: string): boolean => /^https?:\/\//i.test(link);

const CmsBannerAction = ({ banner }: { banner: CmsBanner }) => {
  if (!banner.link || !banner.buttonLabel) {
    return null;
  }

  const button = <Button type="primary" size="large">{banner.buttonLabel}</Button>;

  return isExternalLink(banner.link) ? (
    <a
      href={banner.link}
      target={banner.openInNewTab ? '_blank' : undefined}
      rel={banner.openInNewTab ? 'noreferrer' : undefined}
    >
      {button}
    </a>
  ) : (
    <Link to={banner.link}>{button}</Link>
  );
};

const CmsHeroSlide = ({ banner }: { banner: CmsBanner }) => (
  <article className="cms-hero-slide">
    <picture>
      {banner.mobileImageUrl ? (
        <source media="(max-width: 700px)" srcSet={banner.mobileImageUrl} />
      ) : null}
      <img className="cms-hero-image" src={banner.imageUrl} alt={banner.title} />
    </picture>
    <div className="cms-hero-overlay" />
    <div className="page-container cms-hero-content">
      <Tag className="hero-kicker">XeDap22h</Tag>
      <Typography.Title className="hero-title">{banner.title}</Typography.Title>
      {banner.subtitle ? (
        <Typography.Paragraph className="hero-description">
          {banner.subtitle}
        </Typography.Paragraph>
      ) : null}
      <CmsBannerAction banner={banner} />
    </div>
  </article>
);

const CmsPromotionBanner = ({ banner }: { banner: CmsBanner }) => {
  const content = (
    <article className="cms-promotion-banner">
      <img src={banner.imageUrl} alt={banner.title} />
      <div className="cms-promotion-overlay">
        <Typography.Text className="section-eyebrow">ƯU ĐÃI TỪ CỬA HÀNG</Typography.Text>
        <Typography.Title level={3}>{banner.title}</Typography.Title>
        {banner.subtitle ? <Typography.Paragraph>{banner.subtitle}</Typography.Paragraph> : null}
        {banner.buttonLabel ? <Typography.Text strong>{banner.buttonLabel} →</Typography.Text> : null}
      </div>
    </article>
  );

  if (!banner.link) {
    return content;
  }

  return isExternalLink(banner.link) ? (
    <a
      href={banner.link}
      target={banner.openInNewTab ? '_blank' : undefined}
      rel={banner.openInNewTab ? 'noreferrer' : undefined}
      className="cms-promotion-link"
    >
      {content}
    </a>
  ) : (
    <Link to={banner.link} className="cms-promotion-link">
      {content}
    </Link>
  );
};

const FallbackHero = ({ product }: { product?: Product }) => (
  <section className="hero-section storefront-hero-section">
    <div className="page-container storefront-hero-grid">
      <div className="hero-content storefront-hero-copy">
        <Typography.Text className="hero-kicker">READY FOR YOUR NEXT RIDE</Typography.Text>
        <Typography.Title className="hero-title">
          Chọn chiếc xe phù hợp. Bắt đầu hành trình mới.
        </Typography.Title>
        <Typography.Paragraph className="hero-description">
          Khám phá xe đạp địa hình, xe đua, xe thành phố và phụ kiện. Mỗi lựa chọn đều
          hiển thị rõ giá, màu, kích cỡ và tồn kho thực tế.
        </Typography.Paragraph>
        <Space wrap size="middle">
          <Link to="/products">
            <Button type="primary" size="large">
              Khám phá sản phẩm <ArrowRightOutlined />
            </Button>
          </Link>
          <Link to="/products?onSale=true">
            <Button size="large">Xem deal hôm nay</Button>
          </Link>
        </Space>
      </div>
      <div className="storefront-hero-visual" aria-hidden="true">
        <div className="storefront-hero-glow" />
        <div className="storefront-hero-wheel storefront-hero-wheel-left" />
        <div className="storefront-hero-wheel storefront-hero-wheel-right" />
        {product ? <img src={product.thumbnail} alt="" /> : null}
        <div className="storefront-hero-stamp">
          <span>XeDap22h</span>
          <strong>{product?.brand.name ?? 'RIDE MORE'}</strong>
          <small>{product ? 'Sản phẩm nổi bật' : 'Khám phá từng cung đường'}</small>
        </div>
      </div>
    </div>
  </section>
);

export const HomePage = () => {
  const [data, setData] = useState<HomeCatalogData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadHomeData = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [categories, sliders, promotionalBanners] = await Promise.all([
          categoryService.getTree(),
          cmsService.getPublicBanners({
            type: CmsBannerType.SLIDER,
            position: CmsBannerPosition.HOME_HERO,
          }),
          cmsService.getPublicBanners({
            type: CmsBannerType.BANNER,
            position: CmsBannerPosition.HOME_MIDDLE,
          }),
        ]);
        const railCategories = getHomeRailCategories(categories);
        const [featured, newest, discounted, categorySections] = await Promise.all([
          productService.getPublicList({
            featured: true,
            inStock: true,
            limit: 12,
            sort: ProductSort.NEWEST,
          }),
          productService.getPublicList({
            inStock: true,
            limit: 12,
            sort: ProductSort.NEWEST,
          }),
          productService.getPublicList({
            onSale: true,
            inStock: true,
            limit: 12,
            sort: ProductSort.NEWEST,
          }),
          Promise.all(
            railCategories.slice(0, 7).map(async (category) => ({
              category,
              products: (
                await productService.getPublicList({
                  category: category.slug,
                  inStock: true,
                  limit: 12,
                  sort: ProductSort.BEST_SELLING,
                })
              ).items,
            })),
          ),
        ]);

        if (!isMounted) {
          return;
        }

        setData({
          categories,
          featured: featured.items,
          newest: newest.items,
          discounted: discounted.items,
          categorySections,
          sliders,
          promotionalBanners,
        });
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const recentSlugs = getRecentlyViewedProductSlugs();

    if (!recentSlugs.length) {
      return () => {
        isMounted = false;
      };
    }

    void Promise.allSettled(recentSlugs.map((recentSlug) => productService.getBySlug(recentSlug)))
      .then((results) => {
        if (!isMounted) {
          return;
        }

        const productsBySlug = new Map<string, Product>();

        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            productsBySlug.set(result.value.slug, result.value);
          }
        });

        setRecentlyViewed(
          recentSlugs.flatMap((recentSlug) => {
            const product = productsBySlug.get(recentSlug);
            return product ? [product] : [];
          }),
        );
      })
      .catch(() => {
        if (isMounted) {
          setRecentlyViewed([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const showcaseCategories = useMemo(
    () => getShowcaseCategories(data?.categories ?? []),
    [data?.categories],
  );

  const clearRecentlyViewed = (): void => {
    clearRecentlyViewedProducts();
    setRecentlyViewed([]);
  };

  return (
    <main className="storefront-home">
      {data?.sliders.length ? (
        <section className="home-slider-section">
          <Carousel autoplay autoplaySpeed={6000} effect="fade">
            {data.sliders.map((banner) => (
              <CmsHeroSlide key={banner.id} banner={banner} />
            ))}
          </Carousel>
        </section>
      ) : (
        <FallbackHero product={data?.featured[0]} />
      )}

      <section className="store-service-strip">
        <div className="page-container">
          <Row gutter={[20, 16]}>
            <Col xs={24} sm={8}>
              <div className="store-service-item">
                <SafetyCertificateOutlined />
                <div>
                  <strong>Dữ liệu rõ ràng</strong>
                  <span>Thông số, giá và biến thể từ hệ thống</span>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="store-service-item">
                <ThunderboltOutlined />
                <div>
                  <strong>Chọn đúng biến thể</strong>
                  <span>Kiểm tra màu, size và tồn kho trước khi mua</span>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="store-service-item">
                <CheckCircleOutlined />
                <div>
                  <strong>Hỗ trợ chọn xe</strong>
                  <span>Tìm theo nhu cầu, ngân sách và chiều cao</span>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {showcaseCategories.length ? (
        <section className="page-container home-discovery-bar" aria-label="Mua sắm nhanh theo danh mục">
          <div className="home-discovery-copy">
            <Typography.Text className="home-discovery-kicker">MUA SẮM NHANH</Typography.Text>
            <Typography.Text strong>Chọn đúng nhu cầu của bạn</Typography.Text>
          </div>
          <div className="home-discovery-links">
            {showcaseCategories.slice(0, 5).map((category) => (
              <Link key={category.id} to={`/products?category=${category.slug}`}>
                <span>{category.name}</span>
                <ArrowRightOutlined />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <RideMatchLauncher />

      {errorMessage ? (
        <div className="page-container home-alert">
          <Alert
            type="warning"
            showIcon
            message="Không thể tải một phần dữ liệu cửa hàng"
            description={errorMessage}
          />
        </div>
      ) : null}

      <ProductSection
        eyebrow="XE DAP22H DEAL ZONE"
        title="Top sản phẩm bán chạy"
        description="Các mẫu xe và phụ kiện được khách hàng quan tâm, giá và tồn kho được cập nhật trực tiếp từ hệ thống."
        products={data?.discounted ?? []}
        isLoading={isLoading}
        viewAllTo="/products?onSale=true"
        tone="deal"
        campaignHighlights={[
          'Miễn phí vận chuyển toàn quốc',
          'Bảo hành khung sườn đến 5 năm',
          'Hỗ trợ trả góp 0% lãi suất',
        ]}
        autoSlide
        autoplaySpeed={3600}
      />

      <section className="page-container category-showcase-section">
        <div className="section-heading">
          <div>
            <Typography.Text className="section-eyebrow">MUA SẮM THEO NHU CẦU</Typography.Text>
            <Typography.Title level={2}>Danh mục xe đạp & phụ kiện</Typography.Title>
            <Typography.Text type="secondary">
              Bắt đầu từ loại xe hoặc phụ kiện bạn đang tìm.
            </Typography.Text>
          </div>
          <Link to="/products">
            <Button type="link" icon={<ArrowRightOutlined />} iconPosition="end">
              Xem tất cả
            </Button>
          </Link>
        </div>
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <Row gutter={[16, 16]}>
            {showcaseCategories.map((category) => (
              <Col key={category.id} xs={12} md={8} lg={4}>
                <CategoryCard category={category} />
              </Col>
            ))}
          </Row>
        )}
      </section>

      <ProductSection
        eyebrow="LỰA CHỌN ĐƯỢC QUAN TÂM"
        title="Xe đạp & phụ kiện nổi bật"
        description="Các sản phẩm được ưu tiên hiển thị từ dữ liệu sản phẩm hiện có."
        products={data?.featured ?? []}
        isLoading={isLoading}
        viewAllTo="/products?featured=true"
        autoSlide
        autoplaySpeed={4400}
      />

      {data?.promotionalBanners.length ? (
        <section className="page-container cms-promotion-section">
          <Row gutter={[20, 20]}>
            {data.promotionalBanners.map((banner) => (
              <Col key={banner.id} xs={24} md={12}>
                <CmsPromotionBanner banner={banner} />
              </Col>
            ))}
          </Row>
        </section>
      ) : null}

      {data?.categorySections.map((section, index) => (
        <ProductSection
          key={section.category.id}
          eyebrow={index === 0 ? 'CHỌN XE THEO PHONG CÁCH CỦA BẠN' : undefined}
          title={section.category.name}
          description={`Khám phá các sản phẩm ${section.category.name.toLocaleLowerCase('vi-VN')} đang còn hàng.`}
          products={section.products}
          isLoading={isLoading}
          viewAllTo={`/products?category=${section.category.slug}`}
          autoSlide
          autoplaySpeed={3800}
          spotlight={{
            imageUrl: section.category.imageUrl,
            title: section.category.name,
            description: `Chọn nhanh các sản phẩm ${section.category.name.toLocaleLowerCase('vi-VN')} đang có sẵn tại XeDap22h.`,
            to: `/products?category=${section.category.slug}`,
          }}
        />
      ))}

      <ProductSection
        eyebrow="VỪA CẬP NHẬT"
        title="Sản phẩm mới"
        description="Cập nhật theo thời điểm tạo sản phẩm trên hệ thống."
        products={data?.newest ?? []}
        isLoading={isLoading}
        viewAllTo="/products?sort=newest"
        autoSlide
        autoplaySpeed={4600}
      />

      {recentlyViewed.length ? (
        <ProductSection
          eyebrow="DÀNH RIÊNG CHO BẠN"
          title="Sản phẩm bạn vừa xem"
          description="Giá và tồn kho được kiểm tra lại từ hệ thống mỗi khi bạn quay trở lại."
          products={recentlyViewed}
          autoSlide
          autoplaySpeed={5000}
          actions={
            <Button type="link" icon={<DeleteOutlined />} onClick={clearRecentlyViewed}>
              Xóa lịch sử
            </Button>
          }
        />
      ) : null}

      <section className="page-container home-size-guide-cta">
        <div>
          <Typography.Text className="section-eyebrow">SIZE CALCULATOR</Typography.Text>
          <Typography.Title level={2}>Chưa biết chọn size xe nào?</Typography.Title>
          <Typography.Paragraph>
            Nhập chiều cao và loại xe để nhận gợi ý size từ các rule do quản trị viên cấu hình.
          </Typography.Paragraph>
        </div>
        <Link to="/size-guide">
          <Button type="primary" size="large" icon={<ArrowRightOutlined />} iconPosition="end">
            Tính size xe ngay
          </Button>
        </Link>
      </section>

      <section className="page-container store-benefit-section">
        <div className="section-heading">
          <div>
            <Typography.Text className="section-eyebrow">MUA SẮM TỰ TIN HƠN</Typography.Text>
            <Typography.Title level={2}>Thiết kế cho người yêu xe đạp</Typography.Title>
          </div>
        </div>
        <Row gutter={[20, 20]}>
          <Col xs={24} md={8}>
            <article className="store-benefit-card">
              <SafetyCertificateOutlined className="feature-icon" />
              <Typography.Title level={4}>Thông tin rõ ràng</Typography.Title>
              <Typography.Paragraph>
                Giá, thông số kỹ thuật, màu sắc, kích cỡ và tồn kho đều được hiển thị từ API
                sản phẩm.
              </Typography.Paragraph>
            </article>
          </Col>
          <Col xs={24} md={8}>
            <article className="store-benefit-card">
              <ThunderboltOutlined className="feature-icon" />
              <Typography.Title level={4}>Tìm xe nhanh hơn</Typography.Title>
              <Typography.Paragraph>
                Search, filter và sort được lưu trên URL để bạn dễ quay lại đúng kết quả đã xem.
              </Typography.Paragraph>
            </article>
          </Col>
          <Col xs={24} md={8}>
            <article className="store-benefit-card">
              <CheckCircleOutlined className="feature-icon" />
              <Typography.Title level={4}>Mua đúng biến thể</Typography.Title>
              <Typography.Paragraph>
                Trang chi tiết kiểm tra stock theo màu và size trước khi khách thêm vào giỏ hàng.
              </Typography.Paragraph>
            </article>
          </Col>
        </Row>
      </section>
    </main>
  );
};
