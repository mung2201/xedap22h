const bookingTimeZone = 'Asia/Ho_Chi_Minh';

const calendarDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: bookingTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getCalendarDate = (now: Date): string => {
  const parts = calendarDateFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((value) => value.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const isCalendarDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const getNextServiceBookingDate = (now = new Date()): string => {
  const date = new Date(`${getCalendarDate(now)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export const isFutureServiceBookingDate = (value: string, now = new Date()): boolean =>
  isCalendarDate(value) && value > getCalendarDate(now);

export const toServiceBookingDate = (value: string): string => {
  if (!isCalendarDate(value)) throw new Error('Ngày hẹn không hợp lệ.');
  // Keep the selected calendar day in the shop's time zone on every device.
  return new Date(`${value}T09:00:00+07:00`).toISOString();
};

export const formatServiceBookingDate = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    timeZone: bookingTimeZone,
    dateStyle: 'full',
  }).format(new Date(value));
