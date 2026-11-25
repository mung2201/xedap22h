import { Empty } from 'antd';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { formatCurrency } from '../../utils/currency';
import { formatReportDate } from './dashboard-report-export';
import type { RevenueGranularity } from './dashboard-report-export';

interface RevenuePoint {
  label: string;
  revenue: number;
  orders: number;
}

interface DashboardRevenueChartProps {
  points: RevenuePoint[];
  granularity: RevenueGranularity;
}

const HEIGHT = 300;
const LEFT = 58;
const RIGHT = 24;
const TOP = 20;
const BOTTOM = 40;
const plotHeight = HEIGHT - TOP - BOTTOM;

const formatAxisValue = (value: number): string => {
  const format = (amount: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(amount);
  if (value >= 1_000_000_000) return `${format(value / 1_000_000_000)} tỷ`;
  if (value >= 1_000_000) return `${format(value / 1_000_000)} tr`;
  if (value >= 1_000) return `${format(value / 1_000)} nghìn`;
  return format(value);
};

const getAxisMaximum = (maximum: number): number => {
  const step = maximum / 4;
  const magnitude = 10 ** Math.floor(Math.log10(step || 1));
  const normalized = step / magnitude;
  const niceStep = [1, 2, 2.5, 5, 10].find((value) => value >= normalized) ?? 10;
  return niceStep * magnitude * 4;
};

export const DashboardRevenueChart = ({ points, granularity }: DashboardRevenueChartProps) => {
  const gradientId = useId().replaceAll(':', '');
  const canvasRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const hasData = points.some((point) => point.revenue > 0 || point.orders > 0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(240, Math.round(entry.contentRect.width)));
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [hasData]);
  const plotWidth = width - LEFT - RIGHT;
  const labelLimit = width < 480 ? 3 : 6;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const maximum = Math.max(...points.map((point) => point.revenue), 0);
  const axisMaximum = getAxisMaximum(maximum);
  const monthly = granularity === 'month';
  const stepWidth = plotWidth / Math.max(points.length, 1);
  const xAt = (index: number) => monthly
    ? LEFT + stepWidth * (index + 0.5)
    : LEFT + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth);
  const yAt = (value: number) => TOP + plotHeight - (value / axisMaximum) * plotHeight;
  const selectedIndex = activeIndex === null ? null : Math.min(activeIndex, points.length - 1);
  const selected = selectedIndex === null ? null : points[selectedIndex];
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${xAt(index)},${yAt(point.revenue)}`).join(' ');
  const area = points.length
    ? `${path} L${xAt(points.length - 1)},${TOP + plotHeight} L${xAt(0)},${TOP + plotHeight} Z`
    : '';
  const labelIndices = Array.from(new Set(Array.from(
    { length: Math.min(points.length, labelLimit) },
    (_, index) => Math.round(index * (points.length - 1) / Math.max(Math.min(points.length, labelLimit) - 1, 1)),
  )));
  const formatLabel = (label: string, short = false) => monthly
    ? `${short ? '' : 'Tháng '}${label.slice(5, 7)}/${label.slice(0, 4)}`
    : formatReportDate(label, short);

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = ((event.clientX - bounds.left) / bounds.width) * width;
    const ratio = Math.max(0, Math.min((position - LEFT) / plotWidth, 1));
    setActiveIndex(Math.min(points.length - 1, monthly
      ? Math.floor(ratio * points.length)
      : Math.round(ratio * (points.length - 1))));
  };

  const handleKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Escape') setActiveIndex(null);
    else if (event.key === 'Home') setActiveIndex(0);
    else if (event.key === 'End') setActiveIndex(points.length - 1);
    else setActiveIndex((index) => Math.max(0, Math.min(
      points.length - 1,
      (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1),
    )));
  };

  if (!hasData) {
    return (
      <div className="report-chart-empty">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có đơn thanh toán trong kỳ này" />
        <span>Doanh thu sẽ xuất hiện sau khi đơn được ghi nhận thanh toán.</span>
      </div>
    );
  }

  return (
    <div className="report-revenue-chart">
      <div className="report-chart-legend"><span />Doanh thu đã thanh toán <small>· VND</small></div>
      <div className="report-chart-canvas" ref={canvasRef}>
        <svg
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="group"
          tabIndex={0}
          aria-label={`Biểu đồ doanh thu theo ${monthly ? 'tháng' : 'ngày'}. Dùng phím mũi tên trái và phải để xem từng mốc.`}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
          onFocus={() => setActiveIndex(0)}
          onBlur={() => setActiveIndex(null)}
          onKeyDown={handleKeyDown}
        >
          <title>Doanh thu đã thanh toán theo {monthly ? 'tháng' : 'ngày'}</title>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {Array.from({ length: 5 }, (_, index) => {
            const value = axisMaximum * index / 4;
            return (
              <g key={index} className="report-chart-axis">
                <line x1={LEFT} x2={width - RIGHT} y1={yAt(value)} y2={yAt(value)} />
                <text x={LEFT - 12} y={yAt(value) + 4} textAnchor="end">{formatAxisValue(value)}</text>
              </g>
            );
          })}
          {monthly ? points.map((point, index) => (
            <rect
              key={point.label}
              x={xAt(index) - Math.min(stepWidth * 0.56, 48) / 2}
              y={yAt(point.revenue)}
              width={Math.min(stepWidth * 0.56, 48)}
              height={(point.revenue / axisMaximum) * plotHeight}
              rx="4"
              fill={selectedIndex === index ? '#3730a3' : '#6366f1'}
            />
          )) : (
            <>
              <path d={area} fill={`url(#${gradientId})`} />
              <path d={path} fill="none" stroke="#4f46e5" strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" />
              {points.length < 32 ? points.filter((point) => point.revenue > 0 || points.length === 1).map((point) => (
                <circle key={point.label} cx={xAt(points.indexOf(point))} cy={yAt(point.revenue)} r="3.5" fill="#4f46e5" stroke="#fff" strokeWidth="2" />
              )) : null}
            </>
          )}
          {selected && selectedIndex !== null ? (
            <g aria-hidden="true">
              <line x1={xAt(selectedIndex)} x2={xAt(selectedIndex)} y1={TOP} y2={TOP + plotHeight} stroke="#a5b4fc" strokeDasharray="4 4" />
              <circle cx={xAt(selectedIndex)} cy={yAt(selected.revenue)} r="5" fill="#4f46e5" stroke="#fff" strokeWidth="2.5" />
            </g>
          ) : null}
          {labelIndices.map((index) => (
            <text className="report-chart-label" key={points[index].label} x={xAt(index)} y={HEIGHT - 13} textAnchor="middle">
              {formatLabel(points[index].label, true)}
            </text>
          ))}
        </svg>
        {selected && selectedIndex !== null ? (
          <div className="report-chart-tooltip" style={{ left: `clamp(80px, ${xAt(selectedIndex) / width * 100}%, calc(100% - 80px))` }}>
            <span>{formatLabel(selected.label)}</span>
            <strong>{formatCurrency(selected.revenue)}</strong>
            <small>{selected.orders.toLocaleString('vi-VN')} đơn thanh toán</small>
          </div>
        ) : null}
      </div>
      <div className="report-chart-hint" aria-live="polite" aria-atomic="true">
        {selected
          ? `${formatLabel(selected.label)}: ${formatCurrency(selected.revenue)} · ${selected.orders.toLocaleString('vi-VN')} đơn thanh toán`
          : 'Di chuột, chạm hoặc dùng phím mũi tên trên biểu đồ để xem chi tiết.'}
      </div>
    </div>
  );
};
