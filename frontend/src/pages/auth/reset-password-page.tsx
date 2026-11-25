import { Alert, Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRef, useState } from 'react';
import { authService } from '../../api/services/auth.service';
import type { ResetPasswordPayload } from '../../types/auth';
import { getErrorMessage } from '../../utils/error-message';

type ResetFormValues = Omit<ResetPasswordPayload, 'token'>;

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: ResetFormValues): Promise<void> => {
    if (!token || submitting.current) {
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    try {
      await authService.resetPassword({ ...values, token });
      message.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
      navigate('/login', { replace: true });
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
        <Typography.Title level={2}>Đặt lại mật khẩu</Typography.Title>
        {!token ? (
          <Alert
            type="error"
            showIcon
            message="Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng nhận liên kết mới."
          />
        ) : (
          <Form<ResetFormValues> layout="vertical" onFinish={handleSubmit} disabled={isSubmitting}>
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
          <Link
            to="/forgot-password"
            aria-disabled={isSubmitting}
            onClick={(event) => { if (submitting.current) event.preventDefault(); }}
          >
            Nhận liên kết mới
          </Link>
        </Typography.Paragraph>
        <Typography.Paragraph className="auth-footer-text">
          <Link
            to="/login"
            aria-disabled={isSubmitting}
            onClick={(event) => { if (submitting.current) event.preventDefault(); }}
          >
            Quay lại đăng nhập
          </Link>
        </Typography.Paragraph>
      </Card>
    </main>
  );
};
