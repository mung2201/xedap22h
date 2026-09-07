import {
  BoxPlotOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  InboxOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  TruckOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  List,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { statisticsService } from '../../api/services/statistics.service';
import { DashboardPeriod } from '../../types/admin';
import type { DashboardStatistics } from '../../types/admin';
import { OrderStatus, orderStatusLabels } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

const periodLabels: Record<DashboardPeriod, string> = {
  [DashboardPeriod.LAST_7_DAYS]: '7 ngày gần đây',
  [DashboardPeriod.LAST_30_DAYS]: '30 ngày gần đây',
  [DashboardPeriod.THIS_MONTH]: 'Tháng này',
  [DashboardPeriod.THIS_YEAR]: 'Năm này',
  [DashboardPeriod.CUSTOM]: 'Khoảng ngày tùy chọn',
};

const orderStatusColors: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'gold',
  [OrderStatus.CONFIRMED]: 'blue',
  [OrderStatus.PACKING]: 'cyan',
  [OrderStatus.SHIPPING]: 'geekblue',
  [OrderStatus.DELIVERED]: 'green',
  [OrderStatus.CANCELLED]: 'red',
};

const formatShortDate = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', { month: '2-digit', day: '2-digit' }).format(
    new Date(value),
  );

const formatRange = (startDate: string, endDate: string): string =>
  `${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(
    new Date(startDate),
  )} – ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(
    new Date(endDate),
  )}`;

const getBarHeight = (value: number, maximum: number): string =>
  value > 0 ? `${Math.max((value / maximum) * 100, 3)}%` : '0%';

