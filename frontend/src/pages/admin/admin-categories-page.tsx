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
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { categoryService } from '../../api/services/category.service';
import { ImageUploadField } from '../../components/common/image-upload-field';
import type { Category, CategoryPayload } from '../../types/catalog';
import { getErrorMessage } from '../../utils/error-message';

interface CategoryFormValues extends CategoryPayload {
  isActive: boolean;
  sortOrder: number;
}

export const AdminCategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm<CategoryFormValues>();

  const loadCategories = async (): Promise<void> => {
    setIsLoading(true);
    try {
      setCategories(await categoryService.getAdminList());
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingCategory(null);
    form.resetFields();
  };

  const openCreate = (): void => {
    setEditingCategory(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, sortOrder: 0 });
    setIsModalOpen(true);
  };

  const openEdit = (category: Category): void => {
    setEditingCategory(category);
    form.setFieldsValue({
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      parentCategory: category.parentCategory,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: CategoryFormValues): Promise<void> => {
    setIsSaving(true);
    const description = values.description?.trim();
    const imageUrl = values.imageUrl?.trim();
    const payload: CategoryPayload = {
      name: values.name.trim(),
      slug: values.slug?.trim() || undefined,
      ...(description
        ? { description }
        : editingCategory
          ? { description: null }
          : {}),
      ...(imageUrl ? { imageUrl } : editingCategory ? { imageUrl: null } : {}),
      parentCategory: values.parentCategory ?? null,
      isActive: values.isActive,
      sortOrder: values.sortOrder,
    };

    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, payload);
        message.success('Đã cập nhật danh mục.');
      } else {
        await categoryService.create(payload);
        message.success('Đã tạo danh mục.');
      }
      closeModal();
      await loadCategories();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: Category): Promise<void> => {
    try {
      await categoryService.remove(category.id);
      message.success('Đã xóa danh mục.');
      await loadCategories();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<Category> = [
    { title: 'Tên', dataIndex: 'name', key: 'name' },
    { title: 'Slug', dataIndex: 'slug', key: 'slug' },
    {
      title: 'Danh mục cha',
      key: 'parentCategory',
      render: (_, category) =>
        category.parentCategory
          ? (categoryNames.get(category.parentCategory) ?? category.parentCategory)
          : 'Danh mục gốc',
    },
    { title: 'Thứ tự', dataIndex: 'sortOrder', key: 'sortOrder', width: 90 },
    {
      title: 'Trạng thái',
      key: 'isActive',
      render: (_, category) =>
        category.isActive ? <Tag color="green">Hiển thị</Tag> : <Tag>Đã ẩn</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, category) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(category)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa danh mục này?"
            description="Chỉ xóa được khi danh mục không có sản phẩm hoặc danh mục con."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void handleDelete(category)}
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
          <Typography.Title level={2}>Danh mục</Typography.Title>
          <Typography.Text type="secondary">
            Tạo danh mục nhiều cấp cho xe đạp và phụ kiện.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm danh mục
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={categories}
        scroll={{ x: 820 }}
      />

      <Modal
        title={editingCategory ? 'Cập nhật danh mục' : 'Thêm danh mục'}
        open={isModalOpen}
        footer={null}
        destroyOnHidden
        onCancel={closeModal}
      >
        <Form<CategoryFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="slug" label="Slug (để trống để tự tạo)">
            <Input />
          </Form.Item>
          <Form.Item name="parentCategory" label="Danh mục cha">
            <Select
              allowClear
              placeholder="Không có - danh mục gốc"
              options={categories
                .filter((category) => category.id !== editingCategory?.id)
                .map((category) => ({ value: category.id, label: category.name }))}
            />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="imageUrl" label="Image URL">
            <ImageUploadField previewAlt="Ảnh danh mục" />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}>
            <InputNumber min={0} className="full-width" />
          </Form.Item>
          <Form.Item name="isActive" label="Hiển thị" valuePropName="checked" initialValue>
            <Switch />
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={closeModal}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu danh mục
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
