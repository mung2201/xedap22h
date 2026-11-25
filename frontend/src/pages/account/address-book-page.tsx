import {
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  StarFilled,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { addressService } from '../../api/services/address.service';
import { AddressLocationFields } from '../../components/common/address-location-fields';
import { PhoneNumberInput } from '../../components/common/phone-number-input';
import { useAuthStore } from '../../stores/auth.store';
import type { Address, AddressPayload } from '../../types/address';
import { getErrorMessage } from '../../utils/error-message';
import { formatDeliveryAddress, localMobilePhone, MOBILE_PHONE_MESSAGE, MOBILE_PHONE_PATTERN, normalizeAddressPayload } from '../../utils/address';

export const AddressBookPage = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mutation, setMutation] = useState<'save' | 'default' | 'delete' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [form] = Form.useForm<AddressPayload>();
  const userId = useAuthStore((state) => state.user?.id);
  const generation = useRef(0);
  const loadSequence = useRef(0);
  const loadController = useRef<AbortController | null>(null);
  const mutationLock = useRef<symbol | null>(null);
  const isBusy = mutation !== null;
  const actionsDisabled = isLoading || isBusy || loadError !== null;

  const loadAddresses = useCallback(async (): Promise<void> => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const request = ++loadSequence.current;
    const currentGeneration = generation.current;
    const isCurrent = (): boolean =>
      !controller.signal.aborted && request === loadSequence.current &&
      currentGeneration === generation.current &&
      userId === useAuthStore.getState().user?.id;
    setIsLoading(true);
    setLoadError(null);
    try {
      const nextAddresses = await addressService.getAll(controller.signal);
      if (isCurrent()) setAddresses(nextAddresses);
    } catch (error) {
      if (isCurrent()) setLoadError(getErrorMessage(error));
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    generation.current += 1;
    mutationLock.current = null;
    setMutation(null);
    setAddresses([]);
    setIsModalOpen(false);
    setEditingAddress(null);
    form.resetFields();
    void loadAddresses();
    return () => {
      generation.current += 1;
      loadController.current?.abort();
      mutationLock.current = null;
    };
  }, [form, loadAddresses]);

  const openCreateModal = (): void => {
    if (actionsDisabled || mutationLock.current) return;
    setEditingAddress(null);
    form.resetFields();
    form.setFieldsValue({ isDefault: addresses.length === 0, addressFormat: 'CURRENT', district: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (address: Address): void => {
    if (actionsDisabled || mutationLock.current) return;
    setEditingAddress(address);
    form.setFieldsValue({
      recipientName: address.recipientName,
      phone: localMobilePhone(address.phone),
      addressFormat: address.addressFormat ?? (address.district ? 'LEGACY' : 'CURRENT'),
      province: address.province,
      district: address.district,
      ward: address.ward,
      addressLine: address.addressLine,
      note: address.note,
      isDefault: address.isDefault,
    });
    setIsModalOpen(true);
  };

  const closeModal = (): void => {
    if (mutationLock.current) return;
    setIsModalOpen(false);
    setEditingAddress(null);
    form.resetFields();
  };

  const runMutation = async (
    kind: 'save' | 'default' | 'delete',
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<void> => {
    if (actionsDisabled || mutationLock.current) return;
    const lock = Symbol('address-mutation');
    mutationLock.current = lock;
    const currentGeneration = generation.current;
    const isCurrent = (): boolean =>
      mutationLock.current === lock && currentGeneration === generation.current &&
      userId === useAuthStore.getState().user?.id;
    setMutation(kind);
    try {
      await action();
      if (!isCurrent()) return;
      message.success(successMessage);
      if (kind === 'save') {
        setIsModalOpen(false);
        setEditingAddress(null);
        form.resetFields();
      }
      await loadAddresses();
    } catch (error) {
      if (isCurrent()) message.error(getErrorMessage(error));
    } finally {
      if (isCurrent()) {
        mutationLock.current = null;
        setMutation(null);
      }
    }
  };

  const handleSave = async (values: AddressPayload): Promise<void> => {
    const payload = normalizeAddressPayload(values);
    await runMutation(
      'save',
      () => editingAddress
        ? addressService.update(editingAddress.id, payload)
        : addressService.create(payload),
      editingAddress ? 'Cập nhật địa chỉ thành công.' : 'Thêm địa chỉ thành công.',
    );
  };

  return (
    <Space direction="vertical" size="large" className="full-width">
      <div className="address-page-heading">
        <div>
          <Typography.Title level={3}>Sổ địa chỉ</Typography.Title>
          <Typography.Text type="secondary">
            Quản lý địa chỉ giao hàng và chọn một địa chỉ mặc định.
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} disabled={actionsDisabled}>
          Thêm địa chỉ
        </Button>
      </div>

      {loadError ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải sổ địa chỉ"
          description={loadError}
          action={<Button onClick={() => void loadAddresses()} disabled={isBusy}>Thử lại</Button>}
        />
      ) : <List
        className="address-list"
        loading={isLoading}
        locale={{ emptyText: <Empty description="Chưa có địa chỉ giao hàng" /> }}
        dataSource={addresses}
        renderItem={(address) => (
          <List.Item
            actions={[
              <Button
                key="default"
                type="link"
                disabled={address.isDefault || actionsDisabled}
                onClick={() => void runMutation('default', () => addressService.setDefault(address.id), 'Đã chọn địa chỉ mặc định.')}
              >
                Đặt mặc định
              </Button>,
              <Button
                key="edit"
                type="link"
                icon={<EditOutlined />}
                disabled={actionsDisabled}
                onClick={() => openEditModal(address)}
              >
                Sửa
              </Button>,
              <Popconfirm
                key="delete"
                title="Xóa địa chỉ này?"
                description="Địa chỉ mặc định sẽ được thay thế bằng địa chỉ khác nếu có."
                okText="Xóa"
                cancelText="Hủy"
                disabled={actionsDisabled}
                okButtonProps={{ disabled: actionsDisabled }}
                onConfirm={() => runMutation('delete', () => addressService.remove(address.id), 'Đã xóa địa chỉ.')}
              >
                <Button type="link" danger icon={<DeleteOutlined />} disabled={actionsDisabled}>
                  Xóa
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              avatar={<EnvironmentOutlined className="address-location-icon" />}
              title={
                <Space wrap>
                  <Typography.Text strong>{address.recipientName}</Typography.Text>
                  <Typography.Text type="secondary">{address.phone}</Typography.Text>
                  {address.isDefault && (
                    <Tag color="gold" icon={<StarFilled />}>
                      Mặc định
                    </Tag>
                  )}
                </Space>
              }
              description={
                <Space direction="vertical" size={2}>
                  <Typography.Text>
                    {formatDeliveryAddress(address)}
                  </Typography.Text>
                  {address.note && (
                    <Typography.Text type="secondary">
                      Ghi chú: {address.note}
                    </Typography.Text>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />}

      <Modal
        title={editingAddress ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}
        open={isModalOpen}
        onCancel={closeModal}
        closable={!isBusy}
        maskClosable={!isBusy}
        keyboard={!isBusy}
        footer={null}
        destroyOnHidden
      >
        <Form<AddressPayload> form={form} layout="vertical" onFinish={handleSave} disabled={isBusy}>
          <Form.Item
            label="Tên người nhận"
            name="recipientName"
            rules={[{ required: true, min: 2, message: 'Nhập tên người nhận.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: 'Nhập số điện thoại.' },
              { pattern: MOBILE_PHONE_PATTERN, message: MOBILE_PHONE_MESSAGE },
            ]}
            extra="Số di động Việt Nam gồm 10 chữ số, ví dụ 0912345678."
          >
            <PhoneNumberInput />
          </Form.Item>
          <AddressLocationFields form={form} initialAddress={editingAddress} />
          <Form.Item
            label="Địa chỉ chi tiết"
            name="addressLine"
            rules={[{ required: true, min: 5, message: 'Nhập địa chỉ chi tiết.' }]}
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <Form.Item
            label="Đặt làm địa chỉ mặc định"
            name="isDefault"
            valuePropName="checked"
            extra={
              editingAddress?.isDefault
                ? 'Hãy đặt một địa chỉ khác làm mặc định trước khi bỏ chọn địa chỉ này.'
                : undefined
            }
          >
            <Switch
              checkedChildren="Có"
              unCheckedChildren="Không"
              disabled={isBusy || editingAddress?.isDefault}
            />
          </Form.Item>
          <Space className="modal-form-actions">
            <Button onClick={closeModal} disabled={isBusy}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={mutation === 'save'} disabled={actionsDisabled}>
              {editingAddress ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
            </Button>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
};
