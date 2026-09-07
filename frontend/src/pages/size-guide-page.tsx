import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  ColumnHeightOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import { sizeGuideService } from '../api/services/size-guide.service';
import { BikeType, bikeTypeLabels } from '../types/catalog';
import type { SizeRecommendation } from '../types/size-guide';
import { getErrorMessage } from '../utils/error-message';

interface SizeGuideFormValues {
  heightCm: number;
  bikeType: BikeType;
}

const supportedBikeTypes = [BikeType.MOUNTAIN, BikeType.ROAD, BikeType.CITY];

export const SizeGuidePage = () => {
  const [form] = Form.useForm<SizeGuideFormValues>();
  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (values: SizeGuideFormValues): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await sizeGuideService.recommend(values);
      setRecommendation(result);
    } catch (error) {
      setRecommendation(null);
      const nextErrorMessage = getErrorMessage(error);
      setErrorMessage(nextErrorMessage);
      message.error(nextErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page-container size-guide-page">
      <section className="size-guide-heading">
        <Tag color="cyan">BIKE FIT</Tag>
        <Typography.Title level={1}>Hướng dẫn chọn size xe đạp</Typography.Title>
        <Typography.Paragraph>
          Nhập chiều cao và loại xe. Kết quả được tính từ rule Size Guide do cửa hàng quản lý,
          không dùng bảng size cố định trong giao diện.
        </Typography.Paragraph>
      </section>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={11}>
          <Card title={<><ColumnHeightOutlined /> Thông tin của bạn</>} className="size-guide-form-card">
            <Form<SizeGuideFormValues>
              form={form}
              layout="vertical"
              initialValues={{ bikeType: BikeType.MOUNTAIN }}
              onFinish={submit}
            >
              <Form.Item
                name="heightCm"
                label="Chiều cao"
                rules={[{ required: true, message: 'Nhập chiều cao của bạn.' }]}
              >
                <InputNumber min={100} max={250} precision={0} addonAfter="cm" className="full-width" />
              </Form.Item>
              <Form.Item
                name="bikeType"
                label="Loại xe"
                rules={[{ required: true, message: 'Chọn loại xe.' }]}
              >
                <Select
                  options={supportedBikeTypes.map((bikeType) => ({
                    value: bikeType,
                    label: bikeTypeLabels[bikeType],
                  }))}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={isLoading} block>
                Tìm size phù hợp
              </Button>
            </Form>
          </Card>
          <Alert
            className="size-guide-note"
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message="Kết quả là gợi ý ban đầu"
            description="Thông số cơ thể, kiểu lái và cấu hình từng hãng có thể tạo khác biệt. Hãy liên hệ cửa hàng để được tư vấn kỹ hơn trước khi chọn xe."
          />
        </Col>
        <Col xs={24} lg={13}>
          <Card className="size-guide-result-card" title="Kết quả gợi ý">
            {isLoading ? (
              <div className="size-guide-result-loading"><Spin size="large" /></div>
            ) : recommendation ? (
              <Space direction="vertical" size="large" className="full-width">
                <div className="size-guide-result-highlight">
                  <CheckCircleOutlined />
                  <div>
                    <Typography.Text type="secondary">Size đề xuất</Typography.Text>
                    <Typography.Title level={1}>{recommendation.recommendedSize}</Typography.Title>
                    <Typography.Text strong>{recommendation.frameSizeLabel}</Typography.Text>
                  </div>
                </div>
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Loại xe">
                    {bikeTypeLabels[recommendation.bikeType]}
                  </Descriptions.Item>
                  <Descriptions.Item label="Chiều cao đã nhập">
                    {recommendation.heightCm} cm
                  </Descriptions.Item>
                  <Descriptions.Item label="Khoảng chiều cao của rule">
                    {recommendation.heightRange.minHeightCm}–{recommendation.heightRange.maxHeightCm} cm
                  </Descriptions.Item>
                </Descriptions>
                {recommendation.description ? (
                  <Typography.Paragraph className="size-guide-result-description">
                    {recommendation.description}
                  </Typography.Paragraph>
                ) : null}
              </Space>
            ) : errorMessage ? (
              <Alert type="warning" showIcon message="Chưa có gợi ý phù hợp" description={errorMessage} />
            ) : (
              <div className="size-guide-empty-state">
                <ColumnHeightOutlined />
                <Typography.Text type="secondary">
                  Hoàn thành biểu mẫu để xem size khung phù hợp.
                </Typography.Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </main>
  );
};
