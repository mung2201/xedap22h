import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Empty, Skeleton, Space, Typography } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/catalog';
import { ProductCarousel } from './product-carousel';
import { ProductGrid } from './product-grid';

interface ProductSectionSpotlight {
  imageUrl?: string;
  title: string;
  description: string;
  to: string;
}

interface ProductSectionProps {
  title: string;
  description?: string;
  products: Product[];
  isLoading?: boolean;
  viewAllTo?: string;
  eyebrow?: string;
  tone?: 'default' | 'deal';
  campaignHighlights?: string[];
  autoSlide?: boolean;
  autoplaySpeed?: number;
  spotlight?: ProductSectionSpotlight;
  actions?: ReactNode;
}

export const ProductSection = ({
  title,
  description,
  products,
  isLoading = false,
  viewAllTo,
  eyebrow,
  tone = 'default',
  campaignHighlights,
  autoSlide = false,
  autoplaySpeed,
  spotlight,
  actions,
}: ProductSectionProps) => (
  <section className={`home-product-section home-product-section--${tone}`}>
    <div className="page-container">
      {tone === 'deal' && campaignHighlights?.length ? (
        <div className="deal-highlight-list" aria-label="Quyền lợi mua sắm">
          {campaignHighlights.map((highlight) => (
            <span key={highlight}>{highlight}</span>
          ))}
        </div>
      ) : null}
      <div className="section-heading">
        <div>
          {eyebrow ? <Typography.Text className="section-eyebrow">{eyebrow}</Typography.Text> : null}
          <Typography.Title level={2}>{title}</Typography.Title>
          {description && <Typography.Text type="secondary">{description}</Typography.Text>}
        </div>
        {(actions || viewAllTo) && (
          <div className="product-section-actions">
            {actions}
            {viewAllTo && (
              <Link to={viewAllTo}>
            <Button type="link" icon={<ArrowRightOutlined />} iconPosition="end">
              Xem tất cả
            </Button>
              </Link>
            )}
          </div>
        )}
      </div>
      {isLoading ? (
        <Space direction="vertical" className="full-width" size="large">
          <Skeleton active paragraph={{ rows: 8 }} />
        </Space>
      ) : products.length ? (
        autoSlide && spotlight ? (
          <div className="product-section-rail">
            <Link to={spotlight.to} className="product-section-spotlight">
              <div className="product-section-spotlight-media">
                {spotlight.imageUrl ? (
                  <img src={spotlight.imageUrl} alt={spotlight.title} />
                ) : null}
              </div>
              <div className="product-section-spotlight-copy">
                <Typography.Text>KHÁM PHÁ BỘ SƯU TẬP</Typography.Text>
                <Typography.Title level={4}>{spotlight.title}</Typography.Title>
                <Typography.Paragraph>{spotlight.description}</Typography.Paragraph>
                <span>
                  Xem sản phẩm <ArrowRightOutlined />
                </span>
              </div>
            </Link>
            <div className="product-section-rail-products">
              <ProductCarousel
                products={products}
                autoplaySpeed={autoplaySpeed}
                maxVisibleProductCount={3}
              />
            </div>
          </div>
        ) : autoSlide ? (
          <ProductCarousel products={products} autoplaySpeed={autoplaySpeed} />
        ) : (
          <ProductGrid products={products} />
        )
      ) : (
        <Empty description="Chưa có sản phẩm phù hợp" />
      )}
    </div>
  </section>
);
