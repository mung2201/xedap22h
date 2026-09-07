import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { UserRole } from '../../types/auth';
import { getErrorMessage } from '../../utils/error-message';

interface LoginFormValues {
  emailOrUsername: string;
  password: string;
}

interface LoginPageProps {
  adminOnly?: boolean;
}

export const LoginPage = ({ adminOnly = false }: LoginPageProps) => {
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: LoginFormValues): Promise<void> => {
    setIsSubmitting(true);

    try {
      const session = await login(values);

      if (
        adminOnly &&
        ![UserRole.ADMIN, UserRole.STAFF].includes(session.user.role)
      ) {
        await logout();
        message.error('Tài khoản này không có quyền truy cập Admin Dashboard.');
        return;
      }

      message.success('Đăng nhập thành công.');
      navigate(adminOnly ? '/admin' : '/');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>
          {adminOnly ? 'Admin Sign In' : 'Chào mừng trở lại'}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {adminOnly
            ? 'Chỉ dành cho tài khoản STAFF hoặc ADMIN.'
            : 'Đăng nhập để quản lý tài khoản XeDap22h của bạn.'}
        </Typography.Paragraph>
        {adminOnly && (
          <Alert
            type="info"
            showIcon
            message="Backend vẫn kiểm tra RBAC, không chỉ dựa vào frontend."
            className="auth-alert"
          />
        )}
        <Form<LoginFormValues> layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Email hoặc username"
            name="emailOrUsername"
            rules={[{ required: true, message: 'Vui lòng nhập email hoặc username.' }]}
          >
            <Input prefix={<UserOutlined />} autoComplete="username" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <div className="auth-form-actions">
            {!adminOnly && <Link to="/forgot-password">Quên mật khẩu?</Link>}
          </div>
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Đăng nhập
          </Button>
        </Form>
        {!adminOnly && (
          <Typography.Paragraph className="auth-footer-text">
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </Typography.Paragraph>
        )}
      </Card>
    </main>
  );
};
