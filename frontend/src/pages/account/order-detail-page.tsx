import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Image,
  Input,
  List,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderService } from '../../api/services/order.service';
import {
  OrderStatus,
  orderStatusLabels,
  paymentStatusLabels,
} from '../../types/order';
import type { Order } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

const statusColor: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'gold',
  [OrderStatus.CONFIRMED]: 'blue',
  [OrderStatus.PACKING]: 'cyan',
  [OrderStatus.SHIPPING]: 'geekblue',
  [OrderStatus.DELIVERED]: 'green',
  [OrderStatus.CANCELLED]: 'red',
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const OrderDetailPage = () => {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const loadOrder = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        setOrder(await orderService.getById(id));
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrder();
  }, [id]);

  const cancelOrder = async (): Promise<void> => {
    if (!order || cancellationReason.trim().length < 3) {
      message.warning('Vui lòng nhập lý do huỷ đơn (ít nhất 3 ký tự).');
      return;
    }

    setIsCancelling(true);

    try {
      setOrder(await orderService.cancel(order.id, cancellationReason.trim()));
      setIsCancelModalOpen(false);
      setCancellationReason('');
      message.success('Đơn hàng đã được huỷ và tồn kho đã được hoàn lại.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <Spin size="large" className="account-page-spinner" />;
  }

  if (!order) {
    return <Alert type="error" showIcon message={errorMessage ?? 'Không tìm thấy đơn hàng.'} />;
  }

  return (
    <Space direction="vertical" size="large" className="full-width order-detail-page">
      <div className="order-detail-heading">
        <div>
          <Link to="/account/orders" className="back-link">
            <ArrowLeftOutlined /> Quay lại đơn hàng
          </Link>
          <Typography.Title level={3}>Đơn {order.orderCode}</Typography.Title>
          <Space wrap>
            <Tag color={statusColor[order.orderStatus]}>
              {orderStatusLabels[order.orderStatus]}
            </Tag>
            <Typography.Text type="secondary">Tạo lúc {formatDateTime(order.createdAt)}</Typography.Text>
          </Space>
        </div>
        {order.orderStatus === OrderStatus.PENDING ? (
          <Button danger onClick={() => setIsCancelModalOpen(true)}>
            Huỷ đơn
          </Button>
        ) : null}
      </div>

      {order.cancellationReason ? (
        <Alert type="warning" showIcon message={`Lý do huỷ: ${order.cancellationReason}`} />
      ) : null}

      <Card title={<><ShoppingCartOutlined /> Sản phẩm đã đặt</>}>
        <List
          className="order-item-list"
          dataSource={order.items}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Image width={88} height={68} src={item.image} preview={false} />}
                title={<Link to={`/products/${item.slug}`}>{item.name}</Link>}
                description={`${item.color} / ${item.size} · SKU ${item.sku} · × ${item.quantity}`}
              />
              <Space direction="vertical" align="end" size={2}>
                <Typography.Text>{formatCurrency(item.unitPrice)}</Typography.Text>
                <Typography.Text strong className="cart-line-total">
                  {formatCurrency(item.totalPrice)}
                </Typography.Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={12}>
          <Card title={<><EnvironmentOutlined /> Địa chỉ giao hàng</>}>
            <Space direction="vertical" size={2}>
              <Typography.Text strong>{order.shippingAddress.recipientName}</Typography.Text>
              <Typography.Text>{order.shippingAddress.phone}</Typography.Text>
              <Typography.Text>
                {order.shippingAddress.addressLine}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.province}
              </Typography.Text>
              {order.shippingAddress.note ? (
                <Typography.Text type="secondary">Ghi chú: {order.shippingAddress.note}</Typography.Text>
              ) : null}
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<><FileTextOutlined /> Thanh toán</>}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Phương thức">{order.paymentMethod}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                {paymentStatusLabels[order.paymentStatus]}
              </Descriptions.Item>
              <Descriptions.Item label="Vận chuyển">{order.shippingMethod}</Descriptions.Item>
              {order.note ? <Descriptions.Item label="Ghi chú">{order.note}</Descriptions.Item> : null}
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title="Tổng thanh toán" className="order-total-card">
        <div className="checkout-summary-row">
          <Typography.Text>Tạm tính</Typography.Text>
          <Typography.Text>{formatCurrency(order.subtotal)}</Typography.Text>
        </div>
        <div className="checkout-summary-row">
          <Typography.Text>{order.voucher ? `Voucher ${order.voucher.code}` : 'Giảm giá'}</Typography.Text>
          <Typography.Text type={order.discount > 0 ? 'success' : undefined}>
            -{formatCurrency(order.discount)}
          </Typography.Text>
        </div>
        <div className="checkout-summary-row">
          <Typography.Text>Phí vận chuyển</Typography.Text>
          <Typography.Text>{formatCurrency(order.shippingFee)}</Typography.Text>
        </div>
        <Divider />
        <div className="checkout-summary-row checkout-total-row">
          <Typography.Text strong>Tổng cộng</Typography.Text>
          <Typography.Title level={3}>{formatCurrency(order.total)}</Typography.Title>
        </div>
      </Card>

      <Card title="Lịch sử trạng thái">
        <Timeline
          items={order.statusHistory.map((entry) => ({
            color: statusColor[entry.status],
            children: (
              <Space direction="vertical" size={0}>
                <Typography.Text strong>{orderStatusLabels[entry.status]}</Typography.Text>
                <Typography.Text type="secondary">{formatDateTime(entry.changedAt)}</Typography.Text>
                {entry.note ? <Typography.Text>{entry.note}</Typography.Text> : null}
              </Space>
            ),
          }))}
        />
      </Card>

      <Modal
        title="Huỷ đơn hàng"
        open={isCancelModalOpen}
        okText="Xác nhận huỷ"
        cancelText="Đóng"
        okButtonProps={{ danger: true, loading: isCancelling }}
        onOk={() => void cancelOrder()}
        onCancel={() => setIsCancelModalOpen(false)}
      >
        <Typography.Paragraph type="secondary">
          Bạn chỉ có thể tự huỷ đơn đang chờ xác nhận. Tồn kho và lượt dùng voucher sẽ được hoàn lại.
        </Typography.Paragraph>
        <Input.TextArea
          rows={3}
          maxLength={500}
          value={cancellationReason}
          placeholder="Nhập lý do huỷ đơn"
          onChange={(event) => setCancellationReason(event.target.value)}
        />
      </Modal>
    </Space>
  );
};