export const AdminDashboardPage = () => {
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
  const [period, setPeriod] = useState(DashboardPeriod.LAST_30_DAYS);
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async (): Promise<void> => {
    if (period === DashboardPeriod.CUSTOM && !customRange) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      setStatistics(
        await statisticsService.getDashboard({
          period,
          ...(customRange
            ? { startDate: customRange[0], endDate: customRange[1] }
            : {}),
        }),
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [period, customRange]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const maxRevenue = useMemo(
    () => Math.max(...(statistics?.revenueByDay.map((item) => item.revenue) ?? [0]), 1),
    [statistics],
  );
  const maxMonthlyRevenue = useMemo(
    () => Math.max(...(statistics?.revenueByMonth.map((item) => item.revenue) ?? [0]), 1),
    [statistics],
  );
  const maxOrderCount = useMemo(
    () => Math.max(...(statistics?.ordersByStatus.map((item) => item.count) ?? [0]), 1),
    [statistics],
  );

  const topProductColumns: ColumnsType<DashboardStatistics['topProducts'][number]> = [
    {
      title: 'Sản phẩm',
      key: 'name',
      render: (_, product) => (
        <Space>
          <img className="dashboard-product-image" src={product.image} alt="" />
          <Link to={`/admin/products/${product.productId}/edit`}>{product.name}</Link>
        </Space>
      ),
    },
    {
      title: 'Đã bán',
      dataIndex: 'soldQuantity',
      key: 'soldQuantity',
      width: 90,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => formatCurrency(value),
    },
  ];

  const topCategoryColumns: ColumnsType<DashboardStatistics['topCategories'][number]> = [
    { title: 'Danh mục', dataIndex: 'name', key: 'name' },
    { title: 'Đã bán', dataIndex: 'soldQuantity', key: 'soldQuantity', width: 90 },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (value: number) => formatCurrency(value),
    },
  ];

  return (
    <section className="admin-page admin-dashboard-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>Tổng quan cửa hàng</Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi doanh thu, đơn hàng, tồn kho và hiệu quả bán hàng theo thời gian thực.
          </Typography.Text>
        </div>
        <Space wrap className="dashboard-toolbar">
          <Select
            className="dashboard-period-select"
            value={period}
            options={Object.values(DashboardPeriod).map((value) => ({
              value,
              label: periodLabels[value],
            }))}
            onChange={(nextPeriod) => {
              setPeriod(nextPeriod);
              if (nextPeriod !== DashboardPeriod.CUSTOM) {
                setCustomRange(null);
              }
            }}
          />
          {period === DashboardPeriod.CUSTOM ? (
            <DatePicker.RangePicker
              className="dashboard-custom-range"
              onChange={(dates) => {
                if (dates?.[0] && dates[1]) {
                  setCustomRange([
                    dates[0].format('YYYY-MM-DD'),
                    dates[1].format('YYYY-MM-DD'),
                  ]);
                } else {
                  setCustomRange(null);
                }
              }}
            />
          ) : null}
          <Button
            icon={<ReloadOutlined />}
            loading={isLoading}
            onClick={() => void loadDashboard()}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

      {isLoading && !statistics ? (
        <div className="admin-dashboard-loading">
          <Spin size="large" />
        </div>
      ) : statistics ? (
        <Space direction="vertical" size="large" className="full-width">
          <Alert
            type="info"
            showIcon
            message={`${periodLabels[statistics.range.period]}: ${formatCurrency(
              statistics.summary.rangeRevenue,
            )} từ ${statistics.summary.rangeOrderCount} đơn thanh toán thành công (${formatRange(
              statistics.range.startDate,
              statistics.range.endDate,
            )}).`}
          />

          <Row gutter={[18, 18]}>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card">
                <Statistic
                  title="Tổng doanh thu"
                  value={statistics.summary.totalRevenue}
                  prefix={<DollarOutlined />}
                  formatter={(value) => formatCurrency(Number(value))}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card">
                <Statistic
                  title="Doanh thu hôm nay"
                  value={statistics.summary.revenueToday}
                  prefix={<DollarOutlined />}
                  formatter={(value) => formatCurrency(Number(value))}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card">
                <Statistic
                  title="Doanh thu tháng"
                  value={statistics.summary.revenueThisMonth}
                  prefix={<DollarOutlined />}
                  formatter={(value) => formatCurrency(Number(value))}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card">
                <Statistic
                  title={`Doanh thu ${periodLabels[statistics.range.period].toLocaleLowerCase('vi-VN')}`}
                  value={statistics.summary.rangeRevenue}
                  prefix={<DollarOutlined />}
                  formatter={(value) => formatCurrency(Number(value))}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card">
                <Statistic
                  title="Tổng đơn hàng"
                  value={statistics.summary.totalOrders}
                  prefix={<ShoppingCartOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card">
                <Statistic title="Đơn chờ xử lý" value={statistics.summary.pendingOrders} prefix={<InboxOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card">
                <Statistic title="Đang giao" value={statistics.summary.shippingOrders} prefix={<TruckOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card">
                <Statistic title="Đã hoàn thành" value={statistics.summary.completedOrders} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card">
                <Statistic title="Người dùng" value={statistics.summary.totalUsers} prefix={<TeamOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card">
                <Statistic title="Sản phẩm" value={statistics.summary.totalProducts} prefix={<BoxPlotOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card dashboard-warning-card">
                <Statistic title="Sắp hết hàng" value={statistics.summary.lowStockProducts} prefix={<WarningOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Card className="dashboard-stat-card dashboard-danger-card">
                <Statistic title="Hết hàng" value={statistics.summary.outOfStockProducts} prefix={<WarningOutlined />} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]}>
            <Col xs={24}>
              <Card title="Doanh thu theo tháng" className="dashboard-chart-card">
                {statistics.revenueByMonth.length ? (
                  <div className="revenue-bar-chart revenue-monthly-bar-chart">
                    {statistics.revenueByMonth.map((item) => (
                      <div
                        key={item.month}
                        className="revenue-bar-item"
                        title={`${item.month}: ${formatCurrency(item.revenue)}`}
                      >
                        <span className="revenue-bar-value">{formatCurrency(item.revenue)}</span>
                        <div className="revenue-bar-track">
                          <div
                            className="revenue-bar"
                            style={{ height: getBarHeight(item.revenue, maxMonthlyRevenue) }}
                          />
                        </div>
                        <span className="revenue-bar-label">{item.month}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="Chưa có doanh thu theo tháng." />
                )}
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]}>
            <Col xs={24} xl={15}>
              <Card title="Doanh thu theo ngày" className="dashboard-chart-card">
                {statistics.revenueByDay.length ? (
                  <div className="revenue-bar-chart">
                    {statistics.revenueByDay.map((item) => (
                      <div key={item.date} className="revenue-bar-item" title={`${item.date}: ${formatCurrency(item.revenue)}`}>
                        <span className="revenue-bar-value">{formatCurrency(item.revenue)}</span>
                        <div className="revenue-bar-track">
                          <div
                            className="revenue-bar"
                            style={{ height: getBarHeight(item.revenue, maxRevenue) }}
                          />
                        </div>
                        <span className="revenue-bar-label">{formatShortDate(item.date)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="Chưa có doanh thu trong khoảng thời gian này." />
                )}
              </Card>
            </Col>
            <Col xs={24} xl={9}>
              <Card title="Đơn theo trạng thái">
                <Space direction="vertical" size="middle" className="full-width">
                  {Object.values(OrderStatus).map((status) => {
                    const count =
                      statistics.ordersByStatus.find((item) => item.status === status)?.count ?? 0;
                    return (
                      <div key={status} className="dashboard-status-progress">
                        <Space className="dashboard-status-progress-label">
                          <Tag color={orderStatusColors[status]}>{orderStatusLabels[status]}</Tag>
                          <Typography.Text>{count} đơn</Typography.Text>
                        </Space>
                        <Progress percent={Math.round((count / maxOrderCount) * 100)} showInfo={false} />
                      </div>
                    );
                  })}
                </Space>
              </Card>
            </Col>
          </Row>

          <Row gutter={[20, 20]}>
            <Col xs={24} xl={12}>
              <Card title="Top sản phẩm bán chạy">
                <Table
                  rowKey="productId"
                  size="small"
                  columns={topProductColumns}
                  dataSource={statistics.topProducts}
                  pagination={false}
                  scroll={{ x: 520 }}
                  locale={{ emptyText: 'Chưa có dữ liệu bán hàng.' }}
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card title="Top danh mục">
                <Table
                  rowKey={(category) => category.categoryId ?? category.name}
                  size="small"
                  columns={topCategoryColumns}
                  dataSource={statistics.topCategories}
                  pagination={false}
                  scroll={{ x: 500 }}
                  locale={{ emptyText: 'Chưa có dữ liệu bán hàng.' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="Sản phẩm tồn kho thấp">
            {statistics.lowStockItems.length ? (
              <List
                className="dashboard-low-stock-list"
                dataSource={statistics.lowStockItems}
                renderItem={(product) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<img className="dashboard-product-image" src={product.thumbnail} alt="" />}
                      title={<Link to={`/admin/products/${product.productId}/edit`}>{product.name}</Link>}
                      description={`Tồn kho hiện tại: ${product.availableStock}`}
                    />
                    <Tag color={product.availableStock === 0 ? 'red' : 'orange'}>
                      {product.availableStock === 0 ? 'Hết hàng' : `${product.availableStock} sản phẩm`}
                    </Tag>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Không có sản phẩm tồn kho thấp." />
            )}
          </Card>
        </Space>
      ) : null}
    </section>
  );
};
