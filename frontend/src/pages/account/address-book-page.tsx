import {
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  StarFilled,
} from '@ant-design/icons';
import {
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
import { useEffect, useState } from 'react';
import { addressService } from '../../api/services/address.service';
import type { Address, AddressPayload } from '../../types/address';
import { getErrorMessage } from '../../utils/error-message';

const normalizeAddressPayload = (values: AddressPayload): AddressPayload => ({
  ...values,
  recipientName: values.recipientName.trim(),
  phone: values.phone.trim(),
  province: values.province.trim(),
  district: values.district.trim(),
  ward: values.ward.trim(),
  addressLine: values.addressLine.trim(),
  note: values.note?.trim() || undefined,
});

export const AddressBookPage = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [form] = Form.useForm<AddressPayload>();

  const loadAddresses = async (): Promise<void> => {
    setIsLoading(true);
    try {
      setAddresses(await addressService.getAll());
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAddresses();
  }, []);

  const openCreateModal = (): void => {
    setEditingAddress(null);
    form.resetFields();
    form.setFieldsValue({ isDefault: addresses.length === 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (address: Address): void => {
    setEditingAddress(address);
    form.setFieldsValue({
      recipientName: address.recipientName,
      phone: address.phone,
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
    setIsModalOpen(false);
    setEditingAddress(null);
    form.resetFields();
  };

  const handleSave = async (values: AddressPayload): Promise<void> => {
    setIsSaving(true);

    try {
      const payload = normalizeAddressPayload(values);

      if (editingAddress) {
        await addressService.update(editingAddress.id, payload);
        message.success('Cập nhật địa chỉ thành công.');
      } else {
        await addressService.create(payload);
        message.success('Thêm địa chỉ thành công.');
      }

      closeModal();
      await loadAddresses();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (address: Address): Promise<void> => {
    try {
      await addressService.setDefault(address.id);
      message.success('Đã chọn địa chỉ mặc định.');
      await loadAddresses();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const handleDelete = async (address: Address): Promise<void> => {
    try {
      await addressService.remove(address.id);
      message.success('Đã xóa địa chỉ.');
      await loadAddresses();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Thêm địa chỉ
        </Button>
      </div>

      <List
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
                disabled={address.isDefault}
                onClick={() => void handleSetDefault(address)}
              >
                Đặt mặc định
              </Button>,
              <Button
                key="edit"
                type="link"
                icon={<EditOutlined />}
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
                onConfirm={() => void handleDelete(address)}
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
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
                    {address.addressLine}, {address.ward}, {address.district},{' '}
                    {address.province}
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
      />

      <Modal
        title={editingAddress ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}
        open={isModalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
      >
        <Form<AddressPayload> form={form} layout="vertical" onFinish={handleSave}>
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
            rules={[{ required: true, message: 'Nhập số điện thoại.' }]}
          >
            <Input placeholder="0901234567" />
          </Form.Item>
          <Form.Item
            label="Tỉnh / Thành phố"
            name="province"
            rules={[{ required: true, message: 'Nhập tỉnh hoặc thành phố.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Quận / Huyện"
            name="district"
            rules={[{ required: true, message: 'Nhập quận hoặc huyện.' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Phường / Xã"
            name="ward"
            rules={[{ required: true, message: 'Nhập phường hoặc xã.' }]}
          >
            <Input />
          </Form.Item>
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
              disabled={editingAddress?.isDefault}
            />
          </Form.Item>
          <Space className="modal-form-actions">
            <Button onClick={closeModal}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={isSaving}>
              {editingAddress ? 'Lưu thay đổi' : 'Thêm địa chỉ'}
            </Button>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
};
