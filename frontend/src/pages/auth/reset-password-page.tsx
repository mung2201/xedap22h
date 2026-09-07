import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { authService } from '../../api/services/auth.service';
import type { ResetPasswordPayload } from '../../types/auth';
import { getErrorMessage } from '../../utils/error-message';

type ResetFormValues = Omit<ResetPasswordPayload, 'token'>;

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ResetFormValues): Promise<void> => {
    if (!token) {
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword({ ...values, token });
      message.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
      navigate('/login');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <Card className="auth-card">
        <Typography.Title level={2}>Đặt lại mật khẩu</Typography.Title>
        {!token ? (
          <Alert
            type="error"
            showIcon
            message="Liên kết reset password không hợp lệ hoặc thiếu token."
          />
        ) : (
          <Form<ResetFormValues> layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="Mật khẩu mới"
              name="password"
              rules={[
                { required: true, message: 'Vui lòng nhập mật khẩu.' },
                { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự.' },
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
            <Form.Item
              label="Xác nhận mật khẩu mới"
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
              Đặt lại mật khẩu
            </Button>
          </Form>
        )}
        <Typography.Paragraph className="auth-footer-text">
          <Link to="/login">Quay lại đăng nhập</Link>
        </Typography.Paragraph>
      </Card>
    </main>
  );
};
