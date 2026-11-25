import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Typography, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import type { LoginPayload } from '../../types/auth';
import { getErrorMessage } from '../../utils/error-message';

interface CustomerLoginModalProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
  redirectTo?: string;
}

export const CustomerLoginModal = ({
  open,
  onClose,
  onLoginSuccess,
  redirectTo,
}: CustomerLoginModalProps) => {
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const submitting = useRef(false);
  const mounted = useRef(true);
  const [form] = Form.useForm<LoginPayload>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const closeModal = (): void => {
    if (submitting.current) {
      return;
    }

    form.resetFields();
    onClose();
  };

  const handleSubmit = async (values: LoginPayload): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);

    try {
      await login(values);
      if (!mounted.current) return;
      form.resetFields();
      onLoginSuccess?.();
      onClose();
      message.success('Đăng nhập thành công. Chào mừng bạn trở lại XeDap22h!');
    } catch (error) {
      if (mounted.current) message.error(getErrorMessage(error));
    } finally {
      submitting.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      footer={null}
      centered
      destroyOnHidden
      maskClosable={!isSubmitting}
      closable={!isSubmitting}
      keyboard={!isSubmitting}
      className="customer-login-modal"
      onCancel={closeModal}
      afterOpenChange={(isOpen) => {
        if (!isOpen) {
          form.resetFields();
        }
      }}
    >
      <div className="customer-login-modal-content">
        <img src="/images/xedap22h-logo.png" alt="XeDap22h" className="customer-login-logo" />
        <Typography.Title level={2}>Đăng nhập</Typography.Title>
        <Typography.Paragraph type="secondary">
          Đăng nhập để theo dõi đơn hàng, lưu sản phẩm yêu thích và thanh toán nhanh hơn.
        </Typography.Paragraph>

        <Form<LoginPayload> form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false} disabled={isSubmitting}>
          <Form.Item
            name="emailOrUsername"
            label="Email hoặc username"
            rules={[{ required: true, message: 'Vui lòng nhập email hoặc username.' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Nhập email hoặc username"
              autoComplete="username"
              autoFocus
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu.' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
            />
          </Form.Item>

          <div className="customer-login-forgot-link">
            <Link to="/forgot-password" aria-disabled={isSubmitting} onClick={(event) => {
              if (submitting.current) event.preventDefault();
              else closeModal();
            }}>
              Quên mật khẩu?
            </Link>
          </div>

          <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
            Đăng nhập
          </Button>
        </Form>

        <Typography.Paragraph className="customer-login-register-link">
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            state={{ from: redirectTo ?? location.pathname + location.search + location.hash }}
            aria-disabled={isSubmitting}
            onClick={(event) => {
              if (submitting.current) event.preventDefault();
              else closeModal();
            }}
          >
            Đăng ký ngay
          </Link>
        </Typography.Paragraph>
      </div>
    </Modal>
  );
};
