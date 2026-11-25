import { Alert, Button, Form, Select, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { useEffect, useState } from 'react';
import { apiClient } from '../../api/axios.client';
import type { ApiResponse } from '../../types/api';
import type { Address, AddressPayload } from '../../types/address';
import { normalizeLocationSearch } from '../../utils/address';

interface LocationOption { code: string; name: string }
interface OptionsState {
  url?: string;
  options: LocationOption[];
  loading: boolean;
  error: boolean;
}

const useLocationOptions = (url: string | undefined) => {
  const [state, setState] = useState<OptionsState>({ options: [], loading: false, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setState({ url, options: [], loading: true, error: false });
    void apiClient.get<ApiResponse<LocationOption[]>>(url, { signal: controller.signal, timeout: 15000 })
      .then((response) => {
        if (!controller.signal.aborted) setState({ url, options: response.data.data, loading: false, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ url, options: [], loading: false, error: true });
      });
    return () => controller.abort();
  }, [url, attempt]);
  return {
    options: url && state.url === url ? state.options : [],
    loading: Boolean(url && (state.url !== url || state.loading)),
    error: Boolean(url && state.url === url && state.error),
    retry: () => setAttempt((current) => current + 1),
  };
};

interface AddressLocationFieldsProps {
  form: FormInstance<AddressPayload>;
  initialAddress?: Address | null;
}

export const AddressLocationFields = ({ form, initialAddress }: AddressLocationFieldsProps) => {
  const format = Form.useWatch('addressFormat', form) ?? form.getFieldValue('addressFormat') ?? 'CURRENT';
  const province = Form.useWatch('province', form) ?? form.getFieldValue('province');
  const district = Form.useWatch('district', form) ?? form.getFieldValue('district');
  const ward = Form.useWatch('ward', form) ?? form.getFieldValue('ward');
  const legacy = format === 'LEGACY';
  const provinces = useLocationOptions(`/locations/provinces?format=${format}`);
  const provinceCode = provinces.options.find((item) => item.name === province)?.code;
  const provincePath = provinceCode ? `/locations/provinces/${encodeURIComponent(provinceCode)}` : undefined;
  const districts = useLocationOptions(legacy && provincePath ? `${provincePath}/districts?format=LEGACY` : undefined);
  const districtCode = districts.options.find((item) => item.name === district)?.code;
  const wards = useLocationOptions(provincePath && (!legacy || districtCode)
    ? `${provincePath}/wards?format=${format}${legacy ? `&districtCode=${encodeURIComponent(districtCode!)}` : ''}`
    : undefined);
  const noWardSubdivision = Boolean(legacy && districtCode && !wards.loading && !wards.error && wards.options.length === 0);
  const unchanged = Boolean(initialAddress && province === initialAddress.province
    && (district ?? '') === (initialAddress.district ?? '') && ward === initialAddress.ward
    && format === (initialAddress.addressFormat ?? (initialAddress.district ? 'LEGACY' : 'CURRENT')));

  const optionsFor = (items: LocationOption[], existing?: string) => {
    const options = items.map((item) => ({ value: item.name, label: item.name }));
    if (unchanged && existing && !items.some((item) => item.name === existing)) {
      options.unshift({ value: existing, label: `${existing} (đã lưu)` });
    }
    return options;
  };
  const rulesFor = (list: ReturnType<typeof useLocationOptions>, message: string) => [
    { required: true, message },
    {
      validator: (_: unknown, value?: string) => {
        if (!value || unchanged) return Promise.resolve();
        if (list.loading) return Promise.reject(new Error('Danh sách đang tải, vui lòng chờ rồi lưu lại.'));
        if (list.error) return Promise.reject(new Error('Chưa tải được danh sách. Bấm Thử lại trước khi lưu.'));
        return list.options.some((item) => item.name === value)
          ? Promise.resolve() : Promise.reject(new Error(message));
      },
    },
  ];
  const filterOption = (input: string, option?: { label: string }) =>
    normalizeLocationSearch(option?.label ?? '').includes(normalizeLocationSearch(input));
  const failedLists = [provinces, districts, wards].filter((list) => list.error);
  const clearFields = (fields: Array<'province' | 'district' | 'ward'>) => form.setFields(fields.map((name) => ({
    name, value: name === 'district' && !legacy ? '' : undefined, errors: [],
  })));

  return <>
    <Form.Item name="addressFormat" label="Kiểu địa chỉ" initialValue="CURRENT">
      <Select
        options={[
          { value: 'CURRENT', label: 'Địa chỉ hiện hành' },
          { value: 'LEGACY', label: 'Địa chỉ cũ (có quận/huyện)' },
        ]}
        onChange={(next) => {
          form.setFields([
            { name: 'province', value: undefined, errors: [] },
            { name: 'district', value: next === 'CURRENT' ? '' : undefined, errors: [] },
            { name: 'ward', value: undefined, errors: [] },
          ]);
        }}
      />
    </Form.Item>
    <Typography.Paragraph type="secondary">
      {legacy ? 'Chọn địa chỉ theo danh mục cũ trước tháng 7/2025.'
        : 'Địa chỉ hiện hành gồm tỉnh/thành phố và phường/xã/đặc khu, không cần quận/huyện.'}
      {' '}Có thể gõ tên không dấu để tìm nhanh.
    </Typography.Paragraph>
    {failedLists.length > 0 && <Alert
      type="error" showIcon message="Chưa tải được danh sách địa phương"
      description="Kiểm tra kết nối và bấm Thử lại. Thông tin bạn đã nhập vẫn được giữ."
      action={<Button onClick={() => failedLists.forEach((list) => list.retry())}>Thử lại</Button>}
    />}
    <Form.Item label="Tỉnh / Thành phố" name="province" rules={rulesFor(provinces, 'Chọn tỉnh hoặc thành phố trong danh sách.')}>
      <Select
        showSearch allowClear loading={provinces.loading} filterOption={filterOption}
        options={optionsFor(provinces.options, initialAddress?.province)}
        placeholder="Chọn hoặc tìm tỉnh / thành phố"
        notFoundContent={provinces.loading ? 'Đang tải…' : 'Không tìm thấy tỉnh / thành phố'}
        onChange={() => clearFields(['district', 'ward'])}
      />
    </Form.Item>
    {legacy ? <Form.Item label="Quận / Huyện" name="district" rules={rulesFor(districts, 'Chọn quận hoặc huyện thuộc tỉnh / thành phố đã chọn.')}>
      <Select
        showSearch allowClear loading={districts.loading} filterOption={filterOption}
        disabled={!provinceCode} options={optionsFor(districts.options, initialAddress?.district)}
        placeholder={provinceCode ? 'Chọn hoặc tìm quận / huyện' : 'Chọn tỉnh / thành phố trước'}
        notFoundContent={districts.loading ? 'Đang tải…' : 'Không tìm thấy quận / huyện'}
        onChange={() => clearFields(['ward'])}
      />
    </Form.Item> : <Form.Item name="district" hidden><input /></Form.Item>}
    <Form.Item
      label={legacy ? 'Phường / Xã' : 'Phường / Xã / Đặc khu'} name="ward"
      rules={noWardSubdivision ? [] : rulesFor(wards, 'Chọn phường / xã thuộc địa phương đã chọn.')}
      extra={noWardSubdivision ? 'Khu vực này không chia phường/xã. Bạn chỉ cần nhập địa chỉ chi tiết bên dưới.' : undefined}
    >
      <Select
        showSearch allowClear loading={wards.loading} filterOption={filterOption}
        disabled={!provinceCode || (legacy && !districtCode) || noWardSubdivision}
        options={optionsFor(wards.options, initialAddress?.ward)}
        placeholder={!provinceCode ? 'Chọn tỉnh / thành phố trước' : legacy && !districtCode ? 'Chọn quận / huyện trước' : 'Chọn hoặc tìm phường / xã'}
        notFoundContent={wards.loading ? 'Đang tải…' : 'Không tìm thấy phường / xã'}
      />
    </Form.Item>
  </>;
};
