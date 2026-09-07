import {
  DeleteOutlined,
  ExclamationCircleOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Empty,
  Image,
  InputNumber,
  List,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartService } from '../../api/services/cart.service';
import { useCommerceStore } from '../../stores/commerce.store';
import type { Cart, CartItem } from '../../types/commerce';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

const emptyCart: Cart = {
  items: [],
  totalItems: 0,
  subtotal: 0,
  hasUnavailableItems: false,
};

export const CartPage = () => {
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const setCartCount = useCommerceStore((state) => state.setCart);

  const loadCart = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextCart = await cartService.getMine();
      setCart(nextCart);
      setCartCount(nextCart);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [setCartCount]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const applyCart = (nextCart: Cart): void => {
    setCart(nextCart);
    setCartCount(nextCart);
  };

  const updateQuantity = async (
    item: CartItem,
    value: number | null,
  ): Promise<void> => {
    if (!value || value === item.quantity || !item.isAvailable) {
      return;
    }

    setBusyItemId(item.id);

    try {
      applyCart(await cartService.updateItem(item.id, { quantity: value }));
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusyItemId(null);
    }
  };

  const removeItem = async (itemId: string): Promise<void> => {
    setBusyItemId(itemId);

    try {
      applyCart(await cartService.removeItem(itemId));
      message.success('Đã xoá sản phẩm khỏi giỏ hàng.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusyItemId(null);
    }
  };

  const clearCart = async (): Promise<void> => {
    setIsClearing(true);

    try {
      applyCart(await cartService.clear());
      message.success('Đã xoá toàn bộ giỏ hàng.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsClearing(false);
    }
  };

  if (isLoading) {
    return (
      <main className="page-container cart-page cart-loading">
        <Spin size="large" />
      </main>
    );
  }

  if (!cart.items.length) {
    return (
      <main className="page-container cart-page">
        {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
        <Empty description="Giỏ hàng của bạn đang trống">
          <Link to="/products">
            <Button type="primary" icon={<ShoppingOutlined />}>
              Khám phá sản phẩm
            </Button>
          </Link>
        </Empty>
      </main>
    );
  }

  return (
    <main className="page-container cart-page">
      <div className="cart-page-heading">
        <div>
          <Typography.Title level={1}>Giỏ hàng</Typography.Title>
          <Typography.Text type="secondary">
            Giá và tồn kho dưới đây được kiểm tra trực tiếp từ hệ thống.
          </Typography.Text>
        </div>
        <Popconfirm
          title="Xoá toàn bộ giỏ hàng?"
          okText="Xoá tất cả"
          cancelText="Giữ lại"
          onConfirm={() => void clearCart()}
        >
          <Button danger loading={isClearing} icon={<DeleteOutlined />}>
            Xoá tất cả
          </Button>
        </Popconfirm>
      </div>

      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
      {cart.hasUnavailableItems ? (
        <Alert
          className="cart-alert"
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message="Một hoặc nhiều biến thể không còn đủ tồn kho. Hãy điều chỉnh hoặc xoá chúng trước khi thanh toán."
        />
      ) : null}

      <div className="cart-layout">
        <Card className="cart-items-card">
          <List
            itemLayout="horizontal"
            dataSource={cart.items}
            renderItem={(item) => (
              <List.Item
                className={!item.isAvailable ? 'cart-item-unavailable' : undefined}
                actions={[
                  <Popconfirm
                    key="remove"
                    title="Xoá sản phẩm này khỏi giỏ hàng?"
                    okText="Xoá"
                    cancelText="Huỷ"
                    onConfirm={() => void removeItem(item.id)}
                  >
                    <Button
                      danger
                      type="text"
                      loading={busyItemId === item.id}
                      icon={<DeleteOutlined />}
                    >
                      Xoá
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Image width={104} height={82} src={item.thumbnail} preview={false} />
                  }
                  title={<Link to={`/products/${item.productSlug}`}>{item.productName}</Link>}
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text type="secondary">
                        {item.color} · {item.size} · SKU {item.sku}
                      </Typography.Text>
                      {!item.isAvailable ? (
                        <Tag color="red">Biến thể không còn đủ tồn kho</Tag>
                      ) : (
                        <Typography.Text type="secondary">
                          Còn {item.stock} sản phẩm
                        </Typography.Text>
                      )}
                      <Typography.Text strong>{formatCurrency(item.unitPrice)}</Typography.Text>
                    </Space>
                  }
                />
                <div className="cart-item-controls">
                  <InputNumber
                    min={1}
                    max={Math.max(1, item.stock)}
                    value={item.quantity}
                    disabled={!item.isAvailable || busyItemId === item.id}
                    onChange={(value) => void updateQuantity(item, value)}
                    aria-label={`Số lượng ${item.productName}`}
                  />
                  <Typography.Text strong className="cart-line-total">
                    {formatCurrency(item.totalPrice)}
                  </Typography.Text>
                </div>
              </List.Item>
            )}
          />
        </Card>

        <Card title="Tóm tắt đơn hàng" className="cart-summary-card">
          <Space direction="vertical" size="middle" className="full-width">
            <div className="cart-summary-row">
              <Typography.Text>Số lượng</Typography.Text>
              <Typography.Text>{cart.totalItems} sản phẩm</Typography.Text>
            </div>
            <div className="cart-summary-row">
              <Typography.Text strong>Tạm tính</Typography.Text>
              <Typography.Title level={3} className="cart-subtotal">
                {formatCurrency(cart.subtotal)}
              </Typography.Title>
            </div>
            <Typography.Text type="secondary">
              Phí vận chuyển và voucher sẽ được tính lại ở bước thanh toán.
            </Typography.Text>
            <Link to="/checkout">
              <Button
                type="primary"
                size="large"
                disabled={cart.hasUnavailableItems}
                block
              >
                Tiến hành thanh toán
              </Button>
            </Link>
            <Link to="/products" className="cart-continue-link">
              Tiếp tục mua sắm
            </Link>
          </Space>
        </Card>
      </div>
    </main>
  );
};
