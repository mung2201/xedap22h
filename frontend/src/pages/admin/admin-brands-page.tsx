import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { brandService } from '../../api/services/brand.service';
import { ImageUploadField } from '../../components/common/image-upload-field';
import type { Brand, BrandPayload } from '../../types/catalog';
import { getErrorMessage } from '../../utils/error-message';

interface BrandFormValues extends BrandPayload {
  isActive: boolean;
}

export const AdminBrandsPage = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form] = Form.useForm<BrandFormValues>();

  const loadBrands = async (): Promise<void> => {
    setIsLoading(true);
    try {
      setBrands(await brandService.getAdminList());
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadBrands();
  }, []);

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingBrand(null);
    form.resetFields();
  };

  const openCreate = (): void => {
    setEditingBrand(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, sortOrder: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (brand: Brand): void => {
    setEditingBrand(brand);
    form.setFieldsValue({
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      logoUrl: brand.logoUrl,
      website: brand.website,
      isActive: brand.isActive,
      sortOrder: brand.sortOrder,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: BrandFormValues): Promise<void> => {
    setIsSaving(true);
    const description = values.description?.trim();
    const logoUrl = values.logoUrl?.trim();
    const website = values.website?.trim();
    const payload: BrandPayload = {
      name: values.name.trim(),
      slug: values.slug?.trim() || undefined,
      ...(description
        ? { description }
        : editingBrand
          ? { description: null }
          : {}),
      ...(logoUrl ? { logoUrl } : editingBrand ? { logoUrl: null } : {}),
      ...(website ? { website } : editingBrand ? { website: null } : {}),
      isActive: values.isActive,
      sortOrder: values.sortOrder ?? 0,
    };

    try {
      if (editingBrand) {
        await brandService.update(editingBrand.id, payload);
        message.success('Đã cập nhật thương hiệu.');
      } else {
        await brandService.create(payload);
        message.success('Đã tạo thương hiệu.');
      }
      closeModal();
      await loadBrands();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (brand: Brand): Promise<void> => {
    try {
      await brandService.remove(brand.id);
      message.success('Đã xóa thương hiệu.');
      await loadBrands();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<Brand> = [
    {
      title: 'Thương hiệu',
      key: 'name',
      render: (_, brand) => (
        <Space>
          {brand.logoUrl && <img src={brand.logoUrl} alt="" className="brand-logo-cell" />}
          <Typography.Text strong>{brand.name}</Typography.Text>
        </Space>
      ),
    },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: 90 },
    {
      title: 'Website',
      key: 'website',
      render: (_, brand) =>
        brand.website ? (
          <a href={brand.website} target="_blank" rel="noreferrer">
            Mở website
          </a>
        ) : (
          '—'
        ),
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      render: (_, brand) =>
        brand.isActive ? <Tag color="green">Hiển thị</Tag> : <Tag>Đã ẩn</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, brand) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(brand)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa thương hiệu này?"
            description="Chỉ xóa được khi thương hiệu không được gán cho sản phẩm."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void handleDelete(brand)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>Thương hiệu</Typography.Title>
          <Typography.Text type="secondary">
            Quản lý thương hiệu xe đạp và phụ kiện.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm thương hiệu
        </Button>
      </div>
      <Table rowKey="id" loading={isLoading} columns={columns} dataSource={brands} scroll={{ x: 760 }} />

      <Modal
        title={editingBrand ? 'Cập nhật thương hiệu' : 'Thêm thương hiệu'}
        open={isModalOpen}
        footer={null}
        destroyOnHidden
        onCancel={closeModal}
      >
        <Form<BrandFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên thương hiệu" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug (để trống để tự tạo)">
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="logoUrl" label="Logo URL">
            <ImageUploadField previewAlt="Logo thương hiệu" />
          </Form.Item>
          <Form.Item name="website" label="Website">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị" initialValue={0}>
            <InputNumber min={0} className="full-width" />
          </Form.Item>
          <Form.Item name="isActive" label="Hiển thị" valuePropName="checked" initialValue>
            <Switch />
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={closeModal}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu thương hiệu
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
