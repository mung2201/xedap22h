import { ArrowLeftOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useRef, useState } from 'react';
import { authService } from '../../api/services/auth.service';
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
  const setSession = useAuthStore((state) => state.setSession);
  const logout = useAuthStore((state) => state.logout);
  const location = useLocation();
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: LoginFormValues): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);

    try {
      const session = await authService.login(values);

      if (
        adminOnly &&
        ![UserRole.ADMIN, UserRole.STAFF].includes(session.user.role)
      ) {
        await logout().catch(() => undefined);
        message.error('Tài khoản này không có quyền truy cập Admin Dashboard.');
        return;
      }

      message.success('Đăng nhập thành công.');
      setSession(session);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main className={`auth-page${adminOnly ? ' auth-page-admin' : ''}`}>
      <Card className="auth-card">
        {adminOnly ? <div className="admin-login-brand"><span aria-hidden="true"><LockOutlined /></span><strong>XeDap22h</strong><small>TRANG QUẢN TRỊ</small></div> : null}
        <Typography.Title level={2}>
          {adminOnly ? 'Quản trị cửa hàng' : 'Chào mừng trở lại'}
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          {adminOnly
            ? 'Đăng nhập để theo dõi kinh doanh và quản lý cửa hàng của bạn.'
            : 'Đăng nhập để quản lý tài khoản XeDap22h của bạn.'}
        </Typography.Paragraph>
        <Form<LoginFormValues> layout="vertical" onFinish={handleSubmit} disabled={isSubmitting}>
          <Form.Item
            label="Email hoặc tên đăng nhập"
            name="emailOrUsername"
            rules={[{ required: true, message: 'Vui lòng nhập email hoặc tên đăng nhập.' }]}
          >
            <Input prefix={<UserOutlined />} autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" size="large" />
          </Form.Item>
          <div className="auth-form-actions">
            {!adminOnly && <Link to="/forgot-password" aria-disabled={isSubmitting} onClick={(event) => { if (submitting.current) event.preventDefault(); }}>Quên mật khẩu?</Link>}
          </div>
          <Button type="primary" htmlType="submit" block loading={isSubmitting} size="large">
            Đăng nhập
          </Button>
        </Form>
        {adminOnly ? <Link to="/" className="admin-login-back"><ArrowLeftOutlined /> Trở về cửa hàng</Link> : null}
        {!adminOnly && (
          <Typography.Paragraph className="auth-footer-text">
            Chưa có tài khoản? <Link to="/register" state={location.state} aria-disabled={isSubmitting} onClick={(event) => { if (submitting.current) event.preventDefault(); }}>Đăng ký ngay</Link>
          </Typography.Paragraph>
        )}
      </Card>
    </main>
  );
};
