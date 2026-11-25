import { Button, Form, Input, Space, Typography, message } from 'antd';
import { useRef, useState } from 'react';
import { authService } from '../../api/services/auth.service';
import { useAuthStore } from '../../stores/auth.store';
import type { ChangePasswordPayload } from '../../types/auth';
import { getErrorMessage } from '../../utils/error-message';

export const ChangePasswordPage = () => {
  const setSession = useAuthStore((state) => state.setSession);
  const [form] = Form.useForm<ChangePasswordPayload>();
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ChangePasswordPayload): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);

    try {
      const session = await authService.changePassword({
        currentPassword: values.currentPassword,
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setSession(session);
      form.resetFields();
      message.success('Mật khẩu đã được cập nhật. Phiên đăng nhập hiện tại được giữ an toàn.');
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
        <Typography.Title level={3}>Đổi mật khẩu</Typography.Title>
        <Typography.Text type="secondary">
          Sau khi đổi mật khẩu, các phiên đăng nhập khác sẽ bị đăng xuất.
        </Typography.Text>
      </div>

      <Form<ChangePasswordPayload>
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="profile-form"
        disabled={isSubmitting}
      >
        <Form.Item
          label="Mật khẩu hiện tại"
          name="currentPassword"
          rules={[{ required: true, min: 8, message: 'Nhập mật khẩu hiện tại.' }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          label="Mật khẩu mới"
          name="password"
          rules={[
            { required: true, min: 8, message: 'Mật khẩu mới cần ít nhất 8 ký tự.' },
            ({ getFieldValue }) => ({
              validator: (_, value: string | undefined) =>
                value && value === getFieldValue('currentPassword')
                  ? Promise.reject(
                      new Error('Mật khẩu mới phải khác mật khẩu hiện tại.'),
                    )
                  : Promise.resolve(),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="Xác nhận mật khẩu mới"
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Xác nhận mật khẩu mới.' },
            ({ getFieldValue }) => ({
              validator: (_, value: string | undefined) =>
                !value || value === getFieldValue('password')
                  ? Promise.resolve()
                  : Promise.reject(new Error('Mật khẩu xác nhận chưa khớp.')),
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Space wrap>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Cập nhật mật khẩu
          </Button>
          <Button
            htmlType="button"
            disabled={isSubmitting}
            onClick={() => { if (!submitting.current) form.resetFields(); }}
          >
            Xóa nội dung
          </Button>
        </Space>
      </Form>
    </Space>
  );
};
