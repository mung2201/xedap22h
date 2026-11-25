import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  DownloadOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Image,
  Segmented,
  Select,
  Skeleton,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import datePickerLocale from 'antd/es/date-picker/locale/vi_VN';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { statisticsService } from '../../api/services/statistics.service';
import {
  downloadDashboardReport,
  formatReportDate,
  formatReportTimestamp,
} from '../../components/admin/dashboard-report-export';
import type { RevenueGranularity } from '../../components/admin/dashboard-report-export';
import { DashboardRevenueChart } from '../../components/admin/dashboard-revenue-chart';
import { useAuthStore } from '../../stores/auth.store';
import { DashboardPeriod } from '../../types/admin';
import type { DashboardStatistics } from '../../types/admin';
import { Permission, UserRole } from '../../types/auth';
import { OrderStatus, orderStatusLabels } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';
import '../../styles/admin-dashboard.css';

const periodLabels: Record<DashboardPeriod, string> = {
  [DashboardPeriod.LAST_7_DAYS]: '7 ngày gần đây',
  [DashboardPeriod.LAST_30_DAYS]: '30 ngày gần đây',
  [DashboardPeriod.THIS_MONTH]: 'Tháng này',
  [DashboardPeriod.THIS_YEAR]: 'Năm nay',
  [DashboardPeriod.CUSTOM]: 'Tùy chọn ngày',
};

const orderStatusColors: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: '#b45309',
  [OrderStatus.CONFIRMED]: '#4f46e5',
  [OrderStatus.PACKING]: '#0891b2',
  [OrderStatus.SHIPPING]: '#2563eb',
  [OrderStatus.DELIVERED]: '#0f766e',
  [OrderStatus.CANCELLED]: '#dc2626',
};

const countFormatter = new Intl.NumberFormat('vi-VN');
const formatCount = (value: number) => countFormatter.format(value);
const percentFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const rangeLabel = (statistics: DashboardStatistics) =>
  `${formatReportDate(statistics.range.startDate)} – ${formatReportDate(statistics.range.endDate)}`;

const productImageFallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"%3E%3Crect width="48" height="48" rx="8" fill="%23f1f5f9"/%3E%3Cpath d="M14 17h20v16H14zM14 28l6-6 6 6 4-4 4 4" fill="none" stroke="%2394a3b8" stroke-width="2"/%3E%3C/svg%3E';

const ProductThumbnail = ({ src }: { src: string }) => (
  <Image
    className="report-product-image"
    src={src || productImageFallback}
    fallback={productImageFallback}
    width={44}
    height={44}
    alt=""
    preview={false}
    loading="lazy"
  />
);

