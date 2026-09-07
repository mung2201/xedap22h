import {
  MessageOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  List,
  Pagination,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { productQuestionService } from '../../api/services/product-question.service';
import { useAuthStore } from '../../stores/auth.store';
import { UserRole } from '../../types/auth';
import type {
  ProductQuestionListResult,
} from '../../types/product-question';
import { getErrorMessage } from '../../utils/error-message';

interface ProductQuestionsSectionProps {
  productId: string;
}

interface AskQuestionFormValues {
  question: string;
}

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const ProductQuestionsSection = ({
  productId,
}: ProductQuestionsSectionProps) => {
  const user = useAuthStore((state) => state.user);
  const [result, setResult] = useState<ProductQuestionListResult | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form] = Form.useForm<AskQuestionFormValues>();

  const loadQuestions = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      setResult(
        await productQuestionService.getByProduct(productId, {
          page,
          limit: 4,
        }),
      );
    } catch (error) {
      setResult(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, productId]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const submitQuestion = async (values: AskQuestionFormValues): Promise<void> => {
    setIsSubmitting(true);
    try {
      await productQuestionService.create({
        productId,
        question: values.question.trim(),
      });
      form.resetFields();
      message.success('Đã gửi câu hỏi. Shop sẽ phản hồi qua email khi có câu trả lời.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const questions = result?.items ?? [];
  const meta = result?.meta;
  const canAsk = user?.role === UserRole.CUSTOMER;

  return (
    <section className="product-questions-section">
      <div className="section-heading product-questions-heading">
        <div>
          <Typography.Title level={2}>Hỏi đáp về sản phẩm</Typography.Title>
          <Typography.Text type="secondary">
            Gửi câu hỏi về size, cấu hình, khả năng tương thích hoặc cách sử dụng. Chỉ các câu hỏi đã được shop phản hồi mới hiển thị công khai.
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadQuestions()}>
          Làm mới
        </Button>
      </div>

      {canAsk ? (
        <Form<AskQuestionFormValues>
          className="product-question-form"
          form={form}
          layout="vertical"
          onFinish={submitQuestion}
        >
          <Form.Item
            name="question"
            label="Bạn cần shop tư vấn gì?"
            rules={[
              { required: true, whitespace: true, min: 5, message: 'Nhập câu hỏi từ 5 ký tự.' },
              { max: 1500, message: 'Câu hỏi tối đa 1.500 ký tự.' },
            ]}
          >
            <Input.TextArea
              rows={3}
              maxLength={1500}
              showCount
              placeholder="Ví dụ: Tôi cao 1m72 thì nên chọn size nào?"
            />
          </Form.Item>
          <Space wrap>
            <Button type="primary" icon={<SendOutlined />} htmlType="submit" loading={isSubmitting}>
              Gửi câu hỏi
            </Button>
            <Link to="/account/questions">Xem câu hỏi của tôi</Link>
          </Space>
        </Form>
      ) : !user ? (
        <Alert
          className="product-question-login-alert"
          type="info"
          showIcon
          message={<Link to="/login">Đăng nhập với tài khoản khách hàng để gửi câu hỏi cho shop.</Link>}
        />
      ) : null}

      {errorMessage ? (
        <Alert className="product-question-alert" type="warning" showIcon message={errorMessage} />
      ) : null}

      {isLoading ? (
        <div className="product-questions-loading"><Spin /></div>
      ) : questions.length ? (
        <>
          <List
            className="product-questions-list"
            itemLayout="vertical"
            dataSource={questions}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<MessageOutlined className="product-question-icon" />}
                  title={<Typography.Text strong>Khách hàng hỏi</Typography.Text>}
                  description={formatDate(item.createdAt)}
                />
                <Typography.Paragraph className="product-question-content">
                  {item.question}
                </Typography.Paragraph>
                {item.answer ? (
                  <div className="product-question-answer">
                    <Typography.Text strong>{item.answer.answeredByName}</Typography.Text>
                    <Typography.Text type="secondary">
                      {formatDate(item.answer.answeredAt)}
                    </Typography.Text>
                    <Typography.Paragraph>{item.answer.content}</Typography.Paragraph>
                  </div>
                ) : null}
              </List.Item>
            )}
          />
          {meta && (meta.totalPages ?? 1) > 1 ? (
            <Pagination
              className="product-questions-pagination"
              current={page}
              pageSize={meta.limit ?? 4}
              total={meta.total}
              showSizeChanger={false}
              onChange={setPage}
            />
          ) : null}
        </>
      ) : (
        <Empty
          className="product-questions-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Chưa có câu hỏi đã được trả lời cho sản phẩm này."
        />
      )}
    </section>
  );
};
