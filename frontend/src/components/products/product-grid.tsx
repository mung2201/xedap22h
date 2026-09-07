import { Col, Row } from 'antd';
import type { Product } from '../../types/catalog';
import { ProductCard } from './product-card';

interface ProductGridProps {
  products: Product[];
}

export const ProductGrid = ({ products }: ProductGridProps) => (
  <Row gutter={[20, 24]}>
    {products.map((product) => (
      <Col key={product.id} xs={12} sm={12} lg={8} xl={6}>
        <ProductCard product={product} />
      </Col>
    ))}
  </Row>
);
