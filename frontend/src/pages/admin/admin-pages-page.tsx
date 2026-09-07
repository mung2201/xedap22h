import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { cmsService } from '../../api/services/cms.service';
import {
  StaticPageStatus,
  staticPageStatusLabels,
} from '../../types/cms';
import type {
  StaticPage,
  StaticPageListResult,
  StaticPagePayload,
} from '../../types/cms';
import { getErrorMessage } from '../../utils/error-message';

interface StaticPageFormValues {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  status: StaticPageStatus;
  seoTitle?: string;
  seoDescription?: string;
}

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const AdminPagesPage = () => {
  const [result, setResult] = useState<StaticPageListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState<string>();
  const [status, setStatus] = useState<StaticPageStatus>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [form] = Form.useForm<StaticPageFormValues>();

  const loadPages = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setResult(
        await cmsService.getAdminPages({
          page,
          limit: 10,
          ...(keyword ? { keyword } : {}),
          ...(status ? { status } : {}),
        }),
      );
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword, status]);

  useEffect(() => {
    void loadPages();
  }, [loadPages]);

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingPage(null);
    form.resetFields();
  };

  const openCreate = (): void => {
    setEditingPage(null);
    form.resetFields();
    form.setFieldsValue({ status: StaticPageStatus.DRAFT });
    setIsModalOpen(true);
  };

  const openEdit = (staticPage: StaticPage): void => {
    setEditingPage(staticPage);
    form.setFieldsValue({
      title: staticPage.title,
      slug: staticPage.slug,
      excerpt: staticPage.excerpt,
      content: staticPage.content,
      status: staticPage.status,
      seoTitle: staticPage.seoTitle,
      seoDescription: staticPage.seoDescription,
    });
    setIsModalOpen(true);
  };

  const toPayload = (
    values: StaticPageFormValues,
    clearOptionalValues: boolean,
  ): StaticPagePayload => {
    const excerpt = values.excerpt?.trim();
    const seoTitle = values.seoTitle?.trim();
    const seoDescription = values.seoDescription?.trim();

    return {
      title: values.title.trim(),
      ...(values.slug?.trim() ? { slug: values.slug.trim() } : {}),
      ...(excerpt
        ? { excerpt }
        : clearOptionalValues
          ? { excerpt: null }
          : {}),
      content: values.content.trim(),
      status: values.status,
      ...(seoTitle
        ? { seoTitle }
        : clearOptionalValues
          ? { seoTitle: null }
          : {}),
      ...(seoDescription
        ? { seoDescription }
        : clearOptionalValues
          ? { seoDescription: null }
          : {}),
    };
  };

  const savePage = async (values: StaticPageFormValues): Promise<void> => {
    setIsSaving(true);
    try {
      const payload = toPayload(values, Boolean(editingPage));
      if (editingPage) {
        await cmsService.updateStaticPage(editingPage.id, payload);
        message.success('Đã cập nhật trang nội dung.');
      } else {
        await cmsService.createStaticPage(payload);
        message.success('Đã tạo trang nội dung.');
      }
      closeModal();
      await loadPages();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const removePage = async (staticPage: StaticPage): Promise<void> => {
    try {
      await cmsService.removeStaticPage(staticPage.id);
      message.success('Đã xóa trang nội dung.');
      await loadPages();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<StaticPage> = [
    {
      title: 'Trang',
      key: 'page',
      render: (_, staticPage) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{staticPage.title}</Typography.Text>
          <Typography.Text type="secondary">/pages/{staticPage.slug}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Mô tả ngắn',
      dataIndex: 'excerpt',
      key: 'excerpt',
      render: (value?: string) =>
        value ? (
          <Typography.Text ellipsis={{ tooltip: value }}>{value}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: StaticPageStatus) => (
        <Tag color={value === StaticPageStatus.PUBLISHED ? 'green' : 'gold'}>
          {staticPageStatusLabels[value]}
        </Tag>
      ),
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      render: (_, staticPage) => (
        <Space>
          {staticPage.status === StaticPageStatus.PUBLISHED ? (
            <a href={`/pages/${staticPage.slug}`} target="_blank" rel="noreferrer">
              <Button type="link" icon={<EyeOutlined />}>Xem</Button>
            </a>
          ) : null}
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(staticPage)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa trang này?"
            description="Khách hàng sẽ không thể truy cập trang sau khi xóa."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void removePage(staticPage)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const pages = result?.items ?? [];
  const meta = result?.meta;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>Trang nội dung</Typography.Title>
          <Typography.Text type="secondary">
            Quản lý chính sách bảo hành, đổi trả, giới thiệu, liên hệ và các trang tĩnh khác.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm trang
        </Button>
      </div>

      <Space wrap className="admin-cms-filters">
        <Input.Search
          allowClear
          className="admin-cms-search"
          value={searchInput}
          placeholder="Tìm tiêu đề hoặc slug"
          enterButton={<SearchOutlined />}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setKeyword(value.trim() || undefined);
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="admin-cms-filter-select"
          value={status}
          placeholder="Tất cả trạng thái"
          options={Object.values(StaticPageStatus).map((value) => ({
            value,
            label: staticPageStatusLabels[value],
          }))}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={pages}
        pagination={false}
        scroll={{ x: 980 }}
      />
      {meta && (meta.totalPages ?? 1) > 1 ? (
        <Pagination
          className="admin-table-pagination"
          current={page}
          pageSize={10}
          total={meta.total}
          showSizeChanger={false}
          onChange={setPage}
        />
      ) : null}

      <Modal
        title={editingPage ? 'Cập nhật trang nội dung' : 'Thêm trang nội dung'}
        open={isModalOpen}
        footer={null}
        width={780}
        destroyOnHidden
        onCancel={closeModal}
      >
        <Form<StaticPageFormValues> form={form} layout="vertical" onFinish={savePage}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, min: 2, max: 180 }]}>
            <Input maxLength={180} />
          </Form.Item>
          <Form.Item name="slug" label="Slug (để trống để tự tạo từ tiêu đề)">
            <Input maxLength={180} placeholder="warranty-policy" />
          </Form.Item>
          <Form.Item name="excerpt" label="Mô tả ngắn">
            <Input.TextArea rows={2} maxLength={1000} />
          </Form.Item>
          <Form.Item
            name="content"
            label="Nội dung"
            extra="Nội dung dạng văn bản; xuống dòng sẽ được giữ nguyên ở trang khách hàng."
            rules={[{ required: true, whitespace: true, min: 1, max: 50_000 }]}
          >
            <Input.TextArea rows={11} maxLength={50_000} showCount />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
            <Select
              options={Object.values(StaticPageStatus).map((value) => ({
                value,
                label: staticPageStatusLabels[value],
              }))}
            />
          </Form.Item>
          <Form.Item name="seoTitle" label="SEO title">
            <Input maxLength={180} />
          </Form.Item>
          <Form.Item name="seoDescription" label="SEO description">
            <Input.TextArea rows={2} maxLength={320} />
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={closeModal}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu trang
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
