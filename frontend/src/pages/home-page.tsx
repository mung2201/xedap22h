import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CompassOutlined,
  DeleteOutlined,
  PauseOutlined,
  PlayCircleOutlined,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryService } from '../api/services/category.service';
import { cmsService } from '../api/services/cms.service';
import { productService } from '../api/services/product.service';
import { CategoryCard } from '../components/catalog/category-card';
import { ProductSection } from '../components/products/product-section';
import { RideMatchLauncher } from '../components/recommendations/ride-match-launcher';
import type { Category, CategoryTreeNode, Product } from '../types/catalog';
import { ProductSort, ProductType } from '../types/catalog';
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
  featured: Product[];
  newest: Product[];
  discounted: Product[];
  categorySections: HomeCategorySection[];
  sliders: CmsBanner[];
  promotionalBanners: CmsBanner[];
}

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
      <img className="cms-hero-image" src={banner.imageUrl} alt={banner.title} decoding="async" />
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
      <img src={banner.imageUrl} alt={banner.title} loading="lazy" decoding="async" />
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

const FallbackHero = ({ product, hasDiscounts }: { product?: Product; hasDiscounts: boolean }) => (
  <section className="hero-section storefront-hero-section">
    <div className="page-container storefront-hero-grid">
      <div className="hero-content storefront-hero-copy">
        <Typography.Text className="hero-kicker">MỖI VÒNG BÁNH, MỘT HÀNH TRÌNH</Typography.Text>
        <Typography.Title className="hero-title">
          Chọn chiếc xe phù hợp. Bắt đầu hành trình mới.
        </Typography.Title>
        <Typography.Paragraph className="hero-description">
          Từ phố quen đến những cung đường mới. Tìm chiếc xe và phụ kiện đồng hành
          cùng phong cách của bạn.
        </Typography.Paragraph>
        <Space wrap size="middle">
          <Link to="/products">
            <Button type="primary" size="large">
              Khám phá sản phẩm <ArrowRightOutlined />
            </Button>
          </Link>
          <Link to={hasDiscounts ? '/products?onSale=true' : '/pages/contact'}>
            <Button size="large">{hasDiscounts ? 'Khám phá ưu đãi' : 'Tư vấn chọn xe'}</Button>
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
          <small>{product ? 'Tìm hiểu sản phẩm' : 'Khám phá từng cung đường'}</small>
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
  const [selectedCollection, setSelectedCollection] = useState('');
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [isHeroFocused, setIsHeroFocused] = useState(false);
  const [isHeroVisible, setIsHeroVisible] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(!document.hidden);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = (): void => setPrefersReducedMotion(media.matches);
    const updateVisibility = (): void => setIsDocumentVisible(!document.hidden);
    updatePreference();
    updateVisibility();
    media.addEventListener('change', updatePreference);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      media.removeEventListener('change', updatePreference);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsHeroVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25),
      { threshold: [0, 0.25] },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

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
            limit: 12,
            sort: ProductSort.NEWEST,
          }),
          productService.getPublicList({
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
                  limit: 12,
                  sort: ProductSort.NEWEST,
                })
              ).items,
            })),
          ),
        ]);

        if (!isMounted) {
          return;
        }

        setData({
          featured: featured.items,
          newest: newest.items,
          discounted: discounted.items,
          categorySections: categorySections.filter((section) => section.products.length),
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
    () => (data?.categorySections ?? []).slice(0, 6).map(({ category, products }) => ({
      ...category,
      imageUrl: products[0]?.thumbnail ?? category.imageUrl,
    })),
    [data?.categorySections],
  );
  const discoveryProducts = useMemo(() => {
    if (!data) return [];
    if (data.featured.length) return data.featured;
    const products = [
      ...data.categorySections.flatMap((section) => section.products.slice(0, 2)),
      ...data.newest,
    ];
    return [...new Map(products.map((product) => [product.id, product])).values()].slice(0, 12);
  }, [data]);
  const heroProduct = discoveryProducts.find((product) => product.productType === ProductType.BICYCLE)
    ?? discoveryProducts[0];
  const hasFeatured = Boolean(data?.featured.length);
  const activeCollection = data?.categorySections.find(
    (section) => section.category.slug === selectedCollection,
  ) ?? data?.categorySections[0];

  const clearRecentlyViewed = (): void => {
    clearRecentlyViewedProducts();
    setRecentlyViewed([]);
  };

  return (
    <main className="storefront-home">
      <div className="page-container home-hero-layout">
        <div className="home-hero-main" ref={heroRef}>
          {data?.sliders.length ? (
            <section
              className="home-slider-section"
              aria-label="Bộ sưu tập nổi bật"
              onFocusCapture={() => setIsHeroFocused(true)}
              onBlurCapture={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setIsHeroFocused(false);
              }}
            >
              <Carousel
                autoplay={!isHeroPaused && !isHeroFocused && isHeroVisible
                  && isDocumentVisible && !prefersReducedMotion && data.sliders.length > 1}
                autoplaySpeed={6000}
                speed={prefersReducedMotion ? 0 : 500}
                effect="fade"
                pauseOnHover
                pauseOnFocus
                dots={data.sliders.length > 1}
              >
                {data.sliders.map((banner) => (
                  <CmsHeroSlide key={banner.id} banner={banner} />
                ))}
              </Carousel>
              {data.sliders.length > 1 && !prefersReducedMotion ? (
                <Button
                  className="home-hero-pause"
                  shape="circle"
                  size="small"
                  icon={isHeroPaused ? <PlayCircleOutlined /> : <PauseOutlined />}
                  aria-label={isHeroPaused ? 'Tiếp tục chuyển banner' : 'Tạm dừng chuyển banner'}
                  onClick={() => {
                    // Explicit playback resumes even while this control keeps focus.
                    if (isHeroPaused) setIsHeroFocused(false);
                    setIsHeroPaused((paused) => !paused);
                  }}
                />
              ) : null}
            </section>
          ) : (
            <FallbackHero product={heroProduct} hasDiscounts={Boolean(data?.discounted.length)} />
          )}
        </div>
        <aside className="home-hero-discovery" aria-label="Gợi ý khám phá cửa hàng">
          <div className="home-hero-discovery-heading">
            <span className="home-discovery-icon"><CompassOutlined /></span>
            <Typography.Text className="section-eyebrow">BẠN MUỐN ĐI ĐÂU?</Typography.Text>
            <Typography.Title level={2}>Bắt đầu từ<br />phong cách của bạn.</Typography.Title>
            <Typography.Paragraph>Một chiếc xe phù hợp cho mỗi hành trình.</Typography.Paragraph>
          </div>
          <div className="home-hero-category-links">
            {showcaseCategories.slice(0, 3).map((category) => (
              <Link key={category.id} to={`/products?category=${category.slug}`}>
                <span>{category.name}</span><ArrowRightOutlined />
              </Link>
            ))}
            <Link to="/products" className="home-hero-all-products">
              <span>Khám phá tất cả</span><ArrowRightOutlined />
            </Link>
          </div>
          <Link to="/size-guide" className="home-hero-size-link">
            <span><small>VỪA VẶN HƠN, THOẢI MÁI HƠN</small><strong>Tìm size xe của bạn</strong></span>
            <ArrowRightOutlined />
          </Link>
        </aside>
      </div>

      <section className="store-service-strip">
        <div className="page-container">
          <Row gutter={[20, 16]}>
            <Col xs={24} sm={8}>
              <div className="store-service-item">
                <SafetyCertificateOutlined />
                <div>
                  <strong>Hiểu rõ chiếc xe bạn chọn</strong>
                  <span>Thông số chi tiết, giá bán rõ ràng</span>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="store-service-item">
                <ThunderboltOutlined />
                <div>
                  <strong>Đúng màu, đúng kích cỡ</strong>
                  <span>Đối chiếu phiên bản trước khi chọn xe</span>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className="store-service-item">
                <CheckCircleOutlined />
                <div>
                  <strong>Hỗ trợ chọn xe</strong>
                  <span>Theo nhu cầu, ngân sách và chiều cao</span>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

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

      {isLoading || data?.discounted.length ? <ProductSection
        eyebrow="THÊM NIỀM VUI, THÊM TIẾT KIỆM"
        title="Ưu đãi cho hành trình mới"
        description="Những chiếc xe và phụ kiện đang có giá tốt, sẵn sàng cùng bạn lên đường."
        products={data?.discounted ?? []}
        isLoading={isLoading}
        viewAllTo="/products?onSale=true"
        tone="deal"
        autoSlide
        autoplaySpeed={5000}
      /> : null}

      <ProductSection
        eyebrow="GỢI Ý TỪ XEDAP22H"
        title={hasFeatured ? 'Xe đạp & phụ kiện nổi bật' : 'Gợi ý khám phá'}
        description="Khám phá những mẫu xe và phụ kiện cho chuyến đi tiếp theo."
        products={discoveryProducts}
        isLoading={isLoading}
        viewAllTo={hasFeatured ? '/products?featured=true' : '/products'}
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

      {activeCollection ? (
        <ProductSection
          eyebrow="MỖI PHONG CÁCH, MỘT LỰA CHỌN"
          title="Tìm chất riêng trên từng cung đường"
          description="Chọn bộ sưu tập để khám phá những sản phẩm phù hợp với bạn."
          products={activeCollection.products}
          isLoading={isLoading}
          viewAllTo={`/products?category=${activeCollection.category.slug}`}
          filters={
            <div className="home-collection-filters" aria-label="Chọn bộ sưu tập sản phẩm">
              {data?.categorySections.map(({ category }) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={category.id === activeCollection.category.id}
                  onClick={() => setSelectedCollection(category.slug)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          }
          autoSlide
          autoplaySpeed={5000}
          spotlight={{
            imageUrl: activeCollection.products[0]?.thumbnail ?? activeCollection.category.imageUrl,
            title: activeCollection.category.name,
            description: 'Tìm người bạn đồng hành cho những trải nghiệm mới.',
            to: `/products?category=${activeCollection.category.slug}`,
          }}
        />
      ) : null}

      <RideMatchLauncher />

      <ProductSection
        eyebrow="VỪA CẬP NHẬT"
        title="Sản phẩm mới"
        description="Khám phá những mẫu xe và phụ kiện vừa có mặt tại cửa hàng."
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
          description="Quay lại những lựa chọn đã khiến bạn chú ý."
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
          <Typography.Text className="section-eyebrow">CHỌN SIZE, CHỌN SỰ THOẢI MÁI</Typography.Text>
          <Typography.Title level={2}>Chưa biết chọn size xe nào?</Typography.Title>
          <Typography.Paragraph>
            Chỉ cần chiều cao và loại xe, bạn sẽ có gợi ý kích cỡ để bắt đầu lựa chọn.
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
                Đối chiếu thông số, giá và từng phiên bản trước khi quyết định.
              </Typography.Paragraph>
            </article>
          </Col>
          <Col xs={24} md={8}>
            <article className="store-benefit-card">
              <ThunderboltOutlined className="feature-icon" />
              <Typography.Title level={4}>Tìm xe nhanh hơn</Typography.Title>
              <Typography.Paragraph>
                Dễ dàng thu hẹp lựa chọn theo loại xe, thương hiệu và ngân sách của bạn.
              </Typography.Paragraph>
            </article>
          </Col>
          <Col xs={24} md={8}>
            <article className="store-benefit-card">
              <CheckCircleOutlined className="feature-icon" />
              <Typography.Title level={4}>Vừa vặn với bạn</Typography.Title>
              <Typography.Paragraph>
                Tìm hiểu màu sắc, kích cỡ và xác nhận tồn kho trước khi đặt mua.
              </Typography.Paragraph>
            </article>
          </Col>
        </Row>
      </section>
    </main>
  );
};
