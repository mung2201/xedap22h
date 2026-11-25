import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Image,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [searchValue, setSearchValue] = useState('');
  const [keyword, setKeyword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadSequence = useRef(0);

  const loadProducts = useCallback(async (): Promise<void> => {
    const sequence = ++loadSequence.current;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const nextResult = await productService.getAdminList({ page, limit: 10, status, keyword: keyword || undefined });
      if (sequence === loadSequence.current) setResult(nextResult);
    } catch (error) {
      if (sequence === loadSequence.current) {
        setErrorMessage(getErrorMessage(error));
        setResult(null);
      }
    } finally {
      if (sequence === loadSequence.current) setIsLoading(false);
    }
  }, [page, status, keyword]);

  useEffect(() => {
    void loadProducts();
    return () => { loadSequence.current += 1; };
  }, [loadProducts]);

  const columns: ColumnsType<Product> = [
    {
      title: 'Sản phẩm',
      key: 'product',
      render: (_, product) => (
        <Space>
          <Image
            width={52}
            height={52}
            preview={false}
            src={product.thumbnail || '/images/product-placeholder.svg'}
            fallback="/images/product-placeholder.svg"
            alt=""
          />
          <div>
            <Typography.Text strong>{product.name}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{product.sku}</Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Danh mục / Thương hiệu',
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
      title: 'Giá',
      key: 'salePrice',
      render: (_, product) => (
        <div>
          {formatCurrency(product.salePrice)}
          <br />
          <Typography.Text type="secondary">
            {product.catalogOnly ? 'Giá tham khảo' : 'Giá bán'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Tồn kho',
      key: 'availableStock',
      width: 150,
      render: (_, product) => product.catalogOnly ? 'Chưa xác nhận' : product.availableStock,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, product) => (
        <Tag color={statusColor[product.status]}>
          {product.catalogOnly && product.status === ProductStatus.ACTIVE
            ? 'Đang trưng bày'
            : productStatusLabels[product.status]}
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
        <Space wrap>
          <Input.Search
            aria-label="Tìm sản phẩm theo tên hoặc SKU"
            placeholder="Tên sản phẩm hoặc SKU"
            allowClear
            value={searchValue}
            style={{ width: 300, maxWidth: '100%' }}
            onChange={(event) => {
              const value = event.target.value;
              setSearchValue(value);
              if (!value) {
                setKeyword('');
                setPage(1);
              }
            }}
            onSearch={(value) => {
              setKeyword(value.trim());
              setPage(1);
            }}
          />
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
          <Button
            disabled={!status && !keyword && !searchValue}
            onClick={() => {
              setStatus(undefined);
              setSearchValue('');
              setKeyword('');
              setPage(1);
            }}
          >
            Xóa bộ lọc
          </Button>
        </Space>
      </div>
      {errorMessage ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải sản phẩm"
          description={errorMessage}
          action={<Button onClick={() => void loadProducts()}>Thử lại</Button>}
        />
      ) : (
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
      )}
    </section>
  );
};
