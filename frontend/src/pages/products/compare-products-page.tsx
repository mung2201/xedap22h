import { DeleteOutlined, SwapOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Image, Space, Spin, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../../api/services/product.service';
import { useCompareStore } from '../../stores/compare.store';
import type { Product, ProductSpecification } from '../../types/catalog';
import { bikeTypeLabels } from '../../types/catalog';
import { formatCurrency } from '../../utils/currency';

interface CompareRow {
  key: string;
  label: string;
  [productId: string]: ReactNode;
}

const toSpecificationKey = (specification: ProductSpecification): string =>
  `${specification.group ?? ''}::${specification.label}`;

const getSpecificationLabel = (specification: ProductSpecification): string =>
  specification.group ? `${specification.group} · ${specification.label}` : specification.label;

export const CompareProductsPage = () => {
  const items = useCompareStore((state) => state.items);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async (): Promise<void> => {
      if (!items.length) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const requests = await Promise.allSettled(
        items.map((item) => productService.getBySlug(item.slug)),
      );
      if (!isMounted) {
        return;
      }

      const fetchedProducts = requests.flatMap((request) =>
        request.status === 'fulfilled' ? [request.value] : [],
      );
      setProducts(fetchedProducts);
      setIsLoading(false);
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [items]);

  const rows = useMemo<CompareRow[]>(() => {
    const basicRows: CompareRow[] = [
      {
        key: 'price',
        label: 'Giá bán',
        ...Object.fromEntries(products.map((product) => [product.id, formatCurrency(product.salePrice)])),
      },
      {
        key: 'rating',
        label: 'Đánh giá',
        ...Object.fromEntries(
          products.map((product) => [
            product.id,
            product.reviewCount
              ? `${product.averageRating.toFixed(1)} / 5 (${product.reviewCount} đánh giá)`
              : 'Chưa có đánh giá',
          ]),
        ),
      },
      {
        key: 'stock',
        label: 'Tồn kho',
        ...Object.fromEntries(
          products.map((product) => [
            product.id,
            product.availableStock > 0 ? `Còn ${product.availableStock} xe` : 'Tạm hết hàng',
          ]),
        ),
      },
      {
        key: 'bikeType',
        label: 'Loại xe',
        ...Object.fromEntries(
          products.map((product) => [
            product.id,
            product.bikeType ? bikeTypeLabels[product.bikeType] : '—',
          ]),
        ),
      },
      {
        key: 'frameMaterial',
        label: 'Chất liệu khung',
        ...Object.fromEntries(products.map((product) => [product.id, product.frameMaterial ?? '—'])),
      },
      {
        key: 'wheelSize',
        label: 'Cỡ bánh',
        ...Object.fromEntries(products.map((product) => [product.id, product.wheelSize ?? '—'])),
      },
      {
        key: 'weight',
        label: 'Trọng lượng',
        ...Object.fromEntries(products.map((product) => [product.id, product.weight ?? '—'])),
      },
      {
        key: 'sizes',
        label: 'Kích cỡ có sẵn',
        ...Object.fromEntries(
          products.map((product) => [
            product.id,
            Array.from(new Set(product.variants.map((variant) => variant.size))).join(', ') || '—',
          ]),
        ),
      },
      {
        key: 'colors',
        label: 'Màu sắc',
        ...Object.fromEntries(
          products.map((product) => [
            product.id,
            Array.from(new Set(product.variants.map((variant) => variant.color))).join(', ') || '—',
          ]),
        ),
      },
    ];

    const specifications = Array.from(
      new Map(
        products.flatMap((product) =>
          product.specifications.map((specification) => [
            toSpecificationKey(specification),
            specification,
          ]),
        ),
      ).values(),
    );

    return [
      ...basicRows,
      ...specifications.map((specification) => ({
        key: `spec-${toSpecificationKey(specification)}`,
        label: getSpecificationLabel(specification),
        ...Object.fromEntries(
          products.map((product) => [
            product.id,
            product.specifications.find(
              (item) => toSpecificationKey(item) === toSpecificationKey(specification),
            )?.value ?? '—',
          ]),
        ),
      })),
    ];
  }, [products]);

  const columns = useMemo<ColumnsType<CompareRow>>(
    () => [
      {
        title: 'Tiêu chí',
        dataIndex: 'label',
        key: 'label',
        width: 190,
        fixed: 'left',
        render: (label: string) => <Typography.Text strong>{label}</Typography.Text>,
      },
      ...products.map((product) => ({
        title: (
          <div className="compare-product-column-heading">
            <Image preview={false} width={96} height={62} src={product.thumbnail} alt="" />
            <Link to={`/products/${product.slug}`}>{product.name}</Link>
            <Button
              type="link"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => remove(product.id)}
            >
              Bỏ xe
            </Button>
          </div>
        ),
        dataIndex: product.id,
        key: product.id,
        width: 270,
        render: (value: ReactNode) => <span className="compare-cell-value">{value}</span>,
      })),
    ],
    [products, remove],
  );

  return (
    <main className="compare-products-page page-container">
      <section className="compare-products-hero">
        <div>
          <Typography.Text className="section-eyebrow">Công cụ mua xe thông minh</Typography.Text>
          <Typography.Title level={1}>So sánh xe đạp</Typography.Title>
          <Typography.Paragraph>
            Đặt tối đa ba mẫu xe cạnh nhau để đối chiếu cấu hình, giá, kích cỡ và tồn kho
            trước khi quyết định.
          </Typography.Paragraph>
        </div>
        <SwapOutlined aria-hidden />
      </section>

      {isLoading ? (
        <Spin size="large" className="compare-products-loading" />
      ) : products.length ? (
        <Card
          className="compare-products-card"
          extra={
            <Space>
              <Typography.Text type="secondary">Đang so sánh {products.length}/3 xe</Typography.Text>
              <Button type="link" danger onClick={clear}>Xóa danh sách</Button>
            </Space>
          }
        >
          <Table<CompareRow>
            className="compare-products-table"
            rowKey="key"
            columns={columns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 760 }}
          />
        </Card>
      ) : (
        <Empty
          className="compare-products-empty"
          description="Chưa có xe nào trong danh sách so sánh"
        >
          <Link to="/products">
            <Button type="primary">Khám phá xe đạp</Button>
          </Link>
        </Empty>
      )}

      {items.length > products.length && !isLoading ? (
        <Alert
          className="compare-products-alert"
          type="warning"
          showIcon
          message="Một vài xe đã ngừng bán nên không thể hiển thị trong bảng so sánh."
        />
      ) : null}
    </main>
  );
};
