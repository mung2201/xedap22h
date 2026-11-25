import { ArrowRightOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { Link } from 'react-router-dom';
import type { Category } from '../../types/catalog';

interface CategoryCardProps {
  category: Category;
}

export const CategoryCard = ({ category }: CategoryCardProps) => (
  <Link to={`/products?category=${category.slug}`} className="category-card">
    <div className="category-card-media">
      {category.imageUrl ? (
        <img
          src={category.imageUrl}
          alt=""
          className="category-card-image"
          loading="lazy"
          decoding="async"
          width={320}
          height={220}
        />
      ) : (
        <div className="category-card-placeholder" aria-hidden="true">
          <AppstoreOutlined />
        </div>
      )}
    </div>
    <div className="category-card-content">
      <div>
        <Typography.Text strong>{category.name}</Typography.Text>
        <Typography.Text type="secondary">Khám phá ngay</Typography.Text>
      </div>
      <ArrowRightOutlined />
    </div>
  </Link>
);
