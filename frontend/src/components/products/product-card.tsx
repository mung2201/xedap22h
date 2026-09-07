import { ArrowRightOutlined, StarFilled, SwapOutlined } from '@ant-design/icons';
import { Button, Card, Space, Tag, Typography, message } from 'antd';
import { Link } from 'react-router-dom';
import { useCompareStore } from '../../stores/compare.store';
import { ProductType, type Product } from '../../types/catalog';
import { formatCurrency } from '../../utils/currency';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const addToCompare = useCompareStore((state) => state.add);

  const addComparison = (): void => {
    const result = addToCompare(product);
    const messages = {
      added: 'Đã thêm xe vào danh sách so sánh.',
      'already-added': 'Xe này đã có trong danh sách so sánh.',
      'limit-reached': 'Bạn chỉ có thể so sánh tối đa 3 xe.',
      unsupported: 'Chức năng so sánh hiện dành cho xe đạp.',
    } as const;
    if (result === 'added') {
      message.success(messages[result]);
      return;
    }

    message.info(messages[result]);
  };

  return (
    <Card
    className="product-card"
    cover={
      <div className="product-card-media">
        <Link to={`/products/${product.slug}`} className="product-card-image-link">
          <img src={product.thumbnail} alt={product.name} className="product-card-image" />
          <span className="product-card-image-overlay">
            Xem chi tiết <ArrowRightOutlined />
          </span>
        </Link>
        {product.discountPercent > 0 ? (
          <Tag color="blue" className="product-discount-tag">
            -{product.discountPercent}%
          </Tag>
        ) : null}
        {product.isOnSale ? <span className="product-card-deal-label">DEAL HOT</span> : null}
      </div>
    }
  >
    <Space direction="vertical" size={7} className="full-width">
      <div className="product-card-meta">
        <Typography.Text type="secondary" className="product-card-brand">
          {product.brand.name ?? 'Thương hiệu'}
        </Typography.Text>
        {product.productType === ProductType.BICYCLE ? <span>XE ĐẠP</span> : <span>PHỤ KIỆN</span>}
      </div>
      <Link to={`/products/${product.slug}`} className="product-card-name">
        {product.name}
      </Link>
      <div className="product-card-price-row">
        <Typography.Text strong className="product-sale-price">
          {formatCurrency(product.salePrice)}
        </Typography.Text>
        {product.isOnSale ? (
          <Typography.Text delete type="secondary" className="product-original-price">
            {formatCurrency(product.originalPrice)}
          </Typography.Text>
        ) : null}
      </div>
      <div className="product-card-footer">
        <Space size={4} className="product-card-rating">
          <StarFilled />
          <Typography.Text>
            {product.averageRating > 0 ? product.averageRating.toFixed(1) : 'Mới'}
          </Typography.Text>
          {product.reviewCount > 0 ? <Typography.Text>({product.reviewCount})</Typography.Text> : null}
        </Space>
        <Typography.Text type={product.availableStock > 0 ? 'secondary' : 'danger'}>
          {product.soldCount > 0
            ? `Đã bán ${product.soldCount}`
            : product.availableStock > 0
              ? 'Còn hàng'
              : 'Hết hàng'}
        </Typography.Text>
      </div>
      {product.productType === ProductType.BICYCLE ? (
        <Button
          type="link"
          size="small"
          className="product-card-compare-action"
          icon={<SwapOutlined />}
          onClick={addComparison}
        >
          So sánh xe
        </Button>
      ) : null}
    </Space>
  </Card>
  );
};
