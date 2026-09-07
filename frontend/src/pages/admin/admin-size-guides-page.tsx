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
import { sizeGuideService } from '../../api/services/size-guide.service';
import { BikeType, bikeTypeLabels } from '../../types/catalog';
import type {
  SizeGuideListResult,
  SizeGuideRule,
  SizeGuideRulePayload,
} from '../../types/size-guide';
import { getErrorMessage } from '../../utils/error-message';

interface SizeGuideFormValues extends SizeGuideRulePayload {
  active: boolean;
  sortOrder: number;
}

export const AdminSizeGuidesPage = () => {
  const [result, setResult] = useState<SizeGuideListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [bikeType, setBikeType] = useState<BikeType>();
  const [active, setActive] = useState<boolean>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SizeGuideRule | null>(null);
  const [form] = Form.useForm<SizeGuideFormValues>();

  const loadRules = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setResult(
        await sizeGuideService.getAdminList({
          page,
          limit: 20,
          ...(bikeType ? { bikeType } : {}),
          ...(active !== undefined ? { active } : {}),
        }),
      );
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, bikeType, active]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingRule(null);
    form.resetFields();
  };

  const openCreate = (): void => {
    setEditingRule(null);
    form.resetFields();
    form.setFieldsValue({
      bikeType: BikeType.MOUNTAIN,
      sortOrder: 0,
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (rule: SizeGuideRule): void => {
    setEditingRule(rule);
    form.setFieldsValue({
      bikeType: rule.bikeType,
      minHeightCm: rule.minHeightCm,
      maxHeightCm: rule.maxHeightCm,
      recommendedSize: rule.recommendedSize,
      frameSizeLabel: rule.frameSizeLabel,
      description: rule.description,
      sortOrder: rule.sortOrder,
      active: rule.active,
    });
    setIsModalOpen(true);
  };

  const saveRule = async (values: SizeGuideFormValues): Promise<void> => {
    if (values.minHeightCm > values.maxHeightCm) {
      form.setFields([
        { name: 'maxHeightCm', errors: ['Chiều cao tối đa phải lớn hơn hoặc bằng chiều cao tối thiểu.'] },
      ]);
      return;
    }

    const payload: SizeGuideRulePayload = {
      bikeType: values.bikeType,
      minHeightCm: values.minHeightCm,
      maxHeightCm: values.maxHeightCm,
      recommendedSize: values.recommendedSize.trim(),
      frameSizeLabel: values.frameSizeLabel.trim(),
      ...(values.description?.trim()
        ? { description: values.description.trim() }
        : editingRule
          ? { description: null }
          : {}),
      sortOrder: values.sortOrder ?? 0,
      active: values.active,
    };

    setIsSaving(true);
    try {
      if (editingRule) {
        await sizeGuideService.update(editingRule.id, payload);
        message.success('Đã cập nhật rule chọn size.');
      } else {
        await sizeGuideService.create(payload);
        message.success('Đã tạo rule chọn size.');
      }
      closeModal();
      await loadRules();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const removeRule = async (rule: SizeGuideRule): Promise<void> => {
    try {
      await sizeGuideService.remove(rule.id);
      message.success('Đã xóa rule chọn size.');
      await loadRules();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<SizeGuideRule> = [
    {
      title: 'Loại xe',
      dataIndex: 'bikeType',
      key: 'bikeType',
      render: (value: BikeType) => bikeTypeLabels[value],
    },
    {
      title: 'Khoảng chiều cao',
      key: 'heightRange',
      render: (_, rule) => `${rule.minHeightCm}–${rule.maxHeightCm} cm`,
    },
    {
      title: 'Size đề xuất',
      dataIndex: 'recommendedSize',
      key: 'recommendedSize',
      render: (value: string) => <Tag color="cyan">{value}</Tag>,
    },
    {
      title: 'Khung',
      dataIndex: 'frameSizeLabel',
      key: 'frameSizeLabel',
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 86,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      key: 'active',
      render: (value: boolean) =>
        value ? <Tag color="green">Đang dùng</Tag> : <Tag>Đã tắt</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      render: (_, rule) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(rule)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa rule chọn size?"
            description="Rule này sẽ không còn được dùng để tư vấn khách hàng."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void removeRule(rule)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const rules = result?.items ?? [];
  const meta = result?.meta;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>Hướng dẫn chọn size</Typography.Title>
          <Typography.Text type="secondary">
            Rule active cùng loại xe không được chồng lấn khoảng chiều cao để kết quả tư vấn luôn xác định.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm rule
        </Button>
      </div>

      <Space wrap className="admin-size-guide-filters">
        <Select
          allowClear
          className="admin-size-guide-filter"
          value={bikeType}
          placeholder="Tất cả loại xe"
          options={Object.values(BikeType).map((value) => ({
            value,
            label: bikeTypeLabels[value],
          }))}
          onChange={(value) => {
            setBikeType(value);
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="admin-size-guide-filter"
          value={active}
          placeholder="Tất cả trạng thái"
          options={[
            { value: true, label: 'Đang dùng' },
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
        dataSource={rules}
        pagination={false}
        scroll={{ x: 940 }}
      />
      {meta && (meta.totalPages ?? 1) > 1 ? (
        <Pagination
          className="admin-table-pagination"
          current={page}
          pageSize={20}
          total={meta.total}
          showSizeChanger={false}
          onChange={setPage}
        />
      ) : null}

      <Modal
        title={editingRule ? 'Cập nhật rule chọn size' : 'Thêm rule chọn size'}
        open={isModalOpen}
        footer={null}
        destroyOnHidden
        onCancel={closeModal}
      >
        <Form<SizeGuideFormValues> form={form} layout="vertical" onFinish={saveRule}>
          <Form.Item name="bikeType" label="Loại xe" rules={[{ required: true }]}>
            <Select
              options={Object.values(BikeType).map((value) => ({
                value,
                label: bikeTypeLabels[value],
              }))}
            />
          </Form.Item>
          <Form.Item
            name="minHeightCm"
            label="Chiều cao tối thiểu (cm)"
            rules={[{ required: true, type: 'number', min: 100, max: 250 }]}
          >
            <InputNumber min={100} max={250} precision={0} className="full-width" />
          </Form.Item>
          <Form.Item
            name="maxHeightCm"
            label="Chiều cao tối đa (cm)"
            rules={[{ required: true, type: 'number', min: 100, max: 250 }]}
          >
            <InputNumber min={100} max={250} precision={0} className="full-width" />
          </Form.Item>
          <Form.Item
            name="recommendedSize"
            label="Size đề xuất"
            rules={[{ required: true, whitespace: true, max: 40 }]}
          >
            <Input maxLength={40} placeholder="S, M, L hoặc 17 inch" />
          </Form.Item>
          <Form.Item
            name="frameSizeLabel"
            label="Khoảng size khung"
            rules={[{ required: true, whitespace: true, max: 80 }]}
          >
            <Input maxLength={80} placeholder="15–16 inch hoặc 50–52 cm" />
          </Form.Item>
          <Form.Item name="description" label="Ghi chú tư vấn">
            <Input.TextArea rows={3} maxLength={1000} />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự ưu tiên">
            <InputNumber min={0} max={10_000} className="full-width" />
          </Form.Item>
          <Form.Item name="active" label="Dùng cho calculator" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={closeModal}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu rule
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
