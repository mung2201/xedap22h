import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Image,
  Result,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderService } from '../../api/services/order.service';
import type { OnlinePaymentDetails } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

export const MockPaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get('orderCode');
  const paymentReference = searchParams.get('paymentRef');
  const [payment, setPayment] = useState<OnlinePaymentDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  const loadPayment = useCallback(async (): Promise<void> => {
    if (!orderCode || !paymentReference) {
      setErrorMessage('Liên kết thanh toán QR không hợp lệ.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      setPayment(await orderService.getOnlinePayment(orderCode, paymentReference));
    } catch (error) {
      setPayment(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [orderCode, paymentReference]);

  useEffect(() => {
    void loadPayment();
  }, [loadPayment]);

  const copyValue = async (value: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`Đã sao chép ${label}.`);
    } catch {
      message.error(`Không thể sao chép ${label}.`);
    }
  };

  const confirmSandboxPayment = async (): Promise<void> => {
    if (!payment) {
      return;
    }

    setIsConfirming(true);

    try {
      const confirmedOrder = await orderService.confirmSandboxQrPayment(
        payment.order.orderCode,
        payment.instruction.paymentReference,
      );
      message.success('Đã xác nhận thanh toán demo.');
      navigate(`/order-success?orderId=${confirmedOrder.id}`, { replace: true });
    } catch (error) {
      message.error(getErrorMessage(error));
      await loadPayment();
    } finally {
      setIsConfirming(false);
    }
  };

  if (isLoading) {
    return (
      <main className="page-container qr-payment-page qr-payment-loading">
        <Spin size="large" tip="Đang tạo thông tin thanh toán QR..." />
      </main>
    );
  }

  if (errorMessage || !payment) {
    return (
      <main className="page-container qr-payment-page">
        <Result
          status="error"
          icon={<CloseCircleOutlined />}
          title="Không thể mở thanh toán QR"
          subTitle={errorMessage ?? 'Không tìm thấy đơn hàng thanh toán.'}
          extra={
            <Link to="/account/orders">
              <Button type="primary">Xem đơn hàng</Button>
            </Link>
          }
        />
      </main>
    );
  }

  const { order, instruction } = payment;

  if (order.paymentStatus === 'PAID') {
    return (
      <main className="page-container qr-payment-page">
        <Result
          status="success"
          icon={<CheckCircleOutlined />}
          title="Đơn hàng đã được thanh toán"
          subTitle={`Đơn ${order.orderCode} đã ghi nhận ${formatCurrency(order.total)}.`}
          extra={
            <Link to={`/account/orders/${order.id}`}>
              <Button type="primary">Xem chi tiết đơn</Button>
            </Link>
          }
        />
      </main>
    );
  }

  return (
    <main className="page-container qr-payment-page">
      <div className="qr-payment-heading">
        <div>
          <Typography.Title level={1}>Thanh toán QR</Typography.Title>
          <Typography.Text type="secondary">
            Hoàn tất thanh toán cho đơn {order.orderCode}.
          </Typography.Text>
        </div>
        <Link to={`/account/orders/${order.id}`}>Xem đơn hàng</Link>
      </div>

      <div className="qr-payment-layout">
        <Card
          className="qr-payment-card"
          title={<><QrcodeOutlined /> Quét mã để thanh toán</>}
        >
          <div className="qr-payment-code-wrap">
            {instruction.mode === 'VIETQR' && instruction.qrImageUrl ? (
              <Image
                className="qr-payment-image"
                preview={false}
                src={instruction.qrImageUrl}
                alt={`Mã VietQR cho đơn ${order.orderCode}`}
              />
            ) : instruction.qrPayload ? (
              <div className="qr-payment-code">
                <QRCodeSVG
                  value={instruction.qrPayload}
                  size={260}
                  level="M"
                  includeMargin
                />
              </div>
            ) : (
              <Alert type="error" showIcon message="Không thể tạo mã QR." />
            )}
          </div>

          <Typography.Title level={2} className="qr-payment-amount">
            {formatCurrency(instruction.amount)}
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="qr-payment-instructions">
            {instruction.instructions}
          </Typography.Paragraph>

          {instruction.mode === 'SANDBOX' ? (
            <Tag color="gold">QR demo / Sandbox</Tag>
          ) : (
            <Tag color="blue">VietQR chuyển khoản ngân hàng</Tag>
          )}
        </Card>

        <Space direction="vertical" size="large" className="full-width">
          <Card title={<><SafetyCertificateOutlined /> Thông tin chuyển khoản</>}>
            <Descriptions column={1} size="small" bordered>
              {instruction.accountName ? (
                <Descriptions.Item label="Chủ tài khoản">
                  {instruction.accountName}
                </Descriptions.Item>
              ) : null}
              {instruction.accountNumber ? (
                <Descriptions.Item label="Số tài khoản">
                  <Space wrap>
                    <Typography.Text strong>{instruction.accountNumber}</Typography.Text>
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={() =>
                        void copyValue(instruction.accountNumber ?? '', 'số tài khoản')
                      }
                    />
                  </Space>
                </Descriptions.Item>
              ) : null}
              {instruction.bankBin ? (
                <Descriptions.Item label="Mã ngân hàng">
                  {instruction.bankBin}
                </Descriptions.Item>
              ) : null}
              <Descriptions.Item label="Nội dung chuyển khoản">
                <Space wrap>
                  <Typography.Text code>{instruction.transferContent}</Typography.Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={() =>
                      void copyValue(instruction.transferContent, 'nội dung chuyển khoản')
                    }
                  />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Mã tham chiếu">
                <Typography.Text code>{instruction.paymentReference}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {instruction.customerCanConfirm ? (
            <Card title="Xác nhận thanh toán demo">
              <Typography.Paragraph type="secondary">
                Dùng nút này chỉ để kiểm tra flow trong môi trường sandbox. Hệ thống sẽ chuyển đơn sang trạng thái đã thanh toán và gửi email xác nhận nếu SMTP đã được cấu hình.
              </Typography.Paragraph>
              <Button
                type="primary"
                size="large"
                block
                loading={isConfirming}
                onClick={() => void confirmSandboxPayment()}
              >
                Mô phỏng đã thanh toán
              </Button>
            </Card>
          ) : (
            <Card title="Đang chờ đối soát thanh toán">
              <Alert
                type="info"
                showIcon
                message="Sau khi quét VietQR, tiền sẽ được trừ trong ứng dụng ngân hàng của bạn."
                description="Website chỉ chuyển đơn sang Đã thanh toán khi nhận callback đã xác thực từ cổng thanh toán/ngân hàng; không tin thao tác xác nhận từ trình duyệt."
              />
              <Button
                className="qr-payment-refresh-button"
                icon={<ReloadOutlined />}
                onClick={() => void loadPayment()}
              >
                Kiểm tra lại trạng thái
              </Button>
            </Card>
          )}
        </Space>
      </div>
    </main>
  );
};