export const AdminDashboardPage = () => {
  const { message } = App.useApp();
  const user = useAuthStore((state) => state.user);
  const canManageProducts = user?.role === UserRole.ADMIN
    || Boolean(user?.permissions.includes(Permission.MANAGE_PRODUCTS));
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
  const [period, setPeriod] = useState(DashboardPeriod.LAST_30_DAYS);
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [chartPreference, setChartPreference] = useState<RevenueGranularity | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const awaitingCustomRange = period === DashboardPeriod.CUSTOM && !customRange;
  const customRangeTooLong = period === DashboardPeriod.CUSTOM && customRange
    ? (Date.parse(customRange[1]) - Date.parse(customRange[0])) / 86_400_000 + 1 > 366
    : false;
  const invalidSelection = awaitingCustomRange || customRangeTooLong;

  const loadDashboard = useCallback(async (): Promise<void> => {
    activeRequest.current?.abort();
    if (invalidSelection) {
      setIsLoading(false);
      setErrorMessage(null);
      return;
    }

    const controller = new AbortController();
    activeRequest.current = controller;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await statisticsService.getDashboard({
        period,
        ...(period === DashboardPeriod.CUSTOM && customRange
          ? { startDate: customRange[0], endDate: customRange[1] }
          : {}),
      }, controller.signal);
      if (!controller.signal.aborted) {
        setStatistics(result);
        setUpdatedAt(new Date());
      }
    } catch (error) {
      if (!controller.signal.aborted) setErrorMessage(getErrorMessage(error));
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [period, customRange, invalidSelection]);

  useEffect(() => {
    void loadDashboard();
    return () => activeRequest.current?.abort();
  }, [loadDashboard]);

  const granularity = chartPreference ?? ((statistics?.revenueByDay.length ?? 0) > 60 ? 'month' : 'day');
  const createdOrders = statistics?.ordersByStatus.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const summary = statistics?.summary;
  const averageOrderValue = summary?.rangeOrderCount ? summary.rangeRevenue / summary.rangeOrderCount : null;
  const chartPoints = statistics
    ? granularity === 'day'
      ? statistics.revenueByDay.map((item) => ({ ...item, label: item.date }))
      : statistics.revenueByMonth.map((item) => ({ ...item, label: item.month }))
    : [];

  const topProductColumns: ColumnsType<DashboardStatistics['topProducts'][number]> = [
    {
      title: 'Sản phẩm',
      key: 'name',
      render: (_, product, index) => (
        <div className="report-product-cell">
          <span className="report-rank">{index + 1}</span>
          <ProductThumbnail src={product.image} />
          {canManageProducts
            ? <Link to={`/admin/products/${product.productId}/edit`}>{product.name}</Link>
            : <span>{product.name}</span>}
        </div>
      ),
    },
    { title: 'Đã bán', dataIndex: 'soldQuantity', key: 'soldQuantity', width: 78, align: 'right', render: formatCount },
    { title: 'Giá trị hàng bán', dataIndex: 'revenue', key: 'revenue', width: 160, align: 'right', render: (value: number) => <strong className="report-money">{formatCurrency(value)}</strong> },
  ];

  const topCategoryColumns: ColumnsType<DashboardStatistics['topCategories'][number]> = [
    {
      title: 'Danh mục',
      key: 'name',
      render: (_, category, index) => <div className="report-category-cell"><span className="report-rank">{index + 1}</span><span>{category.name === 'Uncategorized' ? 'Chưa phân loại' : category.name}</span></div>,
    },
    { title: 'Đã bán', dataIndex: 'soldQuantity', key: 'soldQuantity', width: 78, align: 'right', render: formatCount },
    { title: 'Giá trị hàng bán', dataIndex: 'revenue', key: 'revenue', width: 155, align: 'right', render: (value: number) => <strong className="report-money">{formatCurrency(value)}</strong> },
  ];

  const stockColumns: ColumnsType<DashboardStatistics['lowStockItems'][number]> = [
    {
      title: 'Sản phẩm',
      key: 'name',
      render: (_, product) => (
        <div className="report-product-cell">
          <ProductThumbnail src={product.thumbnail} />
          {canManageProducts
            ? <Link to={`/admin/products/${product.productId}/edit`}>{product.name}</Link>
            : <span>{product.name}</span>}
        </div>
      ),
    },
    { title: 'Tồn có thể bán', dataIndex: 'availableStock', key: 'stock', width: 130, align: 'right', render: formatCount },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 130,
      render: (_, product) => <Tag className={`report-stock-tag ${product.availableStock === 0 ? 'is-empty' : 'is-low'}`}>{product.availableStock === 0 ? 'Hết hàng' : 'Sắp hết hàng'}</Tag>,
    },
  ];

  return (
    <section className="admin-page admin-dashboard-page">
      <div className="report-heading">
        <div>
          <span className="report-eyebrow">HIỆU QUẢ KINH DOANH</span>
          <Typography.Title level={2}>Báo cáo & thống kê</Typography.Title>
          <Typography.Paragraph>Theo dõi kết quả bán hàng và những việc cửa hàng cần xử lý.</Typography.Paragraph>
        </div>
        <div className="report-heading-actions">
          <Button icon={<ReloadOutlined />} loading={isLoading} disabled={invalidSelection} onClick={() => void loadDashboard()}>Làm mới</Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            disabled={!statistics || !updatedAt || isLoading || invalidSelection || Boolean(errorMessage)}
            onClick={() => {
              if (statistics && updatedAt) {
                downloadDashboardReport(statistics, granularity, updatedAt);
                void message.success('Đã xuất báo cáo CSV.');
              }
            }}
          >Xuất báo cáo</Button>
        </div>
      </div>

      <div className="report-filters">
        <div className="report-filter-controls">
          <span className="report-filter-label"><CalendarOutlined /> Kỳ báo cáo</span>
          <Select
            aria-label="Kỳ báo cáo"
            className="report-period-select"
            value={period}
            options={Object.values(DashboardPeriod).map((value) => ({ value, label: periodLabels[value] }))}
            onChange={(nextPeriod) => {
              setPeriod(nextPeriod);
              setChartPreference(null);
              if (nextPeriod !== DashboardPeriod.CUSTOM) setCustomRange(null);
            }}
          />
          {period === DashboardPeriod.CUSTOM ? (
            <DatePicker.RangePicker
              aria-label="Khoảng ngày báo cáo"
              className="report-custom-range"
              locale={datePickerLocale}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              status={customRangeTooLong ? 'error' : undefined}
              onChange={(dates) => {
                setChartPreference(null);
                setCustomRange(dates?.[0] && dates[1]
                  ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
                  : null);
              }}
            />
          ) : null}
        </div>
        <span className="report-timezone">Giờ Việt Nam · UTC+7</span>
      </div>

      {invalidSelection ? (
        <Alert className="report-alert" type={customRangeTooLong ? 'warning' : 'info'} showIcon message={customRangeTooLong ? 'Vui lòng chọn khoảng thời gian tối đa 366 ngày.' : 'Chọn ngày bắt đầu và ngày kết thúc để xem báo cáo.'} />
      ) : null}
      {errorMessage ? (
        <Alert
          className="report-alert"
          type="error"
          showIcon
          message="Không thể tải báo cáo"
          description={`${errorMessage}${statistics ? ` Dữ liệu bên dưới vẫn thuộc kỳ ${rangeLabel(statistics)}, chưa được cập nhật.` : ''}`}
          action={<Button size="small" onClick={() => void loadDashboard()}>Thử lại</Button>}
        />
      ) : null}

      {isLoading && !statistics ? (
        <div className="report-skeleton" aria-label="Đang tải báo cáo" role="status">
          <div className="report-kpi-grid">{Array.from({ length: 4 }, (_, index) => <Card key={index}><Skeleton active title paragraph={{ rows: 2 }} /></Card>)}</div>
          <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
        </div>
      ) : statistics && summary && !invalidSelection ? (
        <Spin spinning={isLoading} tip="Đang cập nhật báo cáo…" wrapperClassName="report-loading-wrapper">
          <div className="report-content" aria-busy={isLoading}>
            <div className="report-section-heading">
              <div><h3>Kết quả trong kỳ</h3><p>{rangeLabel(statistics)}</p></div>
              {updatedAt ? <span className="report-updated"><span className={errorMessage ? 'is-stale' : ''} />Cập nhật {formatReportTimestamp(updatedAt)}</span> : null}
            </div>

            <div className="report-kpi-grid">
              <Card className="report-kpi report-kpi-primary">
                <div className="report-kpi-label"><span>Doanh thu đã thanh toán</span><DollarOutlined /></div>
                <strong className="report-kpi-value">{formatCurrency(summary.rangeRevenue)}</strong>
                <p>Sau giảm giá, gồm phí giao hàng</p>
              </Card>
              <Card className="report-kpi">
                <div className="report-kpi-label"><span>Đơn đã thanh toán</span><CheckCircleOutlined className="report-text-success" /></div>
                <strong className="report-kpi-value">{formatCount(summary.rangeOrderCount)}<small>đơn</small></strong>
                <p>Ghi nhận thanh toán trong kỳ</p>
              </Card>
              <Card className="report-kpi">
                <div className="report-kpi-label"><span>Đơn được tạo</span><ShoppingCartOutlined /></div>
                <strong className="report-kpi-value">{formatCount(createdOrders)}<small>đơn</small></strong>
                <p>Mọi trạng thái, theo ngày tạo</p>
              </Card>
              <Card className="report-kpi">
                <div className="report-kpi-label"><span>Giá trị đơn bình quân</span><Tooltip title="Doanh thu đã thanh toán chia cho số đơn đã thanh toán trong kỳ."><InfoCircleOutlined tabIndex={0} aria-label="Cách tính giá trị đơn bình quân" /></Tooltip></div>
                <strong className="report-kpi-value">{averageOrderValue === null ? '—' : formatCurrency(averageOrderValue)}</strong>
                <p>{averageOrderValue === null ? 'Chưa có đơn thanh toán' : 'Bình quân mỗi đơn đã thanh toán'}</p>
              </Card>
            </div>

            <div className="report-chart-grid">
              <Card className="report-card report-revenue-card">
                <div className="report-card-heading">
                  <div><h3>Diễn biến doanh thu</h3><p>Khoản thanh toán được ghi nhận trong kỳ</p></div>
                  <Segmented<RevenueGranularity>
                    aria-label="Độ chi tiết biểu đồ"
                    value={granularity}
                    options={[{ label: 'Theo ngày', value: 'day' }, { label: 'Theo tháng', value: 'month' }]}
                    onChange={setChartPreference}
                  />
                </div>
                <DashboardRevenueChart key={`${statistics.range.startDate}-${statistics.range.endDate}-${granularity}`} points={chartPoints} granularity={granularity} />
              </Card>
              <Card className="report-card report-status-card">
                <div className="report-card-heading"><div><h3>Trạng thái đơn hàng</h3><p>{formatCount(createdOrders)} đơn được tạo trong kỳ</p></div></div>
                {createdOrders ? (
                  <div className="report-status-stack" aria-label="Tỷ trọng trạng thái đơn hàng">
                    {Object.values(OrderStatus).map((status) => {
                      const count = statistics.ordersByStatus.find((item) => item.status === status)?.count ?? 0;
                      return count ? <Tooltip key={status} title={`${orderStatusLabels[status]}: ${formatCount(count)} đơn`}><span style={{ width: `${count / createdOrders * 100}%`, background: orderStatusColors[status] }} /></Tooltip> : null;
                    })}
                  </div>
                ) : <div className="report-no-orders">Chưa có đơn hàng được tạo trong kỳ.</div>}
                <div className="report-status-list">
                  {Object.values(OrderStatus).map((status) => {
                    const count = statistics.ordersByStatus.find((item) => item.status === status)?.count ?? 0;
                    return (
                      <div key={status} className="report-status-row">
                        <span className="report-status-name"><i style={{ background: orderStatusColors[status] }} />{orderStatusLabels[status]}</span>
                        <strong>{formatCount(count)}</strong>
                        <span className="report-status-percent">{percentFormatter.format(createdOrders ? count / createdOrders * 100 : 0)}%</span>
                      </div>
                    );
                  })}
                </div>
                <p className="report-card-footnote">Tỷ trọng trên tổng đơn được tạo trong kỳ, gồm cả đơn chưa thanh toán và đơn hủy.</p>
              </Card>
            </div>

            <div className="report-ranking-grid">
              <Card className="report-card report-table-card">
                <div className="report-card-heading"><div><h3>Sản phẩm nổi bật</h3><p>Top 5 theo giá trị hàng bán trong kỳ</p></div><Tag className="report-scope-tag">Trong kỳ</Tag></div>
                <Table rowKey="productId" size="middle" columns={topProductColumns} dataSource={statistics.topProducts} pagination={false} scroll={{ x: 500 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có sản phẩm được thanh toán trong kỳ" /> }} />
              </Card>
              <Card className="report-card report-table-card">
                <div className="report-card-heading"><div><h3>Danh mục nổi bật</h3><p>Top 5 theo giá trị hàng bán trong kỳ</p></div><Tag className="report-scope-tag">Trong kỳ</Tag></div>
                <Table rowKey={(category) => category.categoryId ?? category.name} size="middle" columns={topCategoryColumns} dataSource={statistics.topCategories} pagination={false} scroll={{ x: 400 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có danh mục được thanh toán trong kỳ" /> }} />
              </Card>
            </div>
            <p className="report-data-note"><InfoCircleOutlined /> Giá trị hàng bán tính trước giảm giá đơn hàng và không gồm phí giao hàng, nên có thể khác tổng doanh thu.</p>

            <div className="report-section-heading report-store-heading"><div><h3>Toàn cảnh cửa hàng</h3><p>Số liệu hiện tại và toàn thời gian · không phụ thuộc kỳ đã chọn</p></div></div>
            <div className="report-store-grid">
              <Card className="report-card report-store-card">
                <div className="report-card-heading"><h3>Doanh thu tích lũy</h3><span className="report-icon-tile"><DollarOutlined /></span></div>
                <strong className="report-store-total">{formatCurrency(summary.totalRevenue)}</strong>
                <span className="report-store-caption">Toàn thời gian</span>
                <div className="report-store-detail"><span>Hôm nay</span><strong>{formatCurrency(summary.revenueToday)}</strong></div>
                <div className="report-store-detail"><span>Tháng này</span><strong>{formatCurrency(summary.revenueThisMonth)}</strong></div>
              </Card>
              <Card className="report-card report-store-card">
                <div className="report-card-heading"><h3>Vận hành đơn hàng</h3><span className="report-icon-tile"><ShoppingCartOutlined /></span></div>
                <div className="report-operation-grid">
                  <div><span><InboxOutlined /> Chờ xử lý</span><strong className={summary.pendingOrders ? 'report-text-warning' : ''}>{formatCount(summary.pendingOrders)}</strong></div>
                  <div><span><TruckOutlined /> Đang giao</span><strong>{formatCount(summary.shippingOrders)}</strong></div>
                </div>
                <div className="report-store-detail"><span>Đã giao · toàn thời gian</span><strong>{formatCount(summary.completedOrders)}</strong></div>
                <div className="report-store-detail"><span>Tổng đơn · toàn thời gian</span><strong>{formatCount(summary.totalOrders)}</strong></div>
              </Card>
              <Card className="report-card report-store-card">
                <div className="report-card-heading"><h3>Tài nguyên & tồn kho</h3><span className="report-icon-tile"><InboxOutlined /></span></div>
                <div className="report-operation-grid"><div><span>Sản phẩm</span><strong>{formatCount(summary.totalProducts)}</strong></div><div><span>Tài khoản</span><strong>{formatCount(summary.totalUsers)}</strong></div></div>
                <div className="report-store-detail"><span><i className="report-stock-dot is-low" /> Sắp hết hàng</span><strong className={summary.lowStockProducts ? 'report-text-warning' : ''}>{formatCount(summary.lowStockProducts)} sản phẩm</strong></div>
                <div className="report-store-detail"><span><i className="report-stock-dot is-empty" /> Hết hàng</span><strong className={summary.outOfStockProducts ? 'report-text-danger' : ''}>{formatCount(summary.outOfStockProducts)} sản phẩm</strong></div>
              </Card>
            </div>

            <Card className="report-card report-stock-card">
              <div className="report-card-heading">
                <div><h3><WarningOutlined className="report-text-warning" /> Tồn kho cần chú ý</h3><p>Tối đa 8 sản phẩm đang bán có tồn kho thấp nhất ở thời điểm hiện tại</p></div>
                {canManageProducts ? <Link className="report-text-link" to="/admin/products">Quản lý sản phẩm <ArrowRightOutlined /></Link> : null}
              </div>
              <Table rowKey="productId" size="middle" columns={stockColumns} dataSource={statistics.lowStockItems} pagination={false} scroll={{ x: 550 }} locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có sản phẩm tồn kho thấp" /> }} />
            </Card>

            <details className="report-methodology">
              <summary><InfoCircleOutlined /> Cách đọc báo cáo</summary>
              <div>
                <p>Doanh thu chỉ gồm đơn đã thanh toán và không bị hủy, tính theo tổng tiền sau giảm giá và gồm phí giao hàng. Đơn đã hoàn tiền không được tính vào doanh thu.</p>
                <p>Kỳ doanh thu dựa trên ngày thanh toán. Đơn cũ chưa có ngày thanh toán dùng ngày tạo đơn. Thống kê trạng thái đơn dựa trên ngày tạo đơn; vì vậy số đơn tạo và số đơn thanh toán trong cùng kỳ có thể khác nhau.</p>
                <p>Biểu đồ tháng chỉ cộng dữ liệu thuộc khoảng ngày đã chọn. Giá trị đơn bình quân bằng doanh thu trong kỳ chia cho số đơn được ghi nhận thanh toán trong kỳ. Báo cáo phản ánh dữ liệu tại lần tải gần nhất; chọn “Làm mới” để cập nhật.</p>
              </div>
            </details>
          </div>
        </Spin>
      ) : null}
    </section>
  );
};
