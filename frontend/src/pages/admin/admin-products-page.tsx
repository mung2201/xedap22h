import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Image,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../../api/services/product.service';
import type { Product, ProductListResult } from '../../types/catalog';
import { ProductStatus, productStatusLabels } from '../../types/catalog';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

const statusColor: Record<ProductStatus, string> = {
  [ProductStatus.ACTIVE]: 'green',
  [ProductStatus.INACTIVE]: 'default',
  [ProductStatus.DISCONTINUED]: 'red',
};

export const AdminProductsPage = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<ProductListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ProductStatus | undefined>();

  const loadProducts = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setResult(await productService.getAdminList({ page, limit: 10, status }));
    } catch (error) {
      message.error(getErrorMessage(error));
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const columns: ColumnsType<Product> = [
    {
      title: 'Sản phẩm',
      key: 'product',
      render: (_, product) => (
        <Space>
          <Image width={52} height={52} preview={false} src={product.thumbnail} alt="" />
          <div>
            <Typography.Text strong>{product.name}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{product.sku}</Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Danh mục / Brand',
      key: 'catalog',
      render: (_, product) => (
        <>
          {product.category.name ?? '—'}
          <br />
          <Typography.Text type="secondary">{product.brand.name ?? '—'}</Typography.Text>
        </>
      ),
    },
    {
      title: 'Giá bán',
      key: 'salePrice',
      render: (_, product) => formatCurrency(product.salePrice),
    },
    { title: 'Tồn kho', dataIndex: 'availableStock', key: 'availableStock', width: 90 },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, product) => (
        <Tag color={statusColor[product.status]}>
          {productStatusLabels[product.status]}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, product) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => navigate(`/admin/products/${product.id}/edit`)}
        >
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>Sản phẩm</Typography.Title>
          <Typography.Text type="secondary">
            Quản lý giá, tồn kho theo biến thể, hình ảnh và thông số kỹ thuật.
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/admin/products/create')}
        >
          Thêm sản phẩm
        </Button>
      </div>
      <div className="admin-toolbar">
        <Select
          allowClear
          value={status}
          placeholder="Lọc trạng thái"
          style={{ minWidth: 200 }}
          options={Object.values(ProductStatus).map((item) => ({
            value: item,
            label: productStatusLabels[item],
          }))}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </div>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={result?.items ?? []}
        scroll={{ x: 900 }}
        pagination={{
          current: result?.meta.page ?? page,
          pageSize: result?.meta.limit ?? 10,
          total: result?.meta.total ?? 0,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
    </section>
  );
};
