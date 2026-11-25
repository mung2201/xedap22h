import {
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Space,
  Switch,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addressService } from '../../api/services/address.service';
import { cartService } from '../../api/services/cart.service';
import { checkoutService } from '../../api/services/checkout.service';
import { orderService } from '../../api/services/order.service';
import { AddressLocationFields } from '../../components/common/address-location-fields';
import { PhoneNumberInput } from '../../components/common/phone-number-input';
import { useAuthStore } from '../../stores/auth.store';
import { useCommerceStore } from '../../stores/commerce.store';
import type { Address, AddressPayload } from '../../types/address';
import type { Cart } from '../../types/commerce';
import {
  PaymentMethod,
  ShippingMethod,
} from '../../types/order';
import type { CheckoutPreview, PaymentOptions } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';
import { formatDeliveryAddress, localMobilePhone, MOBILE_PHONE_MESSAGE, MOBILE_PHONE_PATTERN, normalizeAddressPayload } from '../../utils/address';

const emptyCart: Cart = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  hasUnavailableItems: false,
};

const previewKey = (addressId: string, voucherCode: string | undefined, method: ShippingMethod): string =>
  JSON.stringify([addressId, voucherCode ?? '', method]);

interface CheckoutContactFormValues {
  customerEmail: string;
  customerPhone: string;
}

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const setCartCount = useCommerceStore((state) => state.setCart);
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>();
  const [shippingMethod, setShippingMethod] = useState(ShippingMethod.STANDARD);
  const [paymentMethod, setPaymentMethod] = useState(PaymentMethod.COD);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const [paymentOptionsError, setPaymentOptionsError] = useState<string | null>(null);
  const [paymentOptionsAttempt, setPaymentOptionsAttempt] = useState(0);
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string>();
  const [orderNote, setOrderNote] = useState('');
  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const previewRequest = useRef<AbortController | null>(null);
  const acceptedPreviewKey = useRef<string | null>(null);
  const submissionLocked = useRef(false);
  const addressSubmissionLocked = useRef(false);
  const pageController = useRef<AbortController | null>(null);
  const [addressForm] = Form.useForm<AddressPayload>();
  const [contactForm] = Form.useForm<CheckoutContactFormValues>();

  useEffect(() => {
    const controller = new AbortController();
    pageController.current = controller;
    submissionLocked.current = false;
    addressSubmissionLocked.current = false;
    setIsCreating(false);
    setIsSavingAddress(false);
    setIsAddressModalOpen(false);
    contactForm.resetFields();
    return () => controller.abort();
  }, [currentUser?.id, contactForm]);

  const isActivePage = (signal: AbortSignal | undefined): boolean =>
    Boolean(signal && !signal.aborted && currentUser?.id &&
      useAuthStore.getState().user?.id === currentUser.id);

  useEffect(() => {
    if (currentUser?.email) {
      contactForm.setFieldValue('customerEmail', currentUser.email);
    }
  }, [contactForm, currentUser?.email]);

  useEffect(() => {
    if (!contactForm.isFieldTouched('customerPhone')) {
      const address = addresses.find((item) => item.id === selectedAddressId);
      contactForm.setFieldValue('customerPhone', localMobilePhone(currentUser?.phone || address?.phone || ''));
    }
  }, [addresses, selectedAddressId, contactForm, currentUser?.phone]);

  const loadPreview = useCallback(async (
    addressId: string,
    voucherCode: string | undefined,
    method: ShippingMethod,
  ): Promise<void> => {
    previewRequest.current?.abort();
    const controller = new AbortController();
    previewRequest.current = controller;
    acceptedPreviewKey.current = null;
    setIsPreviewLoading(true);
    setErrorMessage(null);

    try {
      const nextPreview = await checkoutService.preview({
          addressId,
          ...(voucherCode ? { voucherCode } : {}),
          shippingMethod: method,
        }, controller.signal);
      if (controller.signal.aborted) return;
      acceptedPreviewKey.current = previewKey(addressId, voucherCode, method);
      setPreview(nextPreview);
    } catch (error) {
      if (controller.signal.aborted) return;
      setPreview(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      if (!controller.signal.aborted) setIsPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadInitialData = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);
      setCart(emptyCart);
      setAddresses([]);
      setSelectedAddressId(undefined);
      setPreview(null);
      setIsPreviewLoading(false);
      acceptedPreviewKey.current = null;
      setShippingMethod(ShippingMethod.STANDARD);
      setPaymentMethod(PaymentMethod.COD);
      setAppliedVoucherCode(undefined);
      setVoucherInput('');
      setOrderNote('');

      try {
        const [nextCart, nextAddresses] = await Promise.all([
          cartService.getMine(),
          addressService.getAll(),
        ]);
        if (cancelled || useAuthStore.getState().user?.id !== currentUser?.id) return;
        setCart(nextCart);
        setCartCount(nextCart);
        setAddresses(nextAddresses);

        const initialAddress =
          nextAddresses.find((address) => address.isDefault) ?? nextAddresses[0];

        if (initialAddress && nextCart.items.length) {
          setSelectedAddressId(initialAddress.id);
          await loadPreview(
            initialAddress.id,
            undefined,
            ShippingMethod.STANDARD,
          );
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadInitialData();
    return () => {
      cancelled = true;
      previewRequest.current?.abort();
    };
  }, [setCartCount, loadPreview, loadAttempt, currentUser?.id]);

  useEffect(() => {
    const controller = new AbortController();
    setPaymentOptions(null);
    setPaymentOptionsError(null);
    void orderService.getPaymentOptions(controller.signal)
      .then((options) => { if (!controller.signal.aborted) setPaymentOptions(options); })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setPaymentOptionsError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, [paymentOptionsAttempt, currentUser?.id]);

  const selectAddress = (addressId: string): void => {
    if (submissionLocked.current) return;
    setSelectedAddressId(addressId);
    void loadPreview(addressId, appliedVoucherCode, shippingMethod);
  };

  const selectShippingMethod = (method: ShippingMethod): void => {
    if (submissionLocked.current) return;
    setShippingMethod(method);

    if (selectedAddressId) {
      void loadPreview(selectedAddressId, appliedVoucherCode, method);
    }
  };

  const applyVoucher = (): void => {
    if (submissionLocked.current) return;
    if (!selectedAddressId) {
      message.warning('Vui lòng chọn địa chỉ giao hàng trước.');
      return;
    }

    const code = voucherInput.trim().toUpperCase();
    setAppliedVoucherCode(code || undefined);
    void loadPreview(selectedAddressId, code || undefined, shippingMethod);
  };

  const removeVoucher = (): void => {
    if (submissionLocked.current) return;
    setVoucherInput('');
    setAppliedVoucherCode(undefined);

    if (selectedAddressId) {
      void loadPreview(selectedAddressId, undefined, shippingMethod);
    }
  };

  const openAddressModal = (): void => {
    if (submissionLocked.current || addressSubmissionLocked.current) return;
    addressForm.resetFields();
    addressForm.setFieldsValue({ isDefault: addresses.length === 0, addressFormat: 'CURRENT', district: '' });
    setIsAddressModalOpen(true);
  };

  const closeAddressModal = (): void => {
    if (addressSubmissionLocked.current) {
      return;
    }

    setIsAddressModalOpen(false);
    addressForm.resetFields();
  };

  const saveCheckoutAddress = async (values: AddressPayload): Promise<void> => {
    if (addressSubmissionLocked.current || submissionLocked.current) return;
    const signal = pageController.current?.signal;
    if (!isActivePage(signal)) return;
    addressSubmissionLocked.current = true;
    setIsSavingAddress(true);

    try {
      const createdAddress = await addressService.create(normalizeAddressPayload(values));
      if (!isActivePage(signal)) return;

      // The successful POST already contains the saved address. A follow-up GET
      // must not turn that success into a retry that creates a duplicate address.
      setAddresses((current) => [
        createdAddress,
        ...current.filter((address) => address.id !== createdAddress.id)
          .map((address) => createdAddress.isDefault ? { ...address, isDefault: false } : address),
      ]);
      setSelectedAddressId(createdAddress.id);
      setIsAddressModalOpen(false);
      addressForm.resetFields();
      message.success('Đã lưu địa chỉ và chọn làm địa chỉ giao hàng.');
      await loadPreview(createdAddress.id, appliedVoucherCode, shippingMethod);
    } catch (error) {
      if (isActivePage(signal)) message.error(getErrorMessage(error));
    } finally {
      if (isActivePage(signal)) {
        addressSubmissionLocked.current = false;
        setIsSavingAddress(false);
      }
    }
  };

  const createOrder = async (): Promise<void> => {
    if (submissionLocked.current || addressSubmissionLocked.current || isAddressModalOpen) return;
    const signal = pageController.current?.signal;
    if (!isActivePage(signal)) return;
    if (paymentMethod === PaymentMethod.ONLINE && !paymentOptions?.enabled) {
      message.warning('Thanh toán trực tuyến hiện chưa sẵn sàng. Bạn có thể chọn COD.');
      return;
    }
    if (!selectedAddressId) {
      message.warning('Vui lòng thêm hoặc chọn địa chỉ giao hàng.');
      openAddressModal();
      return;
    }

    // The displayed quotation must belong to the exact current checkout choices.
    if (!preview || acceptedPreviewKey.current !== previewKey(selectedAddressId, appliedVoucherCode, shippingMethod)) {
      return;
    }

    submissionLocked.current = true;
    setIsCreating(true);

    let contactValues: CheckoutContactFormValues;
    try {
      contactValues = await contactForm.validateFields();
    } catch {
      if (isActivePage(signal)) {
        submissionLocked.current = false;
        setIsCreating(false);
      }
      return;
    }
    if (!isActivePage(signal)) return;

    try {
      const order = await orderService.create({
        addressId: selectedAddressId,
        ...(appliedVoucherCode ? { voucherCode: appliedVoucherCode } : {}),
        shippingMethod,
        paymentMethod,
        customerEmail: contactValues.customerEmail.trim().toLowerCase(),
        customerPhone: contactValues.customerPhone.trim(),
        ...(orderNote.trim() ? { note: orderNote.trim() } : {}),
      });
      if (!isActivePage(signal)) return;
      setCart(emptyCart);
      setCartCount(emptyCart);

      if (paymentMethod === PaymentMethod.ONLINE && order.paymentUrl) {
        try {
          const paymentUrl = new URL(order.paymentUrl, window.location.origin);

          if (paymentUrl.origin === window.location.origin) {
            navigate(`${paymentUrl.pathname}${paymentUrl.search}`, { replace: true });
          } else {
            window.location.assign(paymentUrl.toString());
          }
        } catch {
          // The order already exists at this point. Avoid presenting a false
          // checkout failure if a provider returns a malformed redirect URL.
          message.warning('Đơn hàng đã tạo, nhưng không thể mở cổng thanh toán.');
          navigate(`/order-success?orderId=${order.id}`, { replace: true });
        }
        return;
      }

      navigate(`/order-success?orderId=${order.id}`, { replace: true });
    } catch (error) {
      if (isActivePage(signal)) {
        message.error(getErrorMessage(error));
        setErrorMessage(getErrorMessage(error));
      }
    } finally {
      if (isActivePage(signal)) {
        submissionLocked.current = false;
        setIsCreating(false);
      }
    }
  };

  if (isLoading) {
    return (
      <main className="page-container checkout-page checkout-loading">
        <Spin size="large" />
      </main>
    );
  }

  if (!cart.items.length) {
    if (errorMessage) {
      return (
        <main className="page-container checkout-page">
          <Alert
            type="error"
            showIcon
            message="Chưa tải được thông tin thanh toán"
            description={errorMessage}
            action={<Button onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Thử lại</Button>}
          />
        </main>
      );
    }
    return (
      <main className="page-container checkout-page">
        <Empty description="Giỏ hàng đang trống">
          <Link to="/products">
            <Button type="primary" icon={<ShoppingCartOutlined />}>
              Quay lại sản phẩm
            </Button>
          </Link>
        </Empty>
      </main>
    );
  }

  return (
    <main className="page-container checkout-page">
      <div className="checkout-heading">
        <div>
          <Typography.Title level={1}>Thanh toán</Typography.Title>
          <Typography.Text type="secondary">
            Kiểm tra thông tin nhận hàng và chọn cách thanh toán phù hợp.
          </Typography.Text>
        </div>
        <Link to="/cart">Quay lại giỏ hàng</Link>
      </div>

      {errorMessage ? <Alert className="checkout-alert" type="error" showIcon message={errorMessage} /> : null}

      <div className="checkout-layout">
        <Space direction="vertical" size="large" className="full-width">
          <Card title={<><EnvironmentOutlined /> Địa chỉ giao hàng</>}>
            {addresses.length ? (
              <Radio.Group
                className="checkout-addresses"
                disabled={isCreating || isSavingAddress}
                value={selectedAddressId}
                onChange={(event) => selectAddress(event.target.value)}
              >
                <Space direction="vertical" size="middle" className="full-width">
                  {addresses.map((address) => (
                    <Radio key={address.id} value={address.id} className="checkout-address-option">
                      <Space direction="vertical" size={2}>
                        <Space wrap>
                          <Typography.Text strong>{address.recipientName}</Typography.Text>
                          <Typography.Text type="secondary">{address.phone}</Typography.Text>
                          {address.isDefault ? <Tag color="gold">Mặc định</Tag> : null}
                        </Space>
                        <Typography.Text>
                          {formatDeliveryAddress(address)}
                        </Typography.Text>
                      </Space>
                    </Radio>
                  ))}
                </Space>
              </Radio.Group>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Bạn chưa có địa chỉ giao hàng. Thêm địa chỉ ngay tại đây để tiếp tục."
              />
            )}
            <Button
              type="link"
              icon={<PlusOutlined />}
              className="checkout-manage-address-link"
              disabled={isCreating || isSavingAddress}
              onClick={openAddressModal}
            >
              Thêm địa chỉ mới
            </Button>
          </Card>

          <Card title={<><TruckOutlined /> Phương thức vận chuyển</>}>
            <Radio.Group
              value={shippingMethod}
              disabled={isCreating || isSavingAddress}
              onChange={(event) =>
                selectShippingMethod(event.target.value as ShippingMethod)
              }
            >
              <Space direction="vertical">
                <Radio value={ShippingMethod.STANDARD}>Giao hàng tiêu chuẩn</Radio>
                <Radio value={ShippingMethod.EXPRESS}>Giao hàng nhanh</Radio>
              </Space>
            </Radio.Group>
          </Card>

          <Card title={<><MailOutlined /> Nhận thông báo đơn hàng</>}>
            <Form<CheckoutContactFormValues>
              form={contactForm}
              layout="vertical"
              requiredMark={false}
              disabled={isCreating}
            >
              <Form.Item
                label="Email"
                name="customerEmail"
                rules={[
                  {
                    required: true,
                    message: 'Vui lòng nhập email nhận thông tin đơn hàng.',
                  },
                  { type: 'email', message: 'Email chưa đúng định dạng.' },
                ]}
              >
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                />
              </Form.Item>
              <Form.Item
                label="Số điện thoại liên hệ"
                name="customerPhone"
                rules={[
                  { required: true, message: 'Vui lòng nhập số điện thoại nhận thông báo.' },
                  { pattern: MOBILE_PHONE_PATTERN, message: MOBILE_PHONE_MESSAGE },
                ]}
              >
                <PhoneNumberInput prefix={<PhoneOutlined />} />
              </Form.Item>
            </Form>
            <Typography.Text type="secondary">
              {paymentMethod === PaymentMethod.COD
                ? 'Cửa hàng gửi email xác nhận sau khi đặt hàng COD thành công.'
                : 'Cửa hàng chỉ gửi email xác nhận thanh toán sau khi hệ thống ghi nhận đã nhận đủ tiền.'}
              {' '}Số này dùng để cửa hàng liên hệ về đơn hàng.
            </Typography.Text>
          </Card>

          <Card title="Voucher">
            <Space.Compact className="checkout-voucher-input">
              <Input
                value={voucherInput}
                disabled={isCreating || isSavingAddress}
                placeholder="Nhập mã giảm giá"
                maxLength={64}
                onChange={(event) => setVoucherInput(event.target.value)}
                onPressEnter={applyVoucher}
              />
              <Button loading={isPreviewLoading} disabled={isCreating || isSavingAddress} onClick={applyVoucher}>
                Áp dụng
              </Button>
            </Space.Compact>
            {preview?.voucher ? (
              <Space className="checkout-applied-voucher" wrap>
                <Tag color="green">{preview.voucher.code}</Tag>
                <Typography.Text type="secondary">{preview.voucher.name}</Typography.Text>
                <Button type="link" size="small" disabled={isCreating || isSavingAddress} onClick={removeVoucher}>
                  Bỏ mã
                </Button>
              </Space>
            ) : null}
          </Card>

          <Card title="Phương thức thanh toán">
            <Radio.Group
              value={paymentMethod}
              disabled={isCreating}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            >
              <Space direction="vertical">
                <Radio value={PaymentMethod.COD}>Thanh toán khi nhận hàng (COD)</Radio>
                <Radio value={PaymentMethod.ONLINE} disabled={!paymentOptions?.enabled}>
                  {paymentOptions?.provider === 'MOMO'
                    ? `MoMo doanh nghiệp${paymentOptions.environment === 'sandbox' ? ' (thử nghiệm)' : ''}`
                    : paymentOptions?.provider === 'PAYOS'
                      ? 'QR ngân hàng qua payOS'
                      : 'Thanh toán QR / chuyển khoản ngân hàng'}
                </Radio>
              </Space>
            </Radio.Group>
            <Typography.Paragraph type="secondary" className="checkout-payment-note">
              {paymentMethod === PaymentMethod.COD
                ? 'Đơn hàng COD được tạo ở trạng thái chưa thanh toán.'
                : paymentOptions?.provider === 'MOMO'
                  ? 'Sau khi đặt hàng, bạn có thể tạo mã QR hoặc mở cổng MoMo. Đơn hàng chỉ được ghi nhận đã thanh toán khi MoMo xác nhận.'
                  : paymentOptions?.provider === 'PAYOS'
                    ? 'Sau khi đặt hàng, tạo mã QR rồi quét bằng ứng dụng ngân hàng. Hệ thống tự cập nhật khi payOS xác nhận đã nhận đủ tiền.'
                    : 'Bạn sẽ được chuyển đến trang QR để kiểm tra thông tin và thanh toán an toàn.'}
            </Typography.Paragraph>
            {paymentOptionsError ? (
              <Alert type="warning" showIcon message="Chưa tải được phương thức thanh toán trực tuyến"
                description="Bạn vẫn có thể đặt hàng COD."
                action={<Button disabled={isCreating} onClick={() => setPaymentOptionsAttempt((value) => value + 1)}>Thử lại</Button>} />
            ) : paymentOptions && !paymentOptions.enabled ? (
              <Alert type="info" showIcon message="Thanh toán trực tuyến chưa sẵn sàng. Bạn có thể đặt hàng COD." />
            ) : !paymentOptions ? (
              <Typography.Text type="secondary">Đang kiểm tra thanh toán trực tuyến…</Typography.Text>
            ) : null}
          </Card>

          <Card title="Ghi chú đơn hàng">
            <Input.TextArea
              rows={3}
              value={orderNote}
              disabled={isCreating}
              maxLength={500}
              placeholder="Ví dụ: gọi trước khi giao hàng"
              onChange={(event) => setOrderNote(event.target.value)}
            />
          </Card>
        </Space>

        <Card title="Đơn hàng của bạn" className="checkout-summary-card" aria-busy={isPreviewLoading}>
          {isPreviewLoading ? <Space><Spin size="small" /><Typography.Text type="secondary">Đang cập nhật tổng tiền…</Typography.Text></Space> : null}
          {preview ? (
            <Space direction="vertical" size="middle" className="full-width">
              <div className="checkout-item-list">
                {preview.items.map((item) => (
                  <div key={`${item.productId}-${item.variantId}`} className="checkout-item-row">
                    <div>
                      <Typography.Text strong>{item.name}</Typography.Text>
                      <Typography.Text type="secondary" className="checkout-item-meta">
                        {item.color} / {item.size} × {item.quantity}
                      </Typography.Text>
                    </div>
                    <Typography.Text>{formatCurrency(item.totalPrice)}</Typography.Text>
                  </div>
                ))}
              </div>
              <div className="checkout-summary-row">
                <Typography.Text>Tạm tính</Typography.Text>
                <Typography.Text>{formatCurrency(preview.subtotal)}</Typography.Text>
              </div>
              <div className="checkout-summary-row">
                <Typography.Text>Giảm giá</Typography.Text>
                <Typography.Text type={preview.discount > 0 ? 'success' : undefined}>
                  -{formatCurrency(preview.discount)}
                </Typography.Text>
              </div>
              <div className="checkout-summary-row">
                <Typography.Text>Phí vận chuyển</Typography.Text>
                <Typography.Text>{formatCurrency(preview.shippingFee)}</Typography.Text>
              </div>
              <div className="checkout-summary-row checkout-total-row">
                <Typography.Text strong>Tổng cộng</Typography.Text>
                <Typography.Title level={3}>{formatCurrency(preview.total)}</Typography.Title>
              </div>
              <Button
                type="primary"
                size="large"
                block
                loading={isCreating}
                disabled={isPreviewLoading || isSavingAddress || (paymentMethod === PaymentMethod.ONLINE && !paymentOptions?.enabled)}
                onClick={() => void createOrder()}
              >
                {paymentMethod === PaymentMethod.COD
                  ? 'Đặt hàng COD'
                  : 'Tiếp tục thanh toán'}
              </Button>
            </Space>
          ) : (
            <Alert
              type="warning"
              showIcon
              message="Chưa thể tạo báo giá. Hãy kiểm tra lại giỏ hàng, địa chỉ và voucher."
              action={selectedAddressId && !isPreviewLoading ? (
                <Button onClick={() => void loadPreview(selectedAddressId, appliedVoucherCode, shippingMethod)}>Thử lại</Button>
              ) : undefined}
            />
          )}
        </Card>
      </div>

      <Modal
        title="Thêm địa chỉ giao hàng"
        open={isAddressModalOpen}
        onCancel={closeAddressModal}
        footer={null}
        destroyOnHidden
        maskClosable={!isSavingAddress}
        closable={!isSavingAddress}
      >
        <Typography.Paragraph type="secondary">
          Địa chỉ này sẽ được lưu vào sổ địa chỉ của tài khoản và chọn ngay cho đơn hàng hiện tại.
        </Typography.Paragraph>
        <Form<AddressPayload>
          form={addressForm}
          layout="vertical"
          disabled={isSavingAddress}
          onFinish={(values) => void saveCheckoutAddress(values)}
        >
          <Form.Item
            label="Tên người nhận"
            name="recipientName"
            rules={[{ required: true, min: 2, message: 'Nhập tên người nhận.' }]}
          >
            <Input autoComplete="name" />
          </Form.Item>
          <Form.Item
            label="Số điện thoại"
            name="phone"
            rules={[
              { required: true, message: 'Nhập số điện thoại.' },
              { pattern: MOBILE_PHONE_PATTERN, message: MOBILE_PHONE_MESSAGE },
            ]}
            extra="Số di động Việt Nam gồm 10 chữ số, ví dụ 0912345678."
          >
            <PhoneNumberInput />
          </Form.Item>
          <AddressLocationFields form={addressForm} />
          <Form.Item
            label="Địa chỉ chi tiết"
            name="addressLine"
            rules={[{ required: true, min: 5, message: 'Nhập địa chỉ chi tiết.' }]}
          >
            <Input.TextArea rows={2} autoComplete="street-address" />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <Form.Item
            label="Đặt làm địa chỉ mặc định"
            name="isDefault"
            valuePropName="checked"
          >
            <Switch checkedChildren="Có" unCheckedChildren="Không" />
          </Form.Item>
          <Space className="modal-form-actions">
            <Button onClick={closeAddressModal} disabled={isSavingAddress}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={isSavingAddress}>
              Lưu và tiếp tục thanh toán
            </Button>
          </Space>
        </Form>
      </Modal>
    </main>
  );
};
