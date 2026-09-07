import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Button,
  Form,
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
import { voucherService } from '../../api/services/voucher.service';
import {
  VoucherDiscountType,
  voucherDiscountTypeLabels,
} from '../../types/voucher';
import type {
  Voucher,
  VoucherListResult,
  VoucherPayload,
} from '../../types/voucher';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

interface VoucherFormValues {
  code: string;
  name: string;
  description?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscount?: number | null;
  minOrderValue?: number;
  startDate: string;
  endDate: string;
  usageLimit?: number | null;
  active: boolean;
}

const toDateTimeLocalValue = (value: string): string => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatVoucherValue = (voucher: Voucher): string =>
  voucher.discountType === VoucherDiscountType.PERCENT
    ? `${voucher.discountValue}%${
        voucher.maxDiscount !== undefined
          ? ` (tối đa ${formatCurrency(voucher.maxDiscount)})`
          : ''
      }`
    : formatCurrency(voucher.discountValue);

export const AdminVouchersPage = () => {
  const [result, setResult] = useState<VoucherListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState<string>();
  const [active, setActive] = useState<boolean>();
  const [form] = Form.useForm<VoucherFormValues>();

  const loadVouchers = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      setResult(
        await voucherService.getAdminList({
          page,
          limit: 10,
          ...(keyword ? { keyword } : {}),
          ...(active === undefined ? {} : { active }),
        }),
      );
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword, active]);

  useEffect(() => {
    void loadVouchers();
  }, [loadVouchers]);

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingVoucher(null);
    form.resetFields();
  };

  const openCreate = (): void => {
    setEditingVoucher(null);
    form.resetFields();
    form.setFieldsValue({
      discountType: VoucherDiscountType.PERCENT,
      minOrderValue: 0,
      active: true,
      startDate: toDateTimeLocalValue(new Date().toISOString()),
      endDate: toDateTimeLocalValue(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ),
    });
    setIsModalOpen(true);
  };

  const openEdit = (voucher: Voucher): void => {
    setEditingVoucher(voucher);
    form.setFieldsValue({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscount: voucher.maxDiscount,
      minOrderValue: voucher.minOrderValue,
      startDate: toDateTimeLocalValue(voucher.startDate),
      endDate: toDateTimeLocalValue(voucher.endDate),
      usageLimit: voucher.usageLimit,
      active: voucher.active,
    });
    setIsModalOpen(true);
  };

  const toPayload = (
    values: VoucherFormValues,
    clearOptionalValues: boolean,
  ): VoucherPayload => {
    const description = values.description?.trim();
    const maxDiscount = values.maxDiscount ?? undefined;
    const usageLimit = values.usageLimit ?? undefined;

    return {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      ...(description
        ? { description }
        : clearOptionalValues
          ? { description: null }
          : {}),
      discountType: values.discountType,
      discountValue: values.discountValue,
      ...(maxDiscount !== undefined
        ? { maxDiscount }
        : clearOptionalValues
          ? { maxDiscount: null }
          : {}),
      minOrderValue: values.minOrderValue ?? 0,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      ...(usageLimit !== undefined
        ? { usageLimit }
        : clearOptionalValues
          ? { usageLimit: null }
          : {}),
      active: values.active,
    };
  };

  const handleSubmit = async (values: VoucherFormValues): Promise<void> => {
    if (new Date(values.startDate) >= new Date(values.endDate)) {
      form.setFields([
        {
          name: 'endDate',
          errors: ['Thời điểm kết thúc phải sau thời điểm bắt đầu.'],
        },
      ]);
      return;
    }

    setIsSaving(true);

    try {
      const payload = toPayload(values, Boolean(editingVoucher));
      if (editingVoucher) {
        await voucherService.update(editingVoucher.id, payload);
        message.success('Đã cập nhật voucher.');
      } else {
        await voucherService.create(payload);
        message.success('Đã tạo voucher.');
      }
      closeModal();
      await loadVouchers();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const removeVoucher = async (voucher: Voucher): Promise<void> => {
    try {
      await voucherService.remove(voucher.id);
      message.success('Đã xóa voucher.');
      await loadVouchers();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<Voucher> = [
    {
      title: 'Mã',
      dataIndex: 'code',
      key: 'code',
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Voucher',
      key: 'voucher',
      render: (_, voucher) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{voucher.name}</Typography.Text>
          {voucher.description ? (
            <Typography.Text type="secondary">{voucher.description}</Typography.Text>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Giảm giá',
      key: 'discount',
      render: (_, voucher) => formatVoucherValue(voucher),
    },
    {
      title: 'Điều kiện',
      key: 'conditions',
      render: (_, voucher) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>Từ {formatCurrency(voucher.minOrderValue)}</Typography.Text>
          <Typography.Text type="secondary">
            Đã dùng {voucher.usedCount}
            {voucher.usageLimit === undefined ? '' : ` / ${voucher.usageLimit}`}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Hiệu lực',
      key: 'period',
      render: (_, voucher) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{formatDateTime(voucher.startDate)}</Typography.Text>
          <Typography.Text type="secondary">đến {formatDateTime(voucher.endDate)}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'active',
      render: (_, voucher) =>
        voucher.active ? <Tag color="green">Đang bật</Tag> : <Tag>Đã tắt</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      render: (_, voucher) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(voucher)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa voucher này?"
            description="Voucher đã được sử dụng sẽ không thể xóa; hãy tắt thay vì xóa."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void removeVoucher(voucher)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const vouchers = result?.items ?? [];
  const meta = result?.meta;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>Voucher</Typography.Title>
          <Typography.Text type="secondary">
            Tạo và kiểm soát mã giảm giá; backend sẽ kiểm tra lại tại checkout.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm voucher
        </Button>
      </div>

      <Space wrap className="admin-voucher-filters">
        <Input.Search
          allowClear
          className="admin-voucher-search"
          value={searchInput}
          placeholder="Tìm mã hoặc tên voucher"
          enterButton={<SearchOutlined />}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setKeyword(value.trim() || undefined);
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="admin-voucher-status"
          value={active}
          placeholder="Tất cả trạng thái"
          options={[
            { value: true, label: 'Đang bật' },
            { value: false, label: 'Đã tắt' },
          ]}
          onChange={(nextActive) => {
            setActive(nextActive);
            setPage(1);
          }}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={vouchers}
        pagination={false}
        scroll={{ x: 1220 }}
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
        title={editingVoucher ? 'Cập nhật voucher' : 'Thêm voucher'}
        open={isModalOpen}
        footer={null}
        destroyOnHidden
        onCancel={closeModal}
      >
        <Form<VoucherFormValues> form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="code" label="Mã voucher" rules={[{ required: true, min: 3, max: 64 }]}>
            <Input maxLength={64} />
          </Form.Item>
          <Form.Item name="name" label="Tên voucher" rules={[{ required: true, min: 3, max: 180 }]}>
            <Input maxLength={180} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} maxLength={1000} />
          </Form.Item>
          <Form.Item
            name="discountType"
            label="Loại giảm giá"
            rules={[{ required: true }]}
          >
            <Select
              options={Object.values(VoucherDiscountType).map((value) => ({
                value,
                label: voucherDiscountTypeLabels[value],
              }))}
            />
          </Form.Item>
          <Form.Item
            name="discountValue"
            label="Giá trị giảm"
            rules={[{ required: true, type: 'number', min: 1 }]}
          >
            <InputNumber min={1} max={1_000_000_000} className="full-width" />
          </Form.Item>
          <Form.Item name="maxDiscount" label="Giảm tối đa (chỉ dùng cho phần trăm)">
            <InputNumber min={0} max={1_000_000_000} className="full-width" />
          </Form.Item>
          <Form.Item name="minOrderValue" label="Giá trị đơn tối thiểu">
            <InputNumber min={0} max={1_000_000_000} className="full-width" />
          </Form.Item>
          <Form.Item name="usageLimit" label="Giới hạn lượt dùng (để trống = không giới hạn)">
            <InputNumber min={1} className="full-width" />
          </Form.Item>
          <Form.Item
            name="startDate"
            label="Bắt đầu"
            rules={[{ required: true, message: 'Chọn thời điểm bắt đầu.' }]}
          >
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item
            name="endDate"
            label="Kết thúc"
            rules={[{ required: true, message: 'Chọn thời điểm kết thúc.' }]}
          >
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item name="active" label="Kích hoạt" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={closeModal}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu voucher
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
