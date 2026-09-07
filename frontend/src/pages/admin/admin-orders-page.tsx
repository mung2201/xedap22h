import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import {
  DatePicker,
  Input,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminOrderService } from '../../api/services/admin-order.service';
import type { AdminOrderQuery } from '../../types/admin';
import {
  OrderStatus,
  PaymentStatus,
  orderStatusLabels,
  paymentStatusLabels,
} from '../../types/order';
import type { Order, OrderListResult } from '../../types/order';
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

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const AdminOrdersPage = () => {
  const [result, setResult] = useState<OrderListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState<string>();
  const [orderStatus, setOrderStatus] = useState<OrderStatus>();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  const loadOrders = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const query: AdminOrderQuery = {
        page,
        limit: 10,
        ...(keyword ? { keyword } : {}),
        ...(orderStatus ? { orderStatus } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(dateRange ? { startDate: dateRange[0], endDate: dateRange[1] } : {}),
      };
      setResult(await adminOrderService.getList(query));
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword, orderStatus, paymentStatus, dateRange]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const columns: ColumnsType<Order> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderCode',
      key: 'orderCode',
      render: (value: string, order) => (
        <Link to={`/admin/orders/${order.id}`}>
          <Typography.Text strong>{value}</Typography.Text>
        </Link>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_, order) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{order.customerInfo.fullName}</Typography.Text>
          <Typography.Text type="secondary">{order.customerInfo.phone}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => <Typography.Text strong>{formatCurrency(value)}</Typography.Text>,
    },
    {
      title: 'Thanh toán',
      key: 'payment',
      render: (_, order) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>{order.paymentMethod}</Typography.Text>
          <Tag color={paymentStatusColor[order.paymentStatus]}>
            {paymentStatusLabels[order.paymentStatus]}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Đơn hàng',
      dataIndex: 'orderStatus',
      key: 'orderStatus',
      render: (value: OrderStatus) => (
        <Tag color={orderStatusColor[value]}>{orderStatusLabels[value]}</Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      render: (_, order) => (
        <Link to={`/admin/orders/${order.id}`}>
          <Typography.Link><EyeOutlined /> Chi tiết</Typography.Link>
        </Link>
      ),
    },
  ];

  const orders = result?.items ?? [];
  const meta = result?.meta;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>Đơn hàng</Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi, xử lý trạng thái, hoàn tồn kho và quản lý thanh toán đơn hàng.
          </Typography.Text>
        </div>
      </div>

      <Space wrap className="admin-order-filters">
        <Input.Search
          allowClear
          className="admin-order-search"
          value={searchInput}
          placeholder="Mã đơn, tên, email hoặc số điện thoại"
          enterButton={<SearchOutlined />}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setKeyword(value.trim() || undefined);
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="admin-order-filter-select"
          value={orderStatus}
          placeholder="Trạng thái đơn"
          options={Object.values(OrderStatus).map((value) => ({
            value,
            label: orderStatusLabels[value],
          }))}
          onChange={(value) => {
            setOrderStatus(value);
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="admin-order-filter-select"
          value={paymentStatus}
          placeholder="Trạng thái thanh toán"
          options={Object.values(PaymentStatus).map((value) => ({
            value,
            label: paymentStatusLabels[value],
          }))}
          onChange={(value) => {
            setPaymentStatus(value);
            setPage(1);
          }}
        />
        <DatePicker.RangePicker
          className="admin-order-date-range"
          onChange={(dates) => {
            setDateRange(
              dates?.[0] && dates[1]
                ? [dates[0].startOf('day').toISOString(), dates[1].endOf('day').toISOString()]
                : null,
            );
            setPage(1);
          }}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={orders}
        pagination={false}
        scroll={{ x: 1120 }}
      />
      {meta && (meta.totalPages ?? 1) > 1 ? (
        <Pagination
          className="admin-table-pagination"
          current={page}
          pageSize={10}
          total={meta.total}
          showSizeChanger={false}
          onChange={setPage}
        />
      ) : null}
    </section>
  );
};
