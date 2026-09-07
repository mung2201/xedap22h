import {
  EnvironmentOutlined,
  MailOutlined,
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
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addressService } from '../../api/services/address.service';
import { cartService } from '../../api/services/cart.service';
import { checkoutService } from '../../api/services/checkout.service';
import { orderService } from '../../api/services/order.service';
import { useAuthStore } from '../../stores/auth.store';
import { useCommerceStore } from '../../stores/commerce.store';
import type { Address, AddressPayload } from '../../types/address';
import type { Cart } from '../../types/commerce';
import {
  PaymentMethod,
  ShippingMethod,
} from '../../types/order';
import type { CheckoutPreview } from '../../types/order';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

const emptyCart: Cart = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  hasUnavailableItems: false,
};

interface CheckoutContactFormValues {
  customerEmail: string;
}

const normalizeAddressPayload = (values: AddressPayload): AddressPayload => ({
  ...values,
  recipientName: values.recipientName.trim(),
  phone: values.phone.trim(),
  province: values.province.trim(),
  district: values.district.trim(),
  ward: values.ward.trim(),
  addressLine: values.addressLine.trim(),
  note: values.note?.trim() || undefined,
});

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const setCartCount = useCommerceStore((state) => state.setCart);
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>();
  const [shippingMethod, setShippingMethod] = useState(ShippingMethod.STANDARD);
  const [paymentMethod, setPaymentMethod] = useState(PaymentMethod.COD);
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
  const [addressForm] = Form.useForm<AddressPayload>();
  const [contactForm] = Form.useForm<CheckoutContactFormValues>();

  useEffect(() => {
    if (currentUser?.email) {
      contactForm.setFieldValue('customerEmail', currentUser.email);
    }
  }, [contactForm, currentUser?.email]);

  const loadPreview = async (
    addressId: string,
    voucherCode: string | undefined,
    method: ShippingMethod,
  ): Promise<void> => {
    setIsPreviewLoading(true);
    setErrorMessage(null);

    try {
      setPreview(
        await checkoutService.preview({
          addressId,
          ...(voucherCode ? { voucherCode } : {}),
          shippingMethod: method,
        }),
      );
    } catch (error) {
      setPreview(null);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [nextCart, nextAddresses] = await Promise.all([
          cartService.getMine(),
          addressService.getAll(),
        ]);
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
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadInitialData();
  }, [setCartCount]);

  const selectAddress = (addressId: string): void => {
    setSelectedAddressId(addressId);
    void loadPreview(addressId, appliedVoucherCode, shippingMethod);
  };

  const selectShippingMethod = (method: ShippingMethod): void => {
    setShippingMethod(method);

    if (selectedAddressId) {
      void loadPreview(selectedAddressId, appliedVoucherCode, method);
    }
  };

  const applyVoucher = (): void => {
    if (!selectedAddressId) {
      message.warning('Vui lòng chọn địa chỉ giao hàng trước.');
      return;
    }

    const code = voucherInput.trim().toUpperCase();
    setAppliedVoucherCode(code || undefined);
    void loadPreview(selectedAddressId, code || undefined, shippingMethod);
  };

  const removeVoucher = (): void => {
    setVoucherInput('');
    setAppliedVoucherCode(undefined);

    if (selectedAddressId) {
      void loadPreview(selectedAddressId, undefined, shippingMethod);
    }
  };

  const openAddressModal = (): void => {
    addressForm.resetFields();
    addressForm.setFieldsValue({ isDefault: addresses.length === 0 });
    setIsAddressModalOpen(true);
  };

  const closeAddressModal = (): void => {
    if (isSavingAddress) {
      return;
    }

    setIsAddressModalOpen(false);
    addressForm.resetFields();
  };

  const saveCheckoutAddress = async (values: AddressPayload): Promise<void> => {
    setIsSavingAddress(true);

    try {
      const createdAddress = await addressService.create(normalizeAddressPayload(values));
      const nextAddresses = await addressService.getAll();

      setAddresses(nextAddresses);
      setSelectedAddressId(createdAddress.id);
      setIsAddressModalOpen(false);
      addressForm.resetFields();
      message.success('Đã lưu địa chỉ và chọn làm địa chỉ giao hàng.');
      await loadPreview(createdAddress.id, appliedVoucherCode, shippingMethod);
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSavingAddress(false);
    }
  };

  const createOrder = async (): Promise<void> => {
    if (!selectedAddressId) {
      message.warning('Vui lòng thêm hoặc chọn địa chỉ giao hàng.');
      openAddressModal();
      return;
    }

    let contactValues: CheckoutContactFormValues;
    try {
      contactValues = await contactForm.validateFields();
    } catch {
      return;
    }

    setIsCreating(true);

    try {
      const order = await orderService.create({
        addressId: selectedAddressId,
        ...(appliedVoucherCode ? { voucherCode: appliedVoucherCode } : {}),
        shippingMethod,
        paymentMethod,
        customerEmail: contactValues.customerEmail.trim().toLowerCase(),
        ...(orderNote.trim() ? { note: orderNote.trim() } : {}),
      });
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
      message.error(getErrorMessage(error));
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsCreating(false);
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
            Đơn hàng sẽ được xác minh lại về giá, voucher và tồn kho trước khi tạo.
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
                          {address.addressLine}, {address.ward}, {address.district}, {address.province}
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
              onClick={openAddressModal}
            >
              Thêm địa chỉ mới
            </Button>
          </Card>

          <Card title={<><TruckOutlined /> Phương thức vận chuyển</>}>
            <Radio.Group
              value={shippingMethod}
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

          <Card title={<><MailOutlined /> Email nhận thông tin đơn hàng</>}>
            <Form<CheckoutContactFormValues>
              form={contactForm}
              layout="vertical"
              requiredMark={false}
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
            </Form>
            <Typography.Text type="secondary">
              Chúng tôi sẽ gửi xác nhận đặt hàng và thanh toán đến email này. Email được lưu theo đơn, không thay đổi email đăng nhập của bạn.
            </Typography.Text>
          </Card>

          <Card title="Voucher">
            <Space.Compact className="checkout-voucher-input">
              <Input
                value={voucherInput}
                placeholder="Nhập mã giảm giá"
                maxLength={64}
                onChange={(event) => setVoucherInput(event.target.value)}
                onPressEnter={applyVoucher}
              />
              <Button loading={isPreviewLoading} onClick={applyVoucher}>
                Áp dụng
              </Button>
            </Space.Compact>
            {preview?.voucher ? (
              <Space className="checkout-applied-voucher" wrap>
                <Tag color="green">{preview.voucher.code}</Tag>
                <Typography.Text type="secondary">{preview.voucher.name}</Typography.Text>
                <Button type="link" size="small" onClick={removeVoucher}>
                  Bỏ mã
                </Button>
              </Space>
            ) : null}
          </Card>

          <Card title="Phương thức thanh toán">
            <Radio.Group
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            >
              <Space direction="vertical">
                <Radio value={PaymentMethod.COD}>Thanh toán khi nhận hàng (COD)</Radio>
                <Radio value={PaymentMethod.ONLINE}>
                  Thanh toán QR / chuyển khoản ngân hàng
                </Radio>
              </Space>
            </Radio.Group>
            <Typography.Paragraph type="secondary" className="checkout-payment-note">
              {paymentMethod === PaymentMethod.COD
                ? 'Đơn hàng COD được tạo ở trạng thái chưa thanh toán.'
                : 'Bạn sẽ được chuyển đến trang QR để kiểm tra thông tin và thanh toán an toàn.'}
            </Typography.Paragraph>
          </Card>

          <Card title="Ghi chú đơn hàng">
            <Input.TextArea
              rows={3}
              value={orderNote}
              maxLength={500}
              placeholder="Ví dụ: gọi trước khi giao hàng"
              onChange={(event) => setOrderNote(event.target.value)}
            />
          </Card>
        </Space>

        <Card title="Đơn hàng của bạn" className="checkout-summary-card">
          {isPreviewLoading ? <Spin /> : null}
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
      >
        <Typography.Paragraph type="secondary">
          Địa chỉ này sẽ được lưu vào sổ địa chỉ của tài khoản và chọn ngay cho đơn hàng hiện tại.
        </Typography.Paragraph>
        <Form<AddressPayload>
          form={addressForm}
          layout="vertical"
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
            rules={[{ required: true, message: 'Nhập số điện thoại.' }]}
          >
            <Input placeholder="0901234567" autoComplete="tel" />
          </Form.Item>
          <Form.Item
            label="Tỉnh / Thành phố"
            name="province"
            rules={[{ required: true, message: 'Nhập tỉnh hoặc thành phố.' }]}
          >
            <Input autoComplete="address-level1" />
          </Form.Item>
          <Form.Item
            label="Quận / Huyện"
            name="district"
            rules={[{ required: true, message: 'Nhập quận hoặc huyện.' }]}
          >
            <Input autoComplete="address-level2" />
          </Form.Item>
          <Form.Item
            label="Phường / Xã"
            name="ward"
            rules={[{ required: true, message: 'Nhập phường hoặc xã.' }]}
          >
            <Input />
          </Form.Item>
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
