import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { authService } from '../../api/services/auth.service';
import { getErrorMessage } from '../../utils/error-message';

interface ForgotPasswordFormValues {
  email: string;
}

export const ForgotPasswordPage = () => {
  const submitting = useRef(false);
  const mounted = useRef(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const handleSubmit = async (values: ForgotPasswordFormValues): Promise<void> => {
    if (submitting.current) return;
    submitting.current = true;
    setIsSubmitting(true);
    setSubmitted(false);
    try {
      await authService.forgotPassword(values.email);
      if (!mounted.current) return;
      setSubmitted(true);
      message.success('Đã gửi yêu cầu đặt lại mật khẩu.');
    } catch (error) {
      if (mounted.current) message.error(getErrorMessage(error));
    } finally {
      submitting.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>Quên mật khẩu</Typography.Title>
        <Typography.Paragraph type="secondary">
          Nhập email để nhận liên kết đặt lại mật khẩu.
        </Typography.Paragraph>
        {submitted && (
          <Alert
            type="success"
            showIcon
            message="Nếu email đã đăng ký, liên kết đặt lại mật khẩu đã được gửi."
            className="auth-alert"
          />
        )}
        <Form<ForgotPasswordFormValues> layout="vertical" onFinish={handleSubmit} disabled={isSubmitting}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Email không hợp lệ.' }]}
          >
            <Input autoComplete="email" inputMode="email" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Gửi liên kết đặt lại mật khẩu
          </Button>
        </Form>
        <Typography.Paragraph className="auth-footer-text">
          <Link to="/login" aria-disabled={isSubmitting} onClick={(event) => { if (submitting.current) event.preventDefault(); }}>Quay lại đăng nhập</Link>
        </Typography.Paragraph>
      </Card>
    </main>
  );
};
