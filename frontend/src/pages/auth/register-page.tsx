import { Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useRef, useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import type { RegisterPayload } from '../../types/auth';
import { getErrorMessage } from '../../utils/error-message';

export const RegisterPage = () => {
  const register = useAuthStore((state) => state.register);
  const location = useLocation();
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: RegisterPayload): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    try {
      await register(values);
      message.success('Đăng ký thành công. Chào mừng bạn đến với XeDap22h!');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>Tạo tài khoản</Typography.Title>
        <Typography.Paragraph type="secondary">
          Tạo tài khoản để lưu xe yêu thích, mua sắm và theo dõi đơn hàng.
        </Typography.Paragraph>
        <Form<RegisterPayload> layout="vertical" onFinish={handleSubmit} disabled={isSubmitting}>
          <Form.Item
            label="Họ và tên"
            name="fullName"
            rules={[{ required: true, min: 2, message: 'Nhập họ tên từ 2 ký tự.' }]}
          >
            <Input autoComplete="name" />
          </Form.Item>
          <Form.Item
            label="Username"
            name="username"
            rules={[
              { required: true, message: 'Vui lòng nhập username.' },
              {
                pattern: /^[a-zA-Z0-9._-]{3,40}$/,
                message: 'Username dài 3-40 ký tự, không có khoảng trắng.',
              },
            ]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Email không hợp lệ.' }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu.' },
              { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự.' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="Xác nhận mật khẩu"
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu.' },
              ({ getFieldValue }) => ({
                validator(_, value: string) {
                  return !value || getFieldValue('password') === value
                    ? Promise.resolve()
                    : Promise.reject(new Error('Mật khẩu xác nhận chưa khớp.'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Đăng ký
          </Button>
        </Form>
        <Typography.Paragraph className="auth-footer-text">
          Đã có tài khoản? <Link to="/login" state={location.state} aria-disabled={isSubmitting} onClick={(event) => { if (submitting.current) event.preventDefault(); }}>Đăng nhập</Link>
        </Typography.Paragraph>
      </Card>
    </main>
  );
};
