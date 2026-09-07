import {
  EditOutlined,
  MessageOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productQuestionService } from '../../api/services/product-question.service';
import {
  ProductQuestionStatus,
  type AdminProductQuestion,
  type AdminProductQuestionListResult,
  type UpdateProductQuestionPayload,
  productQuestionStatusLabels,
} from '../../types/product-question';
import { getErrorMessage } from '../../utils/error-message';

type QuestionFormValues = UpdateProductQuestionPayload;

const statusColor: Record<ProductQuestionStatus, string> = {
  [ProductQuestionStatus.PENDING]: 'gold',
  [ProductQuestionStatus.ANSWERED]: 'green',
  [ProductQuestionStatus.HIDDEN]: 'default',
};

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const AdminProductQuestionsPage = () => {
  const [result, setResult] = useState<AdminProductQuestionListResult | null>(null);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState<string>();
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<ProductQuestionStatus>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<AdminProductQuestion | null>(null);
  const [form] = Form.useForm<QuestionFormValues>();
  const activeStatus = Form.useWatch('status', form);

  const loadQuestions = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setResult(
        await productQuestionService.getAdminList({
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
  }, [keyword, page, status]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const closeModal = (): void => {
    setSelectedQuestion(null);
    form.resetFields();
  };

  const openManage = (question: AdminProductQuestion): void => {
    setSelectedQuestion(question);
    form.setFieldsValue({
      status: question.status,
      answer: question.answer?.content,
    });
  };

  const saveQuestion = async (values: QuestionFormValues): Promise<void> => {
    if (!selectedQuestion) {
      return;
    }

    setIsSaving(true);
    try {
      await productQuestionService.updateByAdmin(selectedQuestion.id, {
        status: values.status,
        ...(values.status === ProductQuestionStatus.ANSWERED && values.answer?.trim()
          ? { answer: values.answer.trim() }
          : {}),
      });
      message.success('Đã cập nhật câu hỏi sản phẩm.');
      closeModal();
      await loadQuestions();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const columns: ColumnsType<AdminProductQuestion> = [
    {
      title: 'Khách hàng / sản phẩm',
      key: 'customer-product',
      width: 245,
      render: (_, question) => (
        <Space direction="vertical" size={3}>
          <Space>
            <Avatar src={question.author.avatarUrl}>
              {question.author.fullName.slice(0, 1).toUpperCase()}
            </Avatar>
            <Typography.Text strong>{question.author.fullName}</Typography.Text>
          </Space>
          <Link to={`/products/${question.product.slug}`} target="_blank">
            {question.product.name}
          </Link>
        </Space>
      ),
    },
    {
      title: 'Nội dung',
      key: 'content',
      render: (_, question) => (
        <Space direction="vertical" size={4}>
          <Typography.Text strong ellipsis={{ tooltip: question.question }}>
            {question.question}
          </Typography.Text>
          {question.answer ? (
            <Typography.Text type="secondary" ellipsis={{ tooltip: question.answer.content }}>
              Phản hồi: {question.answer.content}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary">Chưa có phản hồi</Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value: ProductQuestionStatus) => (
        <Tag color={statusColor[value]}>{productQuestionStatusLabels[value]}</Tag>
      ),
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 155,
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 128,
      render: (_, question) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => openManage(question)}>
          Xử lý
        </Button>
      ),
    },
  ];

  const questions = result?.items ?? [];
  const meta = result?.meta;

  return (
    <section className="admin-page admin-product-questions-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}><MessageOutlined /> Hỏi đáp sản phẩm</Typography.Title>
          <Typography.Text type="secondary">
            Trả lời tư vấn để câu hỏi xuất hiện công khai ở trang sản phẩm và gửi email cho khách hàng.
          </Typography.Text>
        </div>
      </div>

      <Space wrap className="admin-chatbot-filters">
        <Input.Search
          allowClear
          className="admin-chatbot-search"
          value={searchInput}
          placeholder="Tìm câu hỏi, khách hàng hoặc sản phẩm"
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
          value={status}
          placeholder="Tất cả trạng thái"
          options={Object.values(ProductQuestionStatus).map((value) => ({
            value,
            label: productQuestionStatusLabels[value],
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
        dataSource={questions}
        pagination={false}
        scroll={{ x: 960 }}
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
        title="Xử lý câu hỏi sản phẩm"
        open={Boolean(selectedQuestion)}
        footer={null}
        width={720}
        destroyOnHidden
        onCancel={closeModal}
      >
        {selectedQuestion ? (
          <>
            <div className="admin-question-original">
              <Typography.Text type="secondary">
                {selectedQuestion.author.fullName} · {selectedQuestion.product.name}
              </Typography.Text>
              <Typography.Paragraph>{selectedQuestion.question}</Typography.Paragraph>
            </div>
            <Form<QuestionFormValues> form={form} layout="vertical" onFinish={saveQuestion}>
              <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
                <Select
                  options={Object.values(ProductQuestionStatus).map((value) => ({
                    value,
                    label: productQuestionStatusLabels[value],
                  }))}
                />
              </Form.Item>
              {activeStatus === ProductQuestionStatus.ANSWERED ? (
                <Form.Item
                  name="answer"
                  label="Câu trả lời từ cửa hàng"
                  rules={[
                    { required: true, whitespace: true, min: 2, message: 'Nhập câu trả lời từ 2 ký tự.' },
                    { max: 3000, message: 'Câu trả lời tối đa 3.000 ký tự.' },
                  ]}
                >
                  <Input.TextArea rows={7} maxLength={3000} showCount />
                </Form.Item>
              ) : null}
              <div className="modal-form-actions">
                <Space>
                  <Button onClick={closeModal}>Hủy</Button>
                  <Button type="primary" htmlType="submit" loading={isSaving}>
                    Lưu thay đổi
                  </Button>
                </Space>
              </div>
            </Form>
          </>
        ) : null}
      </Modal>
    </section>
  );
};
