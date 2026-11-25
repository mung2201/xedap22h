import type { DashboardStatistics } from '../../types/admin';
import { orderStatusLabels } from '../../types/order';

export type RevenueGranularity = 'day' | 'month';

const timeZone = 'Asia/Ho_Chi_Minh';

export const formatReportDate = (value: string, short = false): string =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    ...(short ? {} : { year: 'numeric' }),
  }).format(new Date(value));

export const formatReportTimestamp = (value: Date): string =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value);

const encodeCell = (value: string | number): string => {
  if (typeof value === 'number') return String(value);
  // Spreadsheet software may interpret user-controlled product names as formulas.
  const safeValue = /^[\s\uFEFF]*[=+@-]/u.test(value) || /^[\t\r\n]/u.test(value)
    ? `'${value}`
    : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
};

export const buildDashboardCsv = (
  statistics: DashboardStatistics,
  granularity: RevenueGranularity,
  updatedAt: Date,
): string => {
  const { summary, range } = statistics;
  const selectedRange = `${formatReportDate(range.startDate)} – ${formatReportDate(range.endDate)}`;
  const createdOrders = statistics.ordersByStatus.reduce((sum, item) => sum + item.count, 0);
  const rows: Array<Array<string | number>> = [
    ['BÁO CÁO CỬA HÀNG XEDAP22H'],
    ['Kỳ báo cáo', selectedRange],
    ['Dữ liệu cập nhật', formatReportTimestamp(updatedAt), 'Giờ Việt Nam (UTC+7)'],
    ['Quy tắc doanh thu', 'Đơn đã thanh toán, loại đơn hủy; tổng tiền sau giảm giá và gồm phí giao hàng.'],
    ['Thời điểm ghi nhận', 'Theo ngày thanh toán; đơn cũ chưa có ngày thanh toán dùng ngày tạo đơn.'],
    [],
    ['Nhóm', 'Chỉ tiêu / Ngày / Sản phẩm', 'Phạm vi', 'Số lượng', 'Giá trị (VND)', 'Ghi chú'],
    ['Kết quả kinh doanh', 'Doanh thu đã thanh toán', selectedRange, summary.rangeOrderCount, summary.rangeRevenue, 'Theo ngày thanh toán'],
    ['Kết quả kinh doanh', 'Đơn được tạo', selectedRange, createdOrders, '', 'Theo ngày tạo đơn, mọi trạng thái'],
    ['Kết quả kinh doanh', 'Giá trị đơn bình quân', selectedRange, '', summary.rangeOrderCount ? Math.round(summary.rangeRevenue / summary.rangeOrderCount) : '', 'Doanh thu / số đơn đã thanh toán'],
    ['Toàn cửa hàng', 'Tổng doanh thu', 'Toàn thời gian', '', summary.totalRevenue],
    ['Toàn cửa hàng', 'Doanh thu hôm nay', 'Hôm nay (UTC+7)', '', summary.revenueToday],
    ['Toàn cửa hàng', 'Doanh thu tháng này', 'Tháng hiện tại (UTC+7)', '', summary.revenueThisMonth],
    ['Toàn cửa hàng', 'Tổng đơn hàng', 'Toàn thời gian', summary.totalOrders],
    ['Toàn cửa hàng', 'Đơn chờ xử lý', 'Hiện tại', summary.pendingOrders],
    ['Toàn cửa hàng', 'Đơn đang giao', 'Hiện tại', summary.shippingOrders],
    ['Toàn cửa hàng', 'Đơn đã giao', 'Toàn thời gian', summary.completedOrders],
    ['Toàn cửa hàng', 'Tài khoản', 'Hiện tại', summary.totalUsers],
    ['Toàn cửa hàng', 'Sản phẩm', 'Hiện tại', summary.totalProducts],
    ['Toàn cửa hàng', 'Sản phẩm sắp hết', 'Hiện tại', summary.lowStockProducts],
    ['Toàn cửa hàng', 'Sản phẩm hết hàng', 'Hiện tại', summary.outOfStockProducts],
    [],
    ...(granularity === 'day'
      ? statistics.revenueByDay.map((item) => ['Doanh thu theo ngày', item.date, selectedRange, item.orders, item.revenue])
      : statistics.revenueByMonth.map((item) => ['Doanh thu theo tháng', item.month, selectedRange, item.orders, item.revenue])),
    [],
    ...statistics.ordersByStatus.map((item) => [
      'Trạng thái đơn', orderStatusLabels[item.status], selectedRange, item.count, '',
      `${createdOrders ? ((item.count / createdOrders) * 100).toFixed(1) : '0'}% tổng đơn được tạo trong kỳ`,
    ]),
    [],
    ...statistics.topProducts.map((item) => [
      'Top sản phẩm', item.name, selectedRange, item.soldQuantity, item.revenue,
      'Giá trị hàng bán trước giảm giá đơn hàng, không gồm phí giao hàng',
    ]),
    ...statistics.topCategories.map((item) => [
      'Top danh mục', item.name === 'Uncategorized' ? 'Chưa phân loại' : item.name, selectedRange, item.soldQuantity, item.revenue,
      'Giá trị hàng bán trước giảm giá đơn hàng, không gồm phí giao hàng',
    ]),
    [],
    ...statistics.lowStockItems.map((item) => [
      'Tồn kho cần chú ý', item.name, 'Hiện tại', item.availableStock, '',
      item.availableStock === 0 ? 'Hết hàng' : 'Sắp hết hàng',
    ]),
  ];

  return `\uFEFF${rows.map((row) => row.map(encodeCell).join(',')).join('\r\n')}`;
};

export const downloadDashboardReport = (
  statistics: DashboardStatistics,
  granularity: RevenueGranularity,
  updatedAt: Date,
): void => {
  const csv = buildDashboardCsv(statistics, granularity, updatedAt);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  const fileDate = (value: string) => formatReportDate(value).split('/').reverse().join('-');
  link.href = url;
  link.download = `xedap22h-bao-cao-${fileDate(statistics.range.startDate)}-${fileDate(statistics.range.endDate)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
