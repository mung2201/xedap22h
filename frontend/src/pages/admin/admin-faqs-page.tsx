import {
  DeleteOutlined,
  EditOutlined,
  MinusCircleOutlined,
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
import { chatbotService } from '../../api/services/chatbot.service';
import type {
  FaqEntry,
  FaqListResult,
  FaqPayload,
} from '../../types/chatbot';
import { getErrorMessage } from '../../utils/error-message';

interface FaqFormValues {
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  active: boolean;
}

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const AdminFaqsPage = () => {
  const [result, setResult] = useState<FaqListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState<string>();
  const [active, setActive] = useState<boolean>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqEntry | null>(null);
  const [form] = Form.useForm<FaqFormValues>();

  const loadFaqs = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setResult(
        await chatbotService.getAdminFaqs({
          page,
          limit: 10,
          ...(keyword ? { keyword } : {}),
          ...(active !== undefined ? { active } : {}),
        }),
      );
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword, active]);

  useEffect(() => {
    void loadFaqs();
  }, [loadFaqs]);

  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingFaq(null);
    form.resetFields();
  };

  const openCreate = (): void => {
    setEditingFaq(null);
    form.resetFields();
    form.setFieldsValue({ active: true, priority: 0, keywords: [''] });
    setIsModalOpen(true);
  };

  const openEdit = (faq: FaqEntry): void => {
    setEditingFaq(faq);
    form.setFieldsValue({
      question: faq.question,
      answer: faq.answer,
      keywords: faq.keywords,
      priority: faq.priority,
      active: faq.active,
    });
    setIsModalOpen(true);
  };

  const saveFaq = async (values: FaqFormValues): Promise<void> => {
    const keywords = values.keywords.map((item) => item.trim()).filter(Boolean);
    if (keywords.length === 0) {
      form.setFields([
        { name: 'keywords', errors: ['Thêm ít nhất một keyword.'] },
      ]);
      return;
    }

    const payload: FaqPayload = {
      question: values.question.trim(),
      answer: values.answer.trim(),
      keywords,
      priority: values.priority ?? 0,
      active: values.active,
    };

    setIsSaving(true);
    try {
      if (editingFaq) {
        await chatbotService.updateFaq(editingFaq.id, payload);
        message.success('Đã cập nhật FAQ.');
      } else {
        await chatbotService.createFaq(payload);
        message.success('Đã tạo FAQ.');
      }
      closeModal();
      await loadFaqs();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const removeFaq = async (faq: FaqEntry): Promise<void> => {
    try {
      await chatbotService.removeFaq(faq.id);
      message.success('Đã xóa FAQ.');
      await loadFaqs();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const columns: ColumnsType<FaqEntry> = [
    {
      title: 'Câu hỏi / trả lời',
      key: 'content',
      render: (_, faq) => (
        <Space direction="vertical" size={2}>
          <Typography.Text strong>{faq.question}</Typography.Text>
          <Typography.Text type="secondary" ellipsis={{ tooltip: faq.answer }}>
            {faq.answer}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Keywords',
      dataIndex: 'keywords',
      key: 'keywords',
      render: (keywords: string[]) => (
        <Space wrap size={[4, 4]}>
          {keywords.map((item) => <Tag key={item}>{item}</Tag>)}
        </Space>
      ),
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 88,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      key: 'active',
      width: 116,
      render: (value: boolean) =>
        value ? <Tag color="green">Đang dùng</Tag> : <Tag>Đã tắt</Tag>,
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 152,
      render: (_, faq) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(faq)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa FAQ này?"
            description="Chatbot sẽ không còn dùng câu trả lời này."
            okText="Xóa"
            cancelText="Hủy"
            onConfirm={() => void removeFaq(faq)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const faqs = result?.items ?? [];
  const meta = result?.meta;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>FAQ Chatbot</Typography.Title>
          <Typography.Text type="secondary">
            Chatbot chọn câu trả lời theo keyword dài nhất khớp trước, sau đó dùng priority để phân định các kết quả bằng điểm.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Thêm FAQ
        </Button>
      </div>

      <Space wrap className="admin-chatbot-filters">
        <Input.Search
          allowClear
          className="admin-chatbot-search"
          value={searchInput}
          placeholder="Tìm câu hỏi, trả lời hoặc keyword"
          enterButton={<SearchOutlined />}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setKeyword(value.trim() || undefined);
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="admin-chatbot-filter"
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
        dataSource={faqs}
        pagination={false}
        scroll={{ x: 1_060 }}
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
        title={editingFaq ? 'Cập nhật FAQ' : 'Thêm FAQ'}
        open={isModalOpen}
        footer={null}
        width={760}
        destroyOnHidden
        onCancel={closeModal}
      >
        <Form<FaqFormValues> form={form} layout="vertical" onFinish={saveFaq}>
          <Form.Item
            name="question"
            label="Câu hỏi"
            rules={[{ required: true, whitespace: true, min: 2, max: 240 }]}
          >
            <Input maxLength={240} placeholder="Ví dụ: Shop bảo hành bao lâu?" />
          </Form.Item>
          <Form.Item
            name="answer"
            label="Câu trả lời"
            rules={[{ required: true, whitespace: true, min: 1, max: 5_000 }]}
          >
            <Input.TextArea rows={6} maxLength={5_000} showCount />
          </Form.Item>
          <Form.List name="keywords">
            {(fields, { add, remove }) => (
              <div className="admin-chatbot-keywords">
                <Typography.Text strong>Keywords</Typography.Text>
                {fields.map((field, index) => (
                  <Space key={field.key} align="baseline" className="admin-chatbot-keyword-row">
                    <Form.Item
                      {...field}
                      rules={[
                        { required: true, whitespace: true, message: 'Keyword không được để trống.' },
                        { max: 140, message: 'Keyword tối đa 140 ký tự.' },
                      ]}
                    >
                      <Input maxLength={140} placeholder={index === 0 ? 'bảo hành' : 'Thêm keyword'} />
                    </Form.Item>
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      aria-label="Xóa keyword"
                      disabled={fields.length === 1}
                      onClick={() => remove(field.name)}
                    />
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add('')}>
                  Thêm keyword
                </Button>
              </div>
            )}
          </Form.List>
          <Form.Item name="priority" label="Priority" rules={[{ required: true, type: 'number', min: 0, max: 10_000 }]}> 
            <InputNumber min={0} max={10_000} precision={0} className="full-width" />
          </Form.Item>
          <Form.Item name="active" label="Dùng cho chatbot" valuePropName="checked">
            <Switch />
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={closeModal}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu FAQ
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
