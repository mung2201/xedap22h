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
  Image,
  Input,
  InputNumber,
  Modal,
  Pagination,
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
import { useCallback, useEffect, useState } from 'react';
import { cmsService } from '../../api/services/cms.service';
import { ImageUploadField } from '../../components/common/image-upload-field';
import {
  CmsBannerPosition,
  CmsBannerType,
  cmsBannerPositionLabels,
  cmsBannerTypeLabels,
} from '../../types/cms';
import type {
  CmsBanner,
  CmsBannerListResult,
  CmsBannerPayload,
} from '../../types/cms';
import { getErrorMessage } from '../../utils/error-message';

interface BannerFormValues {
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  link?: string;
  buttonLabel?: string;
  openInNewTab: boolean;
  type: CmsBannerType;
  position: CmsBannerPosition;
  sortOrder: number;
  active: boolean;
  startDate?: string;
  endDate?: string;
}

const toLocalDateTime = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

const toIsoDate = (value?: string): string | undefined =>
  value ? new Date(value).toISOString() : undefined;

const formatDateTime = (value?: string): string =>
  value
    ? new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : 'Không giới hạn';

export const AdminBannersPage = () => {
  const [result, setResult] = useState<CmsBannerListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState<string>();
  const [type, setType] = useState<CmsBannerType>();
  const [active, setActive] = useState<boolean>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<CmsBanner | null>(null);
  const [form] = Form.useForm<BannerFormValues>();

  const loadBanners = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setResult(
        await cmsService.getAdminBanners({
          page,
          limit: 10,
          ...(keyword ? { keyword } : {}),
          ...(type ? { type } : {}),
          ...(active !== undefined ? { active } : {}),
        }),
      );
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword, type, active]);

  useEffect(() => {
    void loadBanners();
  }, [loadBanners]);

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingBanner(null);
    form.resetFields();
  };

  const openCreate = (): void => {
    setEditingBanner(null);
    form.resetFields();
    form.setFieldsValue({
      type: CmsBannerType.SLIDER,
      position: CmsBannerPosition.HOME_HERO,
      sortOrder: 0,
      active: true,
      openInNewTab: false,
    });
    setIsModalOpen(true);
  };

  const openEdit = (banner: CmsBanner): void => {
    setEditingBanner(banner);
    form.setFieldsValue({
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.imageUrl,
      mobileImageUrl: banner.mobileImageUrl,
      link: banner.link,
      buttonLabel: banner.buttonLabel,
      openInNewTab: banner.openInNewTab,
      type: banner.type,
      position: banner.position,
      sortOrder: banner.sortOrder,
      active: banner.active,
      startDate: toLocalDateTime(banner.startDate),
      endDate: toLocalDateTime(banner.endDate),
    });
    setIsModalOpen(true);
  };

  const toPayload = (
    values: BannerFormValues,
    clearOptionalValues: boolean,
  ): CmsBannerPayload => {
    const subtitle = values.subtitle?.trim();
    const mobileImageUrl = values.mobileImageUrl?.trim();
    const link = values.link?.trim();
    const buttonLabel = values.buttonLabel?.trim();
    const startDate = toIsoDate(values.startDate);
    const endDate = toIsoDate(values.endDate);

    return {
      title: values.title.trim(),
      ...(subtitle
        ? { subtitle }
        : clearOptionalValues
          ? { subtitle: null }
          : {}),
      imageUrl: values.imageUrl.trim(),
      ...(mobileImageUrl
        ? { mobileImageUrl }
        : clearOptionalValues
          ? { mobileImageUrl: null }
          : {}),
      ...(link ? { link } : clearOptionalValues ? { link: null } : {}),
      ...(buttonLabel
        ? { buttonLabel }
        : clearOptionalValues
          ? { buttonLabel: null }
          : {}),
      openInNewTab: values.openInNewTab,
      type: values.type,
      position: values.position,
      sortOrder: values.sortOrder ?? 0,
      active: values.active,
      ...(startDate
        ? { startDate }
        : clearOptionalValues
          ? { startDate: null }
          : {}),
      ...(endDate
        ? { endDate }
        : clearOptionalValues
          ? { endDate: null }
          : {}),
    };
  };

  const saveBanner = async (values: BannerFormValues): Promise<void> => {
    const startDate = toIsoDate(values.startDate);
    const endDate = toIsoDate(values.endDate);
    if (startDate && endDate && startDate >= endDate) {
      form.setFields([
        { name: 'endDate', errors: ['Thời điểm kết thúc phải sau thời điểm bắt đầu.'] },
      ]);
      return;
    }

    setIsSaving(true);
    try {
      const payload = toPayload(values, Boolean(editingBanner));
      if (editingBanner) {
        await cmsService.updateBanner(editingBanner.id, payload);
        message.success('Đã cập nhật nội dung hiển thị.');
      } else {
        await cmsService.createBanner(payload);
        message.success('Đã tạo nội dung hiển thị.');
      }
      closeModal();
      await loadBanners();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const removeBanner = async (banner: CmsBanner): Promise<void> => {
    try {
      await cmsService.removeBanner(banner.id);
      message.success('Đã xóa nội dung hiển thị.');
      await loadBanners();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<CmsBanner> = [
    {
      title: 'Hình ảnh',
      dataIndex: 'imageUrl',
      key: 'imageUrl',
      width: 120,
      render: (imageUrl: string, banner) => (
        <Image width={96} height={54} src={imageUrl} alt={banner.title} preview />
      ),
    },
    {
      title: 'Nội dung',
      key: 'content',
      render: (_, banner) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{banner.title}</Typography.Text>
          {banner.subtitle ? (
            <Typography.Text type="secondary" ellipsis={{ tooltip: banner.subtitle }}>
              {banner.subtitle}
            </Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Loại / vị trí',
      key: 'placement',
      render: (_, banner) => (
        <Space direction="vertical" size={2}>
          <Tag color={banner.type === CmsBannerType.SLIDER ? 'blue' : 'purple'}>
            {cmsBannerTypeLabels[banner.type]}
          </Tag>
          <Typography.Text type="secondary">
            {cmsBannerPositionLabels[banner.position]}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 90,
    },
    {
      title: 'Lịch hiển thị',
      key: 'schedule',
      render: (_, banner) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{formatDateTime(banner.startDate)}</Typography.Text>
          <Typography.Text type="secondary">đến {formatDateTime(banner.endDate)}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      key: 'active',
      render: (value: boolean) =>
        value ? <Tag color="green">Đang bật</Tag> : <Tag>Đã tắt</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      render: (_, banner) => (
        <Space>
          {banner.link ? (
            <a href={banner.link} target="_blank" rel="noreferrer">
              <Button type="link" icon={<EyeOutlined />}>Xem</Button>
            </a>
          ) : null}
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(banner)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa nội dung này?"
            description="Nội dung sẽ không còn hiển thị trên website."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void removeBanner(banner)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const banners = result?.items ?? [];
  const meta = result?.meta;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>Banner & Slider</Typography.Title>
          <Typography.Text type="secondary">
            Quản lý slider hero và banner khuyến mãi hiển thị trên trang khách hàng.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm nội dung
        </Button>
      </div>

      <Space wrap className="admin-cms-filters">
        <Input.Search
          allowClear
          className="admin-cms-search"
          value={searchInput}
          placeholder="Tìm tiêu đề hoặc mô tả"
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
          value={type}
          placeholder="Tất cả loại"
          options={Object.values(CmsBannerType).map((value) => ({
            value,
            label: cmsBannerTypeLabels[value],
          }))}
          onChange={(value) => {
            setType(value);
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="admin-cms-filter-select"
          value={active}
          placeholder="Tất cả trạng thái"
          options={[
            { value: true, label: 'Đang bật' },
            { value: false, label: 'Đã tắt' },
          ]}
          onChange={(value) => {
            setActive(value);
            setPage(1);
          }}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={banners}
        pagination={false}
        scroll={{ x: 1180 }}
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
        title={editingBanner ? 'Cập nhật Banner / Slider' : 'Thêm Banner / Slider'}
        open={isModalOpen}
        footer={null}
        width={760}
        destroyOnHidden
        onCancel={closeModal}
      >
        <Form<BannerFormValues> form={form} layout="vertical" onFinish={saveBanner}>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, min: 2, max: 160 }]}>
            <Input maxLength={160} />
          </Form.Item>
          <Form.Item name="subtitle" label="Mô tả ngắn">
            <Input.TextArea rows={2} maxLength={360} />
          </Form.Item>
          <Form.Item name="imageUrl" label="Image URL" rules={[{ required: true, type: 'url' }]}>
            <ImageUploadField previewAlt="Ảnh banner" />
          </Form.Item>
          <Form.Item name="mobileImageUrl" label="Mobile image URL">
            <ImageUploadField previewAlt="Ảnh banner trên điện thoại" />
          </Form.Item>
          <Form.Item name="link" label="Link điều hướng">
            <Input placeholder="/products?onSale=true hoặc https://..." />
          </Form.Item>
          <Form.Item name="buttonLabel" label="Nhãn nút">
            <Input maxLength={48} placeholder="Ví dụ: Khám phá ngay" />
          </Form.Item>
          <Form.Item name="type" label="Loại hiển thị" rules={[{ required: true }]}>
            <Select
              options={Object.values(CmsBannerType).map((value) => ({
                value,
                label: cmsBannerTypeLabels[value],
              }))}
            />
          </Form.Item>
          <Form.Item name="position" label="Vị trí" rules={[{ required: true }]}>
            <Select
              options={Object.values(CmsBannerPosition).map((value) => ({
                value,
                label: cmsBannerPositionLabels[value],
              }))}
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị">
            <InputNumber min={0} max={10_000} className="full-width" />
          </Form.Item>
          <Form.Item name="startDate" label="Bắt đầu hiển thị">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="endDate" label="Kết thúc hiển thị">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="active" label="Kích hoạt" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="openInNewTab" label="Mở link ở tab mới" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={closeModal}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu nội dung
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
