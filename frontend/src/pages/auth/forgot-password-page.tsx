import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { authService } from '../../api/services/auth.service';
import { getErrorMessage } from '../../utils/error-message';

interface ForgotPasswordFormValues {
  email: string;
}

export const ForgotPasswordPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (values: ForgotPasswordFormValues): Promise<void> => {
    setIsSubmitting(true);
    try {
      await authService.forgotPassword(values.email);
      setSubmitted(true);
      message.success('Yêu cầu reset password đã được gửi.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
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
            message="Nếu email tồn tại, liên kết reset đã được gửi."
            className="auth-alert"
          />
        )}
        <Form<ForgotPasswordFormValues> layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, type: 'email', message: 'Email không hợp lệ.' }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Gửi liên kết reset
          </Button>
        </Form>
        <Typography.Paragraph className="auth-footer-text">
          <Link to="/login">Quay lại đăng nhập</Link>
        </Typography.Paragraph>
      </Card>
    </main>
  );
};
