import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  SaveOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Image,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminOrderService } from '../../api/services/admin-order.service';
import {
  OrderStatus,
  PaymentStatus,
  orderStatusLabels,
  paymentStatusLabels,
} from '../../types/order';
import type { Order } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

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

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PACKING, OrderStatus.CANCELLED],
  [OrderStatus.PACKING]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

interface StatusFormValues {
  orderStatus: OrderStatus;
  note?: string;
}

export const AdminOrderDetailPage = () => {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form] = Form.useForm<StatusFormValues>();

  useEffect(() => {
    const loadOrder = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        setOrder(await adminOrderService.getById(id));
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadOrder();
  }, [id]);

  const nextStatuses = useMemo(
    () => (order ? allowedTransitions[order.orderStatus] : []),
    [order],
  );

  const openStatusModal = (): void => {
    const nextStatus = nextStatuses[0];
    if (!nextStatus) {
      return;
    }
    form.setFieldsValue({ orderStatus: nextStatus, note: undefined });
    setIsModalOpen(true);
  };

  const saveStatus = async (values: StatusFormValues): Promise<void> => {
    if (!order) {
      return;
    }

    if (values.orderStatus === OrderStatus.CANCELLED && !values.note?.trim()) {
      form.setFields([
        { name: 'note', errors: ['Nhập lý do hủy đơn hàng.'] },
      ]);
      return;
    }

    setIsSaving(true);
    try {
      const updatedOrder = await adminOrderService.updateStatus(order.id, {
        orderStatus: values.orderStatus,
        ...(values.note?.trim() ? { note: values.note.trim() } : {}),
      });
      setOrder(updatedOrder);
      setIsModalOpen(false);
      form.resetFields();
      message.success('Đã cập nhật trạng thái đơn hàng.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Spin size="large" className="admin-page-spinner" />;
  }

  if (!order) {
    return <Alert type="error" showIcon message={errorMessage ?? 'Không tìm thấy đơn hàng.'} />;
  }

  return (
    <section className="admin-page admin-order-detail-page">
      <div className="admin-order-detail-heading">
        <div>
          <Link to="/admin/orders" className="back-link">
            <ArrowLeftOutlined /> Quay lại đơn hàng
          </Link>
          <Typography.Title level={2}>Đơn {order.orderCode}</Typography.Title>
          <Space wrap>
            <Tag color={orderStatusColor[order.orderStatus]}>{orderStatusLabels[order.orderStatus]}</Tag>
            <Tag color={paymentStatusColor[order.paymentStatus]}>{paymentStatusLabels[order.paymentStatus]}</Tag>
            <Typography.Text type="secondary">Tạo lúc {formatDateTime(order.createdAt)}</Typography.Text>
          </Space>
        </div>
        {nextStatuses.length ? (
          <Button type="primary" icon={<SaveOutlined />} onClick={openStatusModal}>
            Cập nhật trạng thái
          </Button>
        ) : null}
      </div>

      {order.cancellationReason ? (
        <Alert type="warning" showIcon message={`Lý do hủy: ${order.cancellationReason}`} />
      ) : null}

      <Card title={<><ShoppingCartOutlined /> Sản phẩm đã đặt</>} className="admin-order-section-card">
        <Space direction="vertical" size="middle" className="full-width">
          {order.items.map((item) => (
            <div key={`${item.productId}-${item.variantId}`} className="admin-order-item-row">
              <Space>
                <Image width={82} height={64} src={item.image} preview={false} />
                <Space direction="vertical" size={0}>
                  <Typography.Text strong>{item.name}</Typography.Text>
                  <Typography.Text type="secondary">
                    {item.color} / {item.size} · SKU {item.sku} · × {item.quantity}
                  </Typography.Text>
                </Space>
              </Space>
              <Space direction="vertical" align="end" size={0}>
                <Typography.Text>{formatCurrency(item.unitPrice)}</Typography.Text>
                <Typography.Text strong>{formatCurrency(item.totalPrice)}</Typography.Text>
              </Space>
            </div>
          ))}
        </Space>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <Card title={<><EnvironmentOutlined /> Khách hàng & giao hàng</>} className="admin-order-section-card">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Khách hàng">{order.customerInfo.fullName}</Descriptions.Item>
              <Descriptions.Item label="Email">{order.customerInfo.email}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{order.shippingAddress.phone}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">
                {order.shippingAddress.addressLine}, {order.shippingAddress.ward}, {order.shippingAddress.district}, {order.shippingAddress.province}
              </Descriptions.Item>
              {order.shippingAddress.note ? (
                <Descriptions.Item label="Ghi chú giao hàng">{order.shippingAddress.note}</Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title={<><FileTextOutlined /> Thanh toán</>} className="admin-order-section-card">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Phương thức">{order.paymentMethod}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">{paymentStatusLabels[order.paymentStatus]}</Descriptions.Item>
              <Descriptions.Item label="Vận chuyển">{order.shippingMethod}</Descriptions.Item>
              {order.voucher ? (
                <Descriptions.Item label="Voucher">{order.voucher.code}</Descriptions.Item>
              ) : null}
              {order.note ? <Descriptions.Item label="Ghi chú">{order.note}</Descriptions.Item> : null}
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <Card title="Tổng thanh toán" className="admin-order-section-card">
            <div className="checkout-summary-row">
              <Typography.Text>Tạm tính</Typography.Text>
              <Typography.Text>{formatCurrency(order.subtotal)}</Typography.Text>
            </div>
            <div className="checkout-summary-row">
              <Typography.Text>Giảm giá</Typography.Text>
              <Typography.Text type={order.discount > 0 ? 'success' : undefined}>-{formatCurrency(order.discount)}</Typography.Text>
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
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Lịch sử trạng thái" className="admin-order-section-card">
            <Timeline
              items={order.statusHistory.map((entry) => ({
                color: orderStatusColor[entry.status],
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
        </Col>
      </Row>

      <Modal
        title="Cập nhật trạng thái đơn hàng"
        open={isModalOpen}
        footer={null}
        destroyOnHidden
        onCancel={() => setIsModalOpen(false)}
      >
        <Form<StatusFormValues> form={form} layout="vertical" onFinish={saveStatus}>
          <Form.Item name="orderStatus" label="Trạng thái tiếp theo" rules={[{ required: true }]}>
            <Select
              options={nextStatuses.map((status) => ({
                value: status,
                label: orderStatusLabels[status],
              }))}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú / lý do hủy">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Typography.Paragraph type="secondary">
            Khi hủy, hệ thống hoàn tồn kho và lượt dùng voucher trong cùng transaction. Đơn COD được đánh dấu đã thanh toán khi chuyển sang Đã giao.
          </Typography.Paragraph>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu thay đổi
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
