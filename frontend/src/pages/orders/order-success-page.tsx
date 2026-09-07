import { CheckCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Result, Spin, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orderService } from '../../api/services/order.service';
import type { Order } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

export const OrderSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setErrorMessage('Không tìm thấy mã đơn hàng.');
      return;
    }

    void orderService
      .getById(orderId)
      .then(setOrder)
      .catch((error: unknown) => setErrorMessage(getErrorMessage(error)));
  }, [orderId]);

  if (errorMessage) {
    return (
      <main className="page-container order-success-page">
        <Alert type="error" showIcon message={errorMessage} />
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

  return (
    <main className="page-container order-success-page">
      <Result
        icon={<CheckCircleOutlined />}
        status="success"
        title="Đặt hàng thành công"
        subTitle={
          <Typography.Text>
            Mã đơn {order.orderCode} · Tổng thanh toán {formatCurrency(order.total)}
          </Typography.Text>
        }
        extra={[
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
