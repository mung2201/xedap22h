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
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderService } from '../../api/services/order.service';
import type { OnlinePaymentDetails } from '../../types/order';
import { OrderStatus, PaymentStatus } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

export const MockPaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // payOS appends its own numeric orderCode to the return URL.
  const orderCode = searchParams.get('storeOrderCode') ?? searchParams.get('orderCode');
  const paymentReference = searchParams.get('paymentRef');
  const [payment, setPayment] = useState<OnlinePaymentDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadController = useRef<AbortController | null>(null);
  const confirmationPending = useRef(false);
  const startPending = useRef(false);
  const statusController = useRef<AbortController | null>(null);
  const paymentRequest = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    loadController.current = controller;
    confirmationPending.current = false;
    startPending.current = false;
    statusController.current?.abort();
    statusController.current = null;
    paymentRequest.current += 1;
    setIsConfirming(false);
    setIsStarting(false);
    setIsChecking(false);
    setStartError(null);
    setPollError(null);
    setPayment(null);
    setErrorMessage(null);
    const loadPayment = async (): Promise<void> => {
      if (!orderCode || !paymentReference) {
        setErrorMessage('Liên kết thanh toán QR không hợp lệ.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const nextPayment = await orderService.getOnlinePayment(orderCode, paymentReference, controller.signal);
        if (!controller.signal.aborted) setPayment(nextPayment);
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadPayment();
    return () => {
      controller.abort();
      statusController.current?.abort();
    };
  }, [orderCode, paymentReference, reloadKey]);

  const mode = payment?.instruction.mode;
  const paymentStarted = Boolean(payment?.instruction.paymentStarted || payment?.instruction.gatewayUrl);
  const shouldPoll = (mode === 'MOMO' || mode === 'PAYOS') && paymentStarted &&
    payment &&
    payment.order.paymentStatus === PaymentStatus.UNPAID &&
    payment.order.orderStatus !== OrderStatus.CANCELLED;

  const checkPayment = useCallback(async (): Promise<void> => {
    if (!orderCode || !paymentReference || startPending.current || statusController.current ||
      (mode === 'PAYOS' && !paymentStarted)) return;
    const controller = new AbortController();
    statusController.current = controller;
    const requestId = ++paymentRequest.current;
    setIsChecking(true);
    try {
      const nextPayment = mode === 'PAYOS'
        ? await orderService.syncOnlinePayment(orderCode, paymentReference, controller.signal)
        : await orderService.getOnlinePayment(orderCode, paymentReference, controller.signal);
      if (!controller.signal.aborted && requestId === paymentRequest.current) {
        setPayment(nextPayment);
        setPollError(null);
      }
    } catch {
      if (!controller.signal.aborted && requestId === paymentRequest.current) {
        setPollError('Chưa cập nhật được trạng thái. Vui lòng kiểm tra lại; nếu đã chuyển tiền, hãy chờ xác nhận và không thanh toán thêm lần nữa.');
      }
    } finally {
      if (statusController.current === controller) {
        statusController.current = null;
        if (!controller.signal.aborted) setIsChecking(false);
      }
    }
  }, [mode, orderCode, paymentReference, paymentStarted]);

  useEffect(() => {
    if (!shouldPoll) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const interval = mode === 'PAYOS' ? 10_000 : 5_000;
    const poll = async (): Promise<void> => {
      await checkPayment();
      if (active) timer = setTimeout(() => void poll(), interval);
    };
    timer = setTimeout(() => void poll(), interval);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [checkPayment, mode, shouldPoll]);

  const expiresAt = payment?.instruction.expiresAt;
  useEffect(() => {
    const expiry = expiresAt ? Date.parse(expiresAt) : Number.NaN;
    setIsExpired(Number.isFinite(expiry) && expiry <= Date.now());
    if (!Number.isFinite(expiry) || expiry <= Date.now()) return;
    const timer = setTimeout(() => setIsExpired(true), Math.min(expiry - Date.now(), 2_147_483_647));
    return () => clearTimeout(timer);
  }, [expiresAt]);

  const startGatewayPayment = async (): Promise<void> => {
    if (!payment || startPending.current || statusController.current || isExpired ||
      (payment.instruction.mode !== 'MOMO' && payment.instruction.mode !== 'PAYOS') ||
      payment.order.orderStatus === OrderStatus.CANCELLED ||
      payment.order.paymentStatus !== PaymentStatus.UNPAID) return;
    const signal = loadController.current?.signal;
    const requestId = ++paymentRequest.current;
    startPending.current = true;
    setIsStarting(true);
    setStartError(null);
    try {
      const nextPayment = await orderService.startOnlinePayment(
        payment.order.orderCode, payment.instruction.paymentReference, signal,
      );
      if (!signal?.aborted && requestId === paymentRequest.current) setPayment(nextPayment);
    } catch (error) {
      if (!signal?.aborted && requestId === paymentRequest.current) {
        setStartError(getErrorMessage(error));
        // A timeout can still leave a valid gateway attempt on the server.
        // Read its status before offering another request for that same attempt.
        try {
          const nextPayment = await orderService.getOnlinePayment(
            payment.order.orderCode, payment.instruction.paymentReference, signal,
          );
          if (!signal?.aborted && requestId === paymentRequest.current) {
            setPayment(nextPayment);
            if (nextPayment.instruction.gatewayUrl || nextPayment.instruction.qrPayload ||
              nextPayment.order.paymentStatus !== PaymentStatus.UNPAID) setStartError(null);
          }
        } catch {
          // Retain the original error and order so retry never creates a new order.
        }
      }
    } finally {
      if (!signal?.aborted) {
        startPending.current = false;
        setIsStarting(false);
      }
    }
  };

  const copyValue = async (value: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`Đã sao chép ${label}.`);
    } catch {
      message.error(`Không thể sao chép ${label}.`);
    }
  };

  const confirmSandboxPayment = async (): Promise<void> => {
    if (
      !payment || confirmationPending.current ||
      payment.instruction.mode !== 'SANDBOX' || !payment.instruction.customerCanConfirm ||
      payment.order.orderStatus === OrderStatus.CANCELLED ||
      payment.order.paymentStatus !== PaymentStatus.UNPAID
    ) {
      return;
    }

    const signal = loadController.current?.signal;
    confirmationPending.current = true;
    setIsConfirming(true);

    try {
      const confirmedOrder = await orderService.confirmSandboxQrPayment(
        payment.order.orderCode,
        payment.instruction.paymentReference,
      );
      if (signal?.aborted) return;
      message.success('Đã xác nhận thanh toán demo.');
      navigate(`/order-success?orderId=${confirmedOrder.id}`, { replace: true });
    } catch (error) {
      if (!signal?.aborted) {
        message.error(getErrorMessage(error));
        setReloadKey((value) => value + 1);
      }
    } finally {
      if (!signal?.aborted) {
        confirmationPending.current = false;
        setIsConfirming(false);
      }
    }
  };

  if (isLoading) {
    return (
      <main className="page-container qr-payment-page qr-payment-loading">
        <Spin size="large" tip="Đang tải thông tin thanh toán QR..." />
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
            <Space wrap>
              {orderCode && paymentReference ? (
                <Button onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button>
              ) : null}
              <Link to="/account/orders">
                <Button type="primary">Xem đơn hàng</Button>
              </Link>
            </Space>
          }
        />
      </main>
    );
  }

  const { order, instruction } = payment;
  const isPayos = instruction.mode === 'PAYOS';
  const isGateway = isPayos || instruction.mode === 'MOMO';
  const receivedPaymentAmount = isPayos && typeof instruction.amountPaid === 'number' &&
    Number.isFinite(instruction.amountPaid) ? instruction.amountPaid : undefined;
  const hasPartialPayment = receivedPaymentAmount !== undefined &&
    receivedPaymentAmount > 0 && receivedPaymentAmount < instruction.amount;

  if (
    order.orderStatus === OrderStatus.CANCELLED ||
    order.paymentStatus === PaymentStatus.REFUND_PENDING ||
    order.paymentStatus === PaymentStatus.REFUNDED ||
    order.paymentStatus === PaymentStatus.FAILED
  ) {
    const isCancelled = order.orderStatus === OrderStatus.CANCELLED;
    const isRefunded = order.paymentStatus === PaymentStatus.REFUNDED;
    const isRefundPending = order.paymentStatus === PaymentStatus.REFUND_PENDING;
    return (
      <main className="page-container qr-payment-page">
        <Result
          status="warning"
          title={isRefundPending ? 'Đơn hàng đang chờ hoàn tiền' : isRefunded ? 'Đơn hàng đã được hoàn tiền' : isCancelled ? 'Đơn hàng đã bị huỷ' : 'Thanh toán không còn hiệu lực'}
          subTitle={isRefundPending
            ? `Đơn ${order.orderCode} đã ghi nhận tiền và đang chờ cửa hàng xử lý hoàn tiền.${receivedPaymentAmount !== undefined ? ` Đã nhận qua payOS: ${formatCurrency(receivedPaymentAmount)}.` : ''} Vui lòng không thanh toán lại.`
            : `Đơn ${order.orderCode} không thể tiếp tục thanh toán bằng mã QR này. Vui lòng không chuyển tiền và kiểm tra chi tiết đơn hàng.`}
          extra={
            <Space wrap>
              <Link to={`/account/orders/${order.id}`}>
                <Button type="primary">Xem chi tiết đơn</Button>
              </Link>
              {isPayos && paymentStarted ? (
                <Button icon={<ReloadOutlined />} loading={isChecking} onClick={() => void checkPayment()}>
                  Kiểm tra thanh toán
                </Button>
              ) : null}
            </Space>
          }
        />
        {pollError ? <Alert type="warning" showIcon message={pollError} /> : null}
      </main>
    );
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
    return (
      <main className="page-container qr-payment-page">
        <Result
          status="success"
          icon={<CheckCircleOutlined />}
          title="Đơn hàng đã được thanh toán"
          subTitle={`Đơn ${order.orderCode} đã ghi nhận ${formatCurrency(order.total)}.${receivedPaymentAmount !== undefined && receivedPaymentAmount > order.total
            ? ` Đã nhận qua payOS: ${formatCurrency(receivedPaymentAmount)}; chuyển dư ${formatCurrency(receivedPaymentAmount - order.total)}. Vui lòng liên hệ cửa hàng để xử lý số tiền dư.`
            : ''} Cửa hàng gửi email xác nhận sau khi hệ thống ghi nhận thanh toán thành công.`}
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
          <Typography.Title level={1}>{isPayos ? 'Thanh toán QR qua payOS' : instruction.mode === 'MOMO' ? 'Thanh toán MoMo' : 'Thanh toán QR'}</Typography.Title>
          <Typography.Text type="secondary">
            Hoàn tất thanh toán cho đơn {order.orderCode}. Email xác nhận chỉ được gửi sau khi hệ thống ghi nhận đã nhận đủ tiền.
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
            {isExpired ? (
              <Alert type="warning" showIcon message="Mã thanh toán đã hết hạn"
                description="Vui lòng không chuyển tiền theo mã cũ. Kiểm tra trạng thái và chi tiết đơn hàng trước khi đặt lại đơn." />
            ) : hasPartialPayment ? (
              <Alert type="warning" showIcon message="Chưa nhận đủ số tiền thanh toán"
                description="Mở cổng payOS để kiểm tra số tiền còn thiếu. Không quét lại mã với toàn bộ số tiền của đơn." />
            ) : instruction.mode === 'VIETQR' && instruction.qrImageUrl ? (
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
            ) : isGateway ? (
              <Alert type="info" showIcon message={instruction.gatewayUrl
                ? `Mở cổng ${isPayos ? 'payOS' : 'MoMo'} để xem mã QR và thanh toán.`
                : isPayos ? 'Tạo mã QR rồi quét bằng ứng dụng ngân hàng của bạn.' : 'Tạo mã thanh toán để tiếp tục với MoMo.'} />
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

          {isGateway ? (
            <Space direction="vertical" size="middle" className="full-width">
              <Tag color={isPayos ? 'blue' : instruction.environment === 'sandbox' ? 'gold' : 'magenta'}>
                {isPayos ? 'QR ngân hàng qua payOS' : instruction.environment === 'sandbox' ? 'MoMo doanh nghiệp · Thử nghiệm' : 'MoMo doanh nghiệp'}
              </Tag>
              {!isPayos && instruction.environment === 'sandbox' ? (
                <Alert type="warning" showIcon message="Giao dịch thử nghiệm, không thu tiền thật."
                  description="Dùng ứng dụng MoMo Test và tài khoản thử nghiệm để quét mã." />
              ) : null}
              {isPayos && !isExpired ? (
                <Typography.Text type="secondary">
                  Giao dịch chuyển khoản thật. Kiểm tra tên người nhận, chuyển đúng số tiền và giữ nguyên nội dung thanh toán.
                </Typography.Text>
              ) : null}
              {startError ? <Alert type="warning" showIcon message={`Chưa kết nối được ${isPayos ? 'payOS' : 'MoMo'}`} description={startError} /> : null}
              {!isExpired && instruction.gatewayUrl ? (
                <Button type="primary" size="large" block href={instruction.gatewayUrl} target="_blank" rel="noopener noreferrer">
                  Mở cổng thanh toán {isPayos ? 'payOS' : 'MoMo'}
                </Button>
              ) : !isExpired && !instruction.qrPayload && !hasPartialPayment ? (
                <Button type="primary" size="large" block loading={isStarting} disabled={isChecking} onClick={() => void startGatewayPayment()}>
                  {startError || instruction.paymentStarted ? `Thử lại kết nối ${isPayos ? 'payOS' : 'MoMo'}` : isPayos ? 'Tạo mã QR thanh toán' : 'Tạo mã thanh toán MoMo'}
                </Button>
              ) : null}
            </Space>
          ) : instruction.mode === 'SANDBOX' ? (
            <Tag color="gold">QR demo / Sandbox</Tag>
          ) : (
            <Tag color="blue">VietQR chuyển khoản ngân hàng</Tag>
          )}
        </Card>

        <Space direction="vertical" size="large" className="full-width">
          <Card title={<><SafetyCertificateOutlined /> {instruction.mode === 'MOMO' ? 'Thông tin thanh toán MoMo' : 'Thông tin chuyển khoản'}</>}>
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
                      aria-label="Sao chép số tài khoản"
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
              <Descriptions.Item label={instruction.mode === 'MOMO' ? 'Nội dung thanh toán' : 'Nội dung chuyển khoản'}>
                <Space wrap>
                  <Typography.Text code>{instruction.transferContent}</Typography.Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    aria-label="Sao chép nội dung chuyển khoản"
                    onClick={() =>
                      void copyValue(instruction.transferContent, 'nội dung chuyển khoản')
                    }
                  />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Mã tham chiếu">
                <Typography.Text code>{instruction.paymentReference}</Typography.Text>
              </Descriptions.Item>
              {hasPartialPayment ? (
                <>
                  <Descriptions.Item label="Đã nhận">{formatCurrency(instruction.amountPaid ?? 0)}</Descriptions.Item>
                  <Descriptions.Item label="Còn thiếu">{formatCurrency(instruction.amount - (instruction.amountPaid ?? 0))}</Descriptions.Item>
                </>
              ) : null}
              {instruction.expiresAt && Number.isFinite(Date.parse(instruction.expiresAt)) ? (
                <Descriptions.Item label="Hạn thanh toán">
                  {new Date(instruction.expiresAt).toLocaleString('vi-VN')}
                </Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>

          {instruction.mode === 'SANDBOX' && instruction.customerCanConfirm ? (
            <Card title="Xác nhận thanh toán demo">
              <Typography.Paragraph type="secondary">
                Đây là thanh toán thử nghiệm, không thu tiền thật. Nhấn nút để kiểm tra xác nhận thanh toán cho đơn hàng.
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
                message={isPayos ? 'Trạng thái được xác minh qua payOS.' : instruction.mode === 'MOMO' ? 'Trạng thái thanh toán do MoMo xác nhận.' : 'Sau khi quét VietQR, tiền sẽ được trừ trong ứng dụng ngân hàng của bạn.'}
                description={isGateway
                  ? 'Trang sẽ tự kiểm tra trạng thái sau khi tạo thanh toán. Nếu đã trả tiền, hãy chờ xác nhận trước khi thực hiện giao dịch khác.'
                  : 'Trạng thái sẽ được cập nhật sau khi cửa hàng đối soát giao dịch. Bạn có thể kiểm tra lại tại đây.'}
              />
              {pollError ? <Alert type="warning" showIcon message={pollError} /> : null}
              <Button
                className="qr-payment-refresh-button"
                icon={<ReloadOutlined />}
                loading={isChecking}
                disabled={isStarting || (isPayos && !paymentStarted)}
                onClick={() => void checkPayment()}
              >
                {isPayos ? 'Kiểm tra thanh toán' : 'Kiểm tra lại trạng thái'}
              </Button>
            </Card>
          )}
        </Space>
      </div>
    </main>
  );
};
