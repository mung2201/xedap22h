import type { AddressPayload } from '../types/address';

export const MOBILE_PHONE_PATTERN = /^0[35789][0-9]{8}$/;
export const MOBILE_PHONE_MESSAGE = 'Nhập đủ 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.';

// Only normalize a recognizable existing number, never remove arbitrary letters.
export const localMobilePhone = (value: string): string => {
  const local = value.trim().replace(/[\s().-]/g, '').replace(/^(?:\+84|84)/, '0');
  return MOBILE_PHONE_PATTERN.test(local) ? local : value;
};

export const normalizeAddressPayload = (values: AddressPayload): AddressPayload => ({
  ...values,
  recipientName: values.recipientName.trim(),
  phone: values.phone.trim(),
  province: values.province.trim(),
  district: values.addressFormat === 'CURRENT' ? '' : (values.district ?? '').trim(),
  ward: (values.ward ?? '').trim(),
  addressLine: values.addressLine.trim(),
  note: values.note?.trim() || undefined,
});

export const formatDeliveryAddress = (address: {
  addressLine: string; ward: string; district?: string; province: string;
}): string => [address.addressLine, address.ward, address.district, address.province]
  .filter((part) => part?.trim()).join(', ');

export const normalizeLocationSearch = (text: string): string => text.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
