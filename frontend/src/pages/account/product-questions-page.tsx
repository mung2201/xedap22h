import {
  DeleteOutlined,
  MessageOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Image,
  List,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { productQuestionService } from '../../api/services/product-question.service';
import { useAuthStore } from '../../stores/auth.store';
import {
  ProductQuestionStatus,
  type ProductQuestion,
  type ProductQuestionListResult,
  productQuestionStatusLabels,
} from '../../types/product-question';
import { getErrorMessage } from '../../utils/error-message';

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

export const ProductQuestionsPage = () => {
  const userId = useAuthStore((state) => state.user?.id);
  const [result, setResult] = useState<ProductQuestionListResult | null>(null);
  const [status, setStatus] = useState<ProductQuestionStatus>();
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const loadController = useRef<AbortController | null>(null);
  const mutationPending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    loadController.current = controller;
    mutationPending.current = false;
    setRemovingId(null);
    const loadQuestions = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);
      setResult(null);
      try {
        const nextResult = await productQuestionService.getMine({
          page,
          limit: 10,
          ...(status ? { status } : {}),
        }, controller.signal);
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, nextResult.meta.totalPages
          ?? Math.ceil((nextResult.meta.total ?? nextResult.items.length) / (nextResult.meta.limit ?? 10)));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setResult(nextResult);
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadQuestions();
    return () => controller.abort();
  }, [page, status, reloadKey, userId]);

  const removeQuestion = async (question: ProductQuestion): Promise<void> => {
    const signal = loadController.current?.signal;
    if (mutationPending.current || !signal || signal.aborted) return;
    mutationPending.current = true;
    setRemovingId(question.id);
    try {
      await productQuestionService.removeMine(question.id);
      if (signal.aborted) return;
      message.success('Đã xóa câu hỏi đang chờ phản hồi.');
      setReloadKey((value) => value + 1);
    } catch (error) {
      if (!signal.aborted) message.error(getErrorMessage(error));
    } finally {
      if (!signal.aborted) {
        mutationPending.current = false;
        setRemovingId(null);
      }
    }
  };

  const items = result?.items ?? [];
  const meta = result?.meta;

  return (
    <section className="account-product-questions-page">
      <div className="account-content-heading">
        <div>
          <Typography.Title level={3}><MessageOutlined /> Câu hỏi của tôi</Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi phản hồi tư vấn từ cửa hàng. Khi có câu trả lời, shop cũng gửi thông báo qua email.
          </Typography.Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={isLoading}
          disabled={removingId !== null}
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Làm mới
        </Button>
      </div>

      <Select
        allowClear
        className="account-question-status-filter"
        placeholder="Tất cả trạng thái"
        value={status}
        disabled={removingId !== null}
        options={Object.values(ProductQuestionStatus).map((value) => ({
          value,
          label: productQuestionStatusLabels[value],
        }))}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />

      {isLoading ? (
        <div className="account-question-loading"><Spin /></div>
      ) : errorMessage ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải câu hỏi của bạn"
          description={errorMessage}
          action={<Button onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button>}
        />
      ) : items.length ? (
        <>
          <List
            className="account-question-list"
            dataSource={items}
            renderItem={(question) => (
              <List.Item
                actions={
                  question.status === ProductQuestionStatus.PENDING
                    ? [
                        <Popconfirm
                          key="delete"
                          title="Xóa câu hỏi này?"
                          description="Bạn chỉ có thể xóa câu hỏi khi shop chưa phản hồi."
                          okText="Xóa"
                          cancelText="Hủy"
                          disabled={removingId !== null}
                          okButtonProps={{ loading: removingId === question.id }}
                          cancelButtonProps={{ disabled: removingId !== null }}
                          onConfirm={() => removeQuestion(question)}
                        >
                          <Button
                            danger
                            type="link"
                            icon={<DeleteOutlined />}
                            disabled={removingId !== null}
                            loading={removingId === question.id}
                          >
                            Xóa
                          </Button>
                        </Popconfirm>,
                      ]
                    : undefined
                }
              >
                <List.Item.Meta
                  avatar={<Image width={64} height={64} preview={false} src={question.product.thumbnail} />}
                  title={
                    <Space wrap>
                      <Link to={`/products/${question.product.slug}`}>{question.product.name}</Link>
                      <Tag color={statusColor[question.status]}>
                        {productQuestionStatusLabels[question.status]}
                      </Tag>
                    </Space>
                  }
                  description={`Gửi lúc ${formatDate(question.createdAt)}`}
                />
                <div className="account-question-content">
                  <Typography.Text strong>Câu hỏi của bạn</Typography.Text>
                  <Typography.Paragraph>{question.question}</Typography.Paragraph>
                  {question.answer ? (
                    <div className="account-question-answer">
                      <Typography.Text strong>{question.answer.answeredByName}</Typography.Text>
                      <Typography.Text type="secondary">
                        {formatDate(question.answer.answeredAt)}
                      </Typography.Text>
                      <Typography.Paragraph>{question.answer.content}</Typography.Paragraph>
                    </div>
                  ) : null}
                </div>
              </List.Item>
            )}
          />
          {meta && (meta.totalPages ?? 1) > 1 ? (
            <Pagination
              className="account-question-pagination"
              current={page}
              pageSize={meta.limit ?? 10}
              total={meta.total}
              showSizeChanger={false}
              disabled={removingId !== null}
              onChange={setPage}
            />
          ) : null}
        </>
      ) : (
        <Empty
          className="account-question-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={status ? 'Không có câu hỏi ở trạng thái này.' : 'Bạn chưa gửi câu hỏi nào.'}
        />
      )}
    </section>
  );
};
