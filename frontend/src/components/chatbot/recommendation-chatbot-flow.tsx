import { ReloadOutlined, RobotOutlined } from '@ant-design/icons';
import { Alert, Button, InputNumber, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { recommendationService } from '../../api/services/recommendation.service';
import type {
  RecommendationFlowResponse,
  ProductRecommendation,
} from '../../types/recommendation';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

interface RecommendationChatbotFlowProps {
  onBackToFaq: () => void;
  backLabel?: string;
}

export const RecommendationChatbotFlow = ({
  onBackToFaq,
  backLabel = '← Câu hỏi thường gặp',
}: RecommendationChatbotFlowProps) => {
  const [flow, setFlow] = useState<RecommendationFlowResponse | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startFlow = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    setHeightCm(null);
    try {
      setFlow(await recommendationService.start());
    } catch (error) {
      setFlow(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void startFlow();
  }, []);

  const sendAnswer = async (answer: string): Promise<void> => {
    if (!flow || isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      setFlow(
        await recommendationService.sendMessage({
          sessionId: flow.sessionId,
          answer,
        }),
      );
      setHeightCm(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const submitHeight = (): void => {
    if (!flow?.input || heightCm === null) {
      return;
    }

    if (heightCm < flow.input.min || heightCm > flow.input.max) {
      setErrorMessage(
        `Chiều cao cần nằm trong khoảng ${flow.input.min}–${flow.input.max} ${flow.input.suffix}.`,
      );
      return;
    }

    void sendAnswer(String(heightCm));
  };

  return (
    <div className="recommendation-chatbot-flow">
      <Button type="link" size="small" onClick={onBackToFaq}>
        {backLabel}
      </Button>

      {isLoading && !flow ? (
        <div className="recommendation-chatbot-loading"><Spin size="small" /></div>
      ) : null}

      {errorMessage ? (
        <Alert
          type="warning"
          showIcon
          message="Chưa thể tiếp tục tư vấn"
          description={errorMessage}
          action={<Button size="small" onClick={() => void startFlow()}>Thử lại</Button>}
        />
      ) : null}

      {flow ? (
        <>
          <div className="recommendation-chatbot-bot-message">
            <RobotOutlined />
            <Typography.Text>{flow.message}</Typography.Text>
          </div>

          {flow.type === 'QUESTION' && flow.options ? (
            <div className="recommendation-chatbot-options">
              {flow.options.map((option) => (
                <Button
                  key={option.value}
                  onClick={() => void sendAnswer(option.value)}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          ) : null}

          {flow.type === 'QUESTION' && flow.input ? (
            <div className="recommendation-chatbot-height-input">
              <InputNumber
                min={flow.input.min}
                max={flow.input.max}
                precision={0}
                value={heightCm}
                placeholder={flow.input.placeholder}
                addonAfter={flow.input.suffix}
                disabled={isLoading}
                className="full-width"
                onChange={(value) => {
                  setHeightCm(typeof value === 'number' ? value : null);
                  setErrorMessage(null);
                }}
              />
              <Button
                type="primary"
                onClick={submitHeight}
                loading={isLoading}
                disabled={heightCm === null}
              >
                Xem gợi ý
              </Button>
            </div>
          ) : null}

          {flow.type === 'RESULT' ? (
            <div className="recommendation-chatbot-results">
              {!flow.recommendations?.length ? (
                <Alert
                  type="info"
                  showIcon
                  message="Khám phá thêm lựa chọn"
                  description="Bạn có thể xem thông số và giá tham khảo của các mẫu khác trong danh mục sản phẩm."
                  action={<Link to="/products" onClick={onBackToFaq}><Button size="small">Xem sản phẩm</Button></Link>}
                />
              ) : null}
              {flow.recommendations?.map((recommendation) => (
                <RecommendationProductCard
                  key={recommendation.productId}
                  recommendation={recommendation}
                />
              ))}
              <Button
                icon={<ReloadOutlined />}
                loading={isLoading}
                onClick={() => void startFlow()}
              >
                Tư vấn lại
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

interface RecommendationProductCardProps {
  recommendation: ProductRecommendation;
}

const RecommendationProductCard = ({
  recommendation,
}: RecommendationProductCardProps) => (
  <Link
    to={recommendation.productUrl}
    className="recommendation-chatbot-product-card"
  >
    <img src={recommendation.image} alt={recommendation.name} />
    <div>
      <Typography.Text strong>{recommendation.name}</Typography.Text>
      <div className="recommendation-chatbot-price">
        <Typography.Text strong>{formatCurrency(recommendation.salePrice)}</Typography.Text>
        {recommendation.salePrice < recommendation.price ? (
          <Typography.Text delete type="secondary">
            {formatCurrency(recommendation.price)}
          </Typography.Text>
        ) : null}
      </div>
      {recommendation.matchedVariant ? (
        <Tag color="cyan">
          {recommendation.matchedVariant.color} / {recommendation.matchedVariant.size}
        </Tag>
      ) : null}
      <Typography.Paragraph>{recommendation.reason}</Typography.Paragraph>
    </div>
  </Link>
);
