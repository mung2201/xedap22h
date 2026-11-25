import {
  Avatar,
  Button,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import { userService } from '../../api/services/user.service';
import { ImageUploadField } from '../../components/common/image-upload-field';
import { PhoneNumberInput } from '../../components/common/phone-number-input';
import { useAuthStore } from '../../stores/auth.store';
import { Gender, type CurrentUser, type UpdateProfilePayload } from '../../types/auth';
import { getErrorMessage } from '../../utils/error-message';
import { localMobilePhone, MOBILE_PHONE_MESSAGE, MOBILE_PHONE_PATTERN } from '../../utils/address';

const getProfileValues = (user: CurrentUser | null): UpdateProfilePayload => ({
  fullName: user?.fullName,
  phone: user?.phone ? localMobilePhone(user.phone) : undefined,
  dateOfBirth: user?.dateOfBirth?.slice(0, 10),
  gender: user?.gender,
  avatarUrl: user?.avatarUrl,
});

export const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [form] = Form.useForm<UpdateProfilePayload>();
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    form.setFieldsValue(getProfileValues(user));
  }, [form, user]);

  const restoreProfile = (): void => {
    if (submitting.current) return;
    form.resetFields();
    form.setFieldsValue(getProfileValues(user));
  };

  const handleSubmit = async (values: UpdateProfilePayload): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      const updatedUser = await userService.updateMe({
        ...values,
        phone: values.phone?.trim() || null,
        dateOfBirth: values.dateOfBirth || null,
        gender: values.gender || null,
        avatarUrl: values.avatarUrl?.trim() || null,
      });
      setUser(updatedUser);
      message.success('Cập nhật hồ sơ thành công.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <Space direction="vertical" size="large" className="full-width">
      <div>
        <Typography.Title level={3}>Hồ sơ cá nhân</Typography.Title>
        <Typography.Text type="secondary">
          Username: {user?.username} · Email: {user?.email}
        </Typography.Text>
      </div>
      <Avatar size={72} src={user?.avatarUrl}>
        {user?.fullName?.charAt(0).toUpperCase()}
      </Avatar>
      <Form<UpdateProfilePayload>
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="profile-form"
        disabled={isSubmitting}
      >
        <Form.Item
          label="Họ và tên"
          name="fullName"
          rules={[{ required: true, min: 2, message: 'Nhập họ tên từ 2 ký tự.' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Số điện thoại"
          name="phone"
          rules={[{ pattern: MOBILE_PHONE_PATTERN, message: MOBILE_PHONE_MESSAGE }]}
        >
          <PhoneNumberInput />
        </Form.Item>
        <Form.Item label="Ngày sinh" name="dateOfBirth">
          <Input type="date" />
        </Form.Item>
        <Form.Item label="Giới tính" name="gender">
          <Select
            allowClear
            placeholder="Chọn giới tính"
            options={[
              { value: Gender.MALE, label: 'Nam' },
              { value: Gender.FEMALE, label: 'Nữ' },
              { value: Gender.OTHER, label: 'Khác' },
              { value: Gender.PREFER_NOT_TO_SAY, label: 'Không muốn tiết lộ' },
            ]}
          />
        </Form.Item>
        <Form.Item label="Ảnh đại diện" name="avatarUrl">
          <ImageUploadField uploadKind="avatar" previewAlt="Ảnh đại diện" />
        </Form.Item>
        <Space wrap>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Lưu thay đổi
          </Button>
          <Button htmlType="button" onClick={restoreProfile} disabled={isSubmitting}>
            Khôi phục thông tin
          </Button>
        </Space>
      </Form>
    </Space>
  );
};
