import { RightOutlined, ShoppingOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  List,
  Pagination,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../../api/services/order.service';
import {
  OrderStatus,
  orderStatusLabels,
} from '../../types/order';
import type { OrderListResult } from '../../types/order';
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

export const OrdersPage = () => {
  const [result, setResult] = useState<OrderListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadOrders = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);
      setResult(null);

      try {
        const nextResult = await orderService.getMine({ page, limit: 10, status }, controller.signal);
        if (!controller.signal.aborted) setResult(nextResult);
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadOrders();
    return () => controller.abort();
  }, [page, status, reloadKey]);

  const orders = result?.items ?? [];
  const meta = result?.meta;

  return (
    <Space direction="vertical" size="large" className="full-width">
      <div className="orders-page-heading">
        <div>
          <Typography.Title level={3}>Đơn hàng của tôi</Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi tiến trình và xem lại thông tin đã chốt tại thời điểm đặt hàng.
          </Typography.Text>
        </div>
        <Select
          allowClear
          className="orders-status-filter"
          value={status}
          placeholder="Tất cả trạng thái"
          onChange={(nextStatus) => {
            setStatus(nextStatus);
            setPage(1);
          }}
          options={Object.values(OrderStatus).map((value) => ({
            value,
            label: orderStatusLabels[value],
          }))}
        />
      </div>

      {isLoading ? (
        <Spin size="large" className="account-page-spinner" />
      ) : errorMessage ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải đơn hàng"
          description={errorMessage}
          action={<Button onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button>}
        />
      ) : orders.length ? (
        <>
          <List
            className="orders-list"
            dataSource={orders}
            renderItem={(order) => (
              <List.Item
                actions={[
                  <Link key="detail" to={`/account/orders/${order.id}`}>
                    <Button type="link" icon={<RightOutlined />}>
                      Chi tiết
                    </Button>
                  </Link>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space wrap>
                      <Typography.Text strong>{order.orderCode}</Typography.Text>
                      <Tag color={statusColor[order.orderStatus]}>
                        {orderStatusLabels[order.orderStatus]}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2}>
                      <Typography.Text type="secondary">
                        {formatDateTime(order.createdAt)} · {order.items.length} loại sản phẩm
                      </Typography.Text>
                      <Typography.Text>
                        Tổng thanh toán: <strong>{formatCurrency(order.total)}</strong>
                      </Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
          {meta && (meta.totalPages ?? 1) > 1 ? (
            <Pagination
              className="orders-pagination"
              current={page}
              pageSize={10}
              total={meta.total}
              showSizeChanger={false}
              onChange={setPage}
            />
          ) : null}
        </>
      ) : (
        <Empty description={status ? 'Không có đơn hàng ở trạng thái này' : 'Bạn chưa có đơn hàng'}>
          <Link to="/products">
            <Button type="primary" icon={<ShoppingOutlined />}>
              Mua sắm ngay
            </Button>
          </Link>
        </Empty>
      )}
    </Space>
  );
};
