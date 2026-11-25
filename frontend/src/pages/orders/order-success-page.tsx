import { CheckCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Result, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderService } from '../../api/services/order.service';
import type { Order } from '../../types/order';
import { OrderStatus, PaymentMethod, PaymentStatus, paymentStatusLabels } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

export const OrderSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setOrder(null);
    setErrorMessage(null);
    if (!orderId) {
      setErrorMessage('Không tìm thấy mã đơn hàng.');
      return () => controller.abort();
    }

    void orderService
      .getById(orderId, controller.signal)
      .then((nextOrder) => { if (!controller.signal.aborted) setOrder(nextOrder); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setErrorMessage(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [orderId, reloadKey]);

  if (errorMessage) {
    return (
      <main className="page-container order-success-page">
        <Alert
          type="error"
          showIcon
          message={errorMessage}
          action={orderId ? <Button onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button> : undefined}
        />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="page-container order-success-page order-success-loading">
        <Spin size="large" />
      </main>
    );
  }

  const isAwaitingOnlinePayment = order.paymentMethod === PaymentMethod.ONLINE &&
    order.paymentStatus === PaymentStatus.UNPAID && order.orderStatus !== OrderStatus.CANCELLED;
  const notificationNote = order.orderStatus === OrderStatus.CANCELLED
    ? null
    : order.paymentMethod === PaymentMethod.COD
      ? 'Cửa hàng gửi email xác nhận sau khi đặt hàng COD thành công.'
      : isAwaitingOnlinePayment
        ? 'Email xác nhận thanh toán chỉ được gửi sau khi hệ thống ghi nhận đã nhận đủ tiền.'
        : order.paymentStatus === PaymentStatus.PAID
          ? 'Cửa hàng gửi email xác nhận khi hệ thống ghi nhận thanh toán thành công.'
          : null;

  return (
    <main className="page-container order-success-page">
      <Result
        icon={<CheckCircleOutlined />}
        status={order.orderStatus === OrderStatus.CANCELLED ? 'warning' : 'success'}
        title={order.orderStatus === OrderStatus.CANCELLED ? 'Đơn hàng đã bị huỷ' : isAwaitingOnlinePayment ? 'Đơn hàng đã tạo, chờ thanh toán' : 'Đặt hàng thành công'}
        subTitle={
          <>
            <Typography.Paragraph>
              Mã đơn {order.orderCode} · Tổng thanh toán {formatCurrency(order.total)} · {paymentStatusLabels[order.paymentStatus]}
            </Typography.Paragraph>
            {notificationNote ? <Typography.Text type="secondary">{notificationNote}</Typography.Text> : null}
          </>
        }
        extra={[
          order.paymentMethod === PaymentMethod.ONLINE &&
          order.paymentStatus === PaymentStatus.UNPAID &&
          order.orderStatus !== OrderStatus.CANCELLED && order.paymentReference ? (
            <Link key="payment" to={`/payment/qr?${new URLSearchParams({ orderCode: order.orderCode, paymentRef: order.paymentReference }).toString()}`}>
              <Button type="primary">Tiếp tục thanh toán</Button>
            </Link>
          ) : null,
          <Link key="detail" to={`/account/orders/${order.id}`}>
            <Button type="primary">Xem chi tiết đơn</Button>
          </Link>,
          <Link key="products" to="/products">
            <Button>Tiếp tục mua sắm</Button>
          </Link>,
        ]}
      />
    </main>
  );
};
