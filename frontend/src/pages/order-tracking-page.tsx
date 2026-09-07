import { SearchOutlined, TruckOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Row,
  Steps,
  Tag,
  Typography,
  message,
} from 'antd';
import { useState } from 'react';
import { orderService } from '../api/services/order.service';
import {
  OrderStatus,
  PaymentStatus,
  type OrderTrackingResult,
  type TrackOrderPayload,
  orderStatusLabels,
  paymentStatusLabels,
} from '../types/order';
import { getErrorMessage } from '../utils/error-message';

const orderStatusColor: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'gold',
  [OrderStatus.CONFIRMED]: 'blue',
  [OrderStatus.PACKING]: 'cyan',
  [OrderStatus.SHIPPING]: 'geekblue',
  [OrderStatus.DELIVERED]: 'green',
  [OrderStatus.CANCELLED]: 'red',
};

const paymentStatusColor: Record<PaymentStatus, string> = {
  [PaymentStatus.UNPAID]: 'gold',
  [PaymentStatus.PAID]: 'green',
  [PaymentStatus.FAILED]: 'red',
  [PaymentStatus.REFUNDED]: 'purple',
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const OrderTrackingPage = () => {
  const [form] = Form.useForm<TrackOrderPayload>();
  const [result, setResult] = useState<OrderTrackingResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (values: TrackOrderPayload): Promise<void> => {
    setIsSubmitting(true);
    try {
      const tracking = await orderService.track({
        orderCode: values.orderCode.trim().toUpperCase(),
        phone: values.phone.trim(),
      });
      setResult(tracking);
    } catch (error) {
      setResult(null);
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentHistoryIndex = result
    ? result.statusHistory.reduce(
        (lastIndex, entry, index) =>
          entry.status === result.orderStatus ? index : lastIndex,
        result.statusHistory.length - 1,
      )
    : -1;

  return (
    <main className="order-tracking-page page-container">
      <section className="order-tracking-hero">
        <div>
          <Typography.Text className="section-eyebrow">Theo dõi đơn hàng</Typography.Text>
          <Typography.Title level={1}>Biết đơn xe của bạn đang ở đâu</Typography.Title>
          <Typography.Paragraph>
            Nhập mã đơn hàng và số điện thoại nhận hàng để xem tiến trình giao. Không
            hiển thị thông tin cá nhân hoặc chi tiết sản phẩm trên trang công khai này.
          </Typography.Paragraph>
        </div>
        <TruckOutlined aria-hidden />
      </section>

      <Card className="order-tracking-form-card">
        <Form<TrackOrderPayload>
          form={form}
          layout="vertical"
          onFinish={submit}
          initialValues={{ orderCode: '', phone: '' }}
        >
          <Row gutter={[16, 0]} align="bottom">
            <Col xs={24} md={10}>
              <Form.Item
                name="orderCode"
                label="Mã đơn hàng"
                rules={[
                  { required: true, message: 'Nhập mã đơn hàng.' },
                  {
                    pattern: /^ORD-[A-Za-z0-9-]+$/,
                    message: 'Mã đơn hàng có dạng ORD-YYYYMMDD-XXXX.',
                  },
                ]}
              >
                <Input placeholder="Ví dụ: ORD-20260831-ABCDEF" />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item
                name="phone"
                label="Số điện thoại nhận hàng"
                rules={[
                  { required: true, message: 'Nhập số điện thoại nhận hàng.' },
                  { min: 8, message: 'Số điện thoại chưa hợp lệ.' },
                ]}
              >
                <Input inputMode="tel" placeholder="Ví dụ: 0901234567" />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  icon={<SearchOutlined />}
                  loading={isSubmitting}
                >
                  Tra cứu
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {result ? (
        <Card className="order-tracking-result-card" title={`Đơn hàng ${result.orderCode}`}>
          <Row gutter={[28, 28]}>
            <Col xs={24} lg={8}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Trạng thái đơn">
                  <Tag color={orderStatusColor[result.orderStatus]}>
                    {orderStatusLabels[result.orderStatus]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Thanh toán">
                  <Tag color={paymentStatusColor[result.paymentStatus]}>
                    {paymentStatusLabels[result.paymentStatus]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Hình thức giao">
                  {result.shippingMethod === 'EXPRESS' ? 'Giao nhanh' : 'Giao tiêu chuẩn'}
                </Descriptions.Item>
                <Descriptions.Item label="Tạo lúc">
                  {formatDateTime(result.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật gần nhất">
                  {formatDateTime(result.updatedAt)}
                </Descriptions.Item>
              </Descriptions>
            </Col>
            <Col xs={24} lg={16}>
              <Typography.Title level={4}>Lịch sử xử lý</Typography.Title>
              <Steps
                direction="vertical"
                size="small"
                current={currentHistoryIndex}
                status={result.orderStatus === OrderStatus.CANCELLED ? 'error' : 'process'}
                items={result.statusHistory.map((history, index) => ({
                  title: orderStatusLabels[history.status],
                  description: formatDateTime(history.changedAt),
                  status:
                    result.orderStatus === OrderStatus.CANCELLED &&
                    history.status === OrderStatus.CANCELLED
                      ? 'error'
                      : index < currentHistoryIndex
                        ? 'finish'
                        : index === currentHistoryIndex
                          ? 'process'
                          : 'wait',
                }))}
              />
            </Col>
          </Row>
        </Card>
      ) : (
        <Alert
          className="order-tracking-note"
          type="info"
          showIcon
          message="Mã đơn và số điện thoại phải khớp với thông tin lúc đặt hàng."
        />
      )}
    </main>
  );
};
