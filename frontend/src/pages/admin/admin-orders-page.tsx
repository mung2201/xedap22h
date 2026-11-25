import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  DatePicker,
  Input,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RangePickerProps } from 'antd/es/date-picker';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminOrderService } from '../../api/services/admin-order.service';
import type { AdminOrderQuery } from '../../types/admin';
import {
  OrderStatus,
  PaymentStatus,
  getOrderPaymentLabel,
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
  [PaymentStatus.REFUND_PENDING]: 'orange',
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
  const [dateRangeValue, setDateRangeValue] = useState<RangePickerProps['value']>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadOrders = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);
      setResult(null);
      try {
        const query: AdminOrderQuery = {
          page,
          limit: 10,
          ...(keyword ? { keyword } : {}),
          ...(orderStatus ? { orderStatus } : {}),
          ...(paymentStatus ? { paymentStatus } : {}),
          ...(dateRange ? { startDate: dateRange[0], endDate: dateRange[1] } : {}),
        };
        const nextResult = await adminOrderService.getList(query, controller.signal);
        if (!controller.signal.aborted) setResult(nextResult);
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadOrders();
    return () => controller.abort();
  }, [page, keyword, orderStatus, paymentStatus, dateRange, reloadKey]);

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
          <Typography.Text>{getOrderPaymentLabel(order)}</Typography.Text>
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
          <EyeOutlined /> Chi tiết
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
          value={dateRangeValue}
          onChange={(dates) => {
            setDateRangeValue(dates);
            setDateRange(
              dates?.[0] && dates[1]
                ? [dates[0].startOf('day').toISOString(), dates[1].endOf('day').toISOString()]
                : null,
            );
            setPage(1);
          }}
        />
        <Button
          disabled={!searchInput && !keyword && !orderStatus && !paymentStatus && !dateRangeValue}
          onClick={() => {
            setSearchInput('');
            setKeyword(undefined);
            setOrderStatus(undefined);
            setPaymentStatus(undefined);
            setDateRange(null);
            setDateRangeValue(null);
            setPage(1);
          }}
        >
          Xóa bộ lọc
        </Button>
      </Space>

      {errorMessage ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải đơn hàng"
          description={errorMessage}
          action={<Button onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button>}
        />
      ) : (
        <Table
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={orders}
          pagination={false}
          scroll={{ x: 1120 }}
        />
      )}
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
