import {
  ArrowLeftOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Typography,
  message,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { brandService } from '../../api/services/brand.service';
import { categoryService } from '../../api/services/category.service';
import { productService } from '../../api/services/product.service';
import { ImageUploadField } from '../../components/common/image-upload-field';
import type {
  Brand,
  CategoryTreeNode,
  ProductPayload,
} from '../../types/catalog';
import {
  BikeType,
  ProductStatus,
  ProductType,
  bikeTypeLabels,
  productStatusLabels,
} from '../../types/catalog';
import { getErrorMessage } from '../../utils/error-message';

const flattenCategories = (
  categories: CategoryTreeNode[],
  depth = 0,
): Array<{ value: string; label: string }> =>
  categories.flatMap((category) => [
    { value: category.id, label: `${'— '.repeat(depth)}${category.name}` },
    ...flattenCategories(category.children, depth + 1),
  ]);

const normalizeImageUrl = (value: string): string => {
  const url = value.trim();
  if (url.startsWith('/images/')) {
    return new URL(url, window.location.origin).href;
  }
  if (url.startsWith('/uploads/')) {
    const apiUrl = new URL(
      import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
      window.location.origin,
    );
    return new URL(url, apiUrl.origin).href;
  }
  return url;
};

const initialValues: Partial<ProductPayload> = {
  productType: ProductType.BICYCLE,
  status: ProductStatus.ACTIVE,
  featured: false,
  catalogOnly: false,
  images: [{ url: '', alt: '', sortOrder: 0 }],
  specifications: [],
  variants: [
    {
      color: 'Black',
      colorHex: '#111111',
      size: 'M',
      sku: '',
      stock: 0,
      priceAdjustment: 0,
    },
  ],
};

export const AdminProductFormPage = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm<ProductPayload>();
  const [categoryOptions, setCategoryOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadedProductKey, setLoadedProductKey] = useState<string | null>(null);
  const requestScopeRef = useRef(0);
  const savingRef = useRef(false);
  const savedVariantStocks = useRef<Record<string, number>>({});
  const productKey = productId ?? 'new';
  const productType = Form.useWatch('productType', form) ?? ProductType.BICYCLE;
  const catalogOnly = Form.useWatch('catalogOnly', form) ?? false;
  const isEditing = Boolean(productId);

  useEffect(() => {
    const requestScope = ++requestScopeRef.current;
    const isCurrent = () => requestScopeRef.current === requestScope;

    const load = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError(null);
      setLoadedProductKey(null);
      setIsSaving(false);
      savingRef.current = false;
      savedVariantStocks.current = {};
      form.resetFields();

      try {
        const [categoryTree, brandList, product] = await Promise.all([
          categoryService.getTree(),
          brandService.getPublicList(),
          productId ? productService.getAdminById(productId) : Promise.resolve(null),
        ]);

        if (!isCurrent()) {
          return;
        }

        setCategoryOptions(flattenCategories(categoryTree));
        setBrands(brandList);

        if (product) {
          savedVariantStocks.current = Object.fromEntries(
            product.variants.map((variant) => [variant.sku, variant.stock]),
          );
          form.setFieldsValue({
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            shortDescription: product.shortDescription,
            description: product.description,
            category: product.category.id,
            brand: product.brand.id,
            productType: product.productType,
            originalPrice: product.originalPrice,
            salePrice: product.salePrice,
            images: product.images.map((image) => ({
              url: image.url,
              alt: image.alt,
              sortOrder: image.sortOrder,
            })),
            thumbnail: product.thumbnail,
            status: product.status,
            catalogOnly: product.catalogOnly ?? false,
            featured: product.featured,
            bikeType: product.bikeType,
            frameMaterial: product.frameMaterial,
            wheelSize: product.wheelSize,
            weight: product.weight,
            specifications: product.specifications.map((specification) => ({
              label: specification.label,
              value: specification.value,
              group: specification.group,
            })),
            variants: product.variants.map((variant) => ({
              color: variant.color,
              colorHex: variant.colorHex,
              size: variant.size,
              sku: variant.sku,
              stock: product.catalogOnly ? undefined : variant.stock,
              priceAdjustment: variant.priceAdjustment,
              imageUrl: variant.imageUrl,
            })),
          });
        } else {
          form.setFieldsValue(initialValues);
        }
        setLoadedProductKey(productKey);
      } catch (error) {
        if (isCurrent()) {
          setLoadError(getErrorMessage(error));
        }
      } finally {
        if (isCurrent()) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      requestScopeRef.current += 1;
    };
  }, [form, loadAttempt, productId, productKey]);

  const handleSubmit = async (values: ProductPayload): Promise<void> => {
    if (savingRef.current || isLoading || loadError || loadedProductKey !== productKey) {
      return;
    }
    if (!values.catalogOnly && !values.variants?.length) {
      message.error('Sản phẩm cần có ít nhất một biến thể.');
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    const requestScope = requestScopeRef.current;
    const isCurrent = () => requestScopeRef.current === requestScope;

    try {
      const payload: ProductPayload = {
        ...values,
        name: values.name.trim(),
        slug: values.slug?.trim() || undefined,
        sku: values.sku.trim().toUpperCase(),
        shortDescription: values.shortDescription.trim(),
        description: values.description.trim(),
        thumbnail: normalizeImageUrl(values.thumbnail),
        images: values.images.map((image, index) => ({
          url: normalizeImageUrl(image.url),
          alt: image.alt?.trim() || undefined,
          sortOrder: image.sortOrder ?? index,
        })),
        specifications: (values.specifications ?? [])
          .filter((specification) => specification?.label?.trim() && specification?.value?.trim())
          .map((specification) => ({
            label: specification.label.trim(),
            value: specification.value.trim(),
            group: specification.group?.trim() || undefined,
          })),
        variants: (values.variants ?? []).map((variant) => ({
          color: variant.color?.trim() ?? '',
          colorHex: variant.colorHex?.trim() || undefined,
          size: variant.size?.trim() ?? '',
          sku: variant.sku.trim().toUpperCase(),
          stock: values.catalogOnly && variant.stock == null
            ? (savedVariantStocks.current[variant.sku] ?? 0)
            : Number(variant.stock),
          priceAdjustment: Number(variant.priceAdjustment ?? 0),
          imageUrl: variant.imageUrl ? normalizeImageUrl(variant.imageUrl) || undefined : undefined,
        })),
      };

      if (payload.productType === ProductType.ACCESSORY) {
        delete payload.bikeType;
        delete payload.frameMaterial;
        delete payload.wheelSize;
        delete payload.weight;
      }

      if (productId) {
        await productService.update(productId, payload);
      } else {
        await productService.create(payload);
      }
      if (isCurrent()) {
        message.success(productId ? 'Đã cập nhật sản phẩm.' : 'Đã tạo sản phẩm.');
        navigate('/admin/products');
      }
    } catch (error) {
      if (isCurrent()) {
        message.error(getErrorMessage(error));
      }
    } finally {
      if (isCurrent()) {
        savingRef.current = false;
        setIsSaving(false);
      }
    }
  };

  if (isLoading || (!loadError && loadedProductKey !== productKey)) {
    return (
      <div className="catalog-loading admin-form-loading">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <section className="admin-page admin-product-form-page">
      <div className="admin-page-heading">
        <div>
          <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/products')}>
            Quay lại danh sách
          </Button>
          <Typography.Title level={2}>
            {isEditing ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}
          </Typography.Title>
        </div>
      </div>

      {loadError ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải thông tin sản phẩm"
          description={loadError}
          action={<Button onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Thử lại</Button>}
        />
      ) : (
      <Form<ProductPayload>
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        disabled={isSaving}
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={16}>
            <Card title="Thông tin cơ bản">
              <Row gutter={16}>
                <Col xs={24} md={16}>
                  <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, min: 2 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="sku" label="SKU sản phẩm" rules={[{ required: true, min: 2 }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="slug" label="Slug (để trống để tự tạo)">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="productType" label="Loại sản phẩm" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: ProductType.BICYCLE, label: 'Xe đạp' },
                        { value: ProductType.ACCESSORY, label: 'Phụ kiện' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="category" label="Danh mục" rules={[{ required: true }]}>
                    <Select showSearch optionFilterProp="label" options={categoryOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="brand" label="Thương hiệu" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      optionFilterProp="label"
                      options={brands.map((brand) => ({ value: brand.id, label: brand.name }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="shortDescription"
                    label="Mô tả ngắn"
                    rules={[{ required: true, min: 10, max: 600 }]}
                  >
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="description"
                    label="Mô tả chi tiết"
                    rules={[{ required: true, min: 20 }]}
                  >
                    <Input.TextArea rows={6} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {productType === ProductType.BICYCLE && (
              <Card title="Thông tin xe đạp" className="admin-form-card">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="bikeType" label="Loại xe" rules={[{ required: !catalogOnly }]}>
                      <Select
                        options={Object.values(BikeType).map((type) => ({
                          value: type,
                          label: bikeTypeLabels[type],
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="frameMaterial" label="Chất liệu khung" rules={[{ required: !catalogOnly, whitespace: true }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="wheelSize" label="Cỡ bánh" rules={[{ required: !catalogOnly, whitespace: true }]}>
                      <Input placeholder="Ví dụ: 29 inch" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="weight" label="Trọng lượng" rules={[{ required: !catalogOnly, whitespace: true }]}>
                      <Input placeholder="Ví dụ: 13.5 kg" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            )}

            <Card title="Thông số kỹ thuật" className="admin-form-card">
              <Form.List name="specifications">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" size="middle" className="full-width">
                    {fields.map((field) => (
                      <Row key={field.key} gutter={12} align="middle">
                        <Col xs={24} md={6}>
                          <Form.Item name={[field.name, 'group']} label="Nhóm">
                            <Input placeholder="Ví dụ: Truyền động" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={7}>
                          <Form.Item name={[field.name, 'label']} label="Tên thông số">
                            <Input placeholder="Ví dụ: Groupset" />
                          </Form.Item>
                        </Col>
                        <Col xs={20} md={9}>
                          <Form.Item name={[field.name, 'value']} label="Giá trị">
                            <Input placeholder="Ví dụ: Shimano Deore" />
                          </Form.Item>
                        </Col>
                        <Col xs={4} md={2} className="form-list-remove-col">
                          <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)} />
                        </Col>
                      </Row>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                      Thêm thông số
                    </Button>
                  </Space>
                )}
              </Form.List>
            </Card>

            <Card title="Biến thể, màu sắc và tồn kho" className="admin-form-card">
              {catalogOnly ? (
                <Alert
                  type="info"
                  showIcon
                  message="Tồn kho chưa xác nhận"
                  description="Sản phẩm chỉ trưng bày. Khi mở bán, hãy nhập tồn kho thực tế, màu và kích cỡ cho từng biến thể."
                  style={{ marginBottom: 16 }}
                />
              ) : null}
              <Form.List name="variants">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" size="middle" className="full-width">
                    {fields.map((field, index) => (
                      <Card key={field.key} size="small" title={`Biến thể ${index + 1}`}>
                        <Row gutter={12}>
                          <Col xs={24} md={6}>
                            <Form.Item name={[field.name, 'color']} label="Màu" rules={[{ required: !catalogOnly, whitespace: true }]}>
                              <Input placeholder="Chưa cập nhật" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name={[field.name, 'colorHex']} label="Mã màu">
                              <Input placeholder="#111111" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name={[field.name, 'size']} label="Size" rules={[{ required: !catalogOnly, whitespace: true }]}>
                              <Input placeholder="Chưa cập nhật" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={6}>
                            <Form.Item name={[field.name, 'sku']} label="SKU variant" rules={[{ required: true }]}>
                              <Input />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={8}>
                            <Form.Item
                              name={[field.name, 'stock']}
                              label="Tồn kho"
                              rules={catalogOnly ? [] : [{ required: true, type: 'integer', min: 0, message: 'Nhập tồn kho thực tế bằng số nguyên không âm.' }]}
                            >
                              <InputNumber
                                min={0}
                                precision={0}
                                className="full-width"
                                disabled={catalogOnly}
                                placeholder={catalogOnly ? 'Chưa xác nhận' : 'Nhập tồn kho thực tế'}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={8}>
                            <Form.Item name={[field.name, 'priceAdjustment']} label="Điều chỉnh giá">
                              <InputNumber precision={0} className="full-width" />
                            </Form.Item>
                          </Col>
                          <Col xs={20} md={6}>
                            <Form.Item name={[field.name, 'imageUrl']} label="Ảnh variant">
                              <ImageUploadField previewAlt="Ảnh variant" />
                            </Form.Item>
                          </Col>
                          <Col xs={4} md={2} className="form-list-remove-col">
                            <Button
                              danger
                              type="text"
                              icon={<DeleteOutlined />}
                              disabled={isSaving || (!catalogOnly && fields.length === 1)}
                              onClick={() => remove(field.name)}
                            />
                          </Col>
                        </Row>
                      </Card>
                    ))}
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() =>
                        add({ color: '', size: '', stock: undefined, priceAdjustment: 0 })
                      }
                    >
                      Thêm biến thể
                    </Button>
                  </Space>
                )}
              </Form.List>
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Card title="Giá và trạng thái">
              <Form.Item name="catalogOnly" label="Chỉ trưng bày (chưa mở bán)" valuePropName="checked">
                <Switch />
              </Form.Item>
              {catalogOnly ? (
                <Typography.Paragraph type="secondary">
                  Khách có thể xem sản phẩm và liên hệ tư vấn. Giá hiển thị là giá tham khảo.
                </Typography.Paragraph>
              ) : null}
              <Form.Item name="originalPrice" label="Giá gốc (VND)" rules={[{ required: true }]}>
                <InputNumber min={0} precision={0} className="full-width" />
              </Form.Item>
              <Form.Item name="salePrice" label={catalogOnly ? 'Giá tham khảo (VND)' : 'Giá bán (VND)'} rules={[{ required: true }]}>
                <InputNumber min={0} precision={0} className="full-width" />
              </Form.Item>
              <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
                <Select
                  options={Object.values(ProductStatus).map((status) => ({
                    value: status,
                    label: catalogOnly && status === ProductStatus.ACTIVE ? 'Đang trưng bày' : productStatusLabels[status],
                  }))}
                />
              </Form.Item>
              <Form.Item name="featured" label="Sản phẩm nổi bật" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>

            <Card title="Hình ảnh" className="admin-form-card">
              <Form.Item name="thumbnail" label="Thumbnail URL" rules={[{ required: true }]}>
                <ImageUploadField previewAlt="Thumbnail sản phẩm" />
              </Form.Item>
              <Form.List name="images">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" className="full-width">
                    {fields.map((field) => (
                      <Card key={field.key} size="small">
                        <Form.Item name={[field.name, 'url']} label="Image URL" rules={[{ required: true }]}>
                          <ImageUploadField previewAlt="Ảnh sản phẩm" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'alt']} label="Alt text">
                          <Input />
                        </Form.Item>
                        <Form.Item name={[field.name, 'sortOrder']} label="Thứ tự">
                          <InputNumber min={0} precision={0} className="full-width" />
                        </Form.Item>
                        <Button
                          danger
                          type="text"
                          icon={<DeleteOutlined />}
                          disabled={isSaving || fields.length === 1}
                          onClick={() => remove(field.name)}
                        >
                          Xóa ảnh
                        </Button>
                      </Card>
                    ))}
                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ sortOrder: fields.length })}>
                      Thêm ảnh
                    </Button>
                  </Space>
                )}
              </Form.List>
            </Card>
          </Col>
        </Row>
        <div className="admin-form-actions">
          <Space>
            <Button onClick={() => navigate('/admin/products')}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={isSaving}>
              {isEditing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
            </Button>
          </Space>
        </div>
      </Form>
      )}
    </section>
  );
};
