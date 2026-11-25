import { DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Image,
  List,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { wishlistService } from '../../api/services/wishlist.service';
import { useAuthStore } from '../../stores/auth.store';
import { useCommerceStore } from '../../stores/commerce.store';
import type { ProductVariant } from '../../types/catalog';
import type { Wishlist } from '../../types/commerce';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

const getFirstAvailableVariant = (
  variants: ProductVariant[],
): ProductVariant | undefined => variants.find((variant) => variant.stock > 0);

export const WishlistPage = () => {
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id);
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadController = useRef<AbortController | null>(null);
  const mutationPending = useRef(false);
  const setCart = useCommerceStore((state) => state.setCart);
  const setWishlistCount = useCommerceStore((state) => state.setWishlist);

  const applyWishlist = useCallback((nextWishlist: Wishlist): void => {
    setWishlist(nextWishlist);
    setWishlistCount(nextWishlist);
    setSelectedVariantIds((current) => Object.fromEntries(
      nextWishlist.items.flatMap(({ product }) => {
        if (product.catalogOnly) return [];
        const selectedVariant = product.variants.find((variant) =>
          variant.id === current[product.id] && variant.stock > 0)
          ?? getFirstAvailableVariant(product.variants);
        return selectedVariant ? [[product.id, selectedVariant.id]] : [];
      }),
    ));
  }, [setWishlistCount]);

  useEffect(() => {
    const controller = new AbortController();
    loadController.current = controller;
    mutationPending.current = false;
    setBusyProductId(null);
    const loadWishlist = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);
      setWishlist(null);

      try {
        const nextWishlist = await wishlistService.getMine(controller.signal);
        if (controller.signal.aborted) return;
        applyWishlist(nextWishlist);
      } catch (error) {
        if (!controller.signal.aborted) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadWishlist();
    return () => controller.abort();
  }, [applyWishlist, reloadKey, userId]);

  const removeItem = async (productId: string): Promise<void> => {
    if (mutationPending.current) return;
    const signal = loadController.current?.signal;
    mutationPending.current = true;
    setBusyProductId(productId);

    try {
      const nextWishlist = await wishlistService.remove(productId);
      if (signal?.aborted) return;
      applyWishlist(nextWishlist);
      message.success('Đã xoá sản phẩm khỏi danh sách yêu thích.');
    } catch (error) {
      if (!signal?.aborted) message.error(getErrorMessage(error));
    } finally {
      if (!signal?.aborted) {
        mutationPending.current = false;
        setBusyProductId(null);
      }
    }
  };

  const moveToCart = async (
    productId: string,
    selectedVariantId: string | undefined,
  ): Promise<void> => {
    if (mutationPending.current) return;
    if (wishlist?.items.some(({ product }) => product.id === productId && product.catalogOnly)) {
      message.info('Vui lòng liên hệ tư vấn cho sản phẩm đang trưng bày.');
      return;
    }
    if (!selectedVariantId) {
      message.warning('Sản phẩm này hiện không có biến thể còn hàng.');
      return;
    }

    const signal = loadController.current?.signal;
    mutationPending.current = true;
    setBusyProductId(productId);

    try {
      const result = await wishlistService.moveToCart(productId, {
        variantId: selectedVariantId,
        quantity: 1,
      });
      if (signal?.aborted) return;
      setCart(result.cart);
      applyWishlist(result.wishlist);
      message.success('Đã chuyển sản phẩm sang giỏ hàng.');
    } catch (error) {
      if (!signal?.aborted) message.error(getErrorMessage(error));
    } finally {
      if (!signal?.aborted) {
        mutationPending.current = false;
        setBusyProductId(null);
      }
    }
  };

  if (isLoading) {
    return <Spin size="large" className="account-page-spinner" />;
  }

  if (errorMessage) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không thể tải danh sách yêu thích"
        description={errorMessage}
        action={<Button onClick={() => setReloadKey((value) => value + 1)}>Thử lại</Button>}
      />
    );
  }

  if (!wishlist?.items.length) {
    return (
      <Empty description="Danh sách yêu thích đang trống">
        <Space wrap>
          <Button type="primary" onClick={() => navigate('/products')}>Khám phá sản phẩm</Button>
          <Button icon={<ShoppingCartOutlined aria-hidden />} onClick={() => navigate('/cart')}>
            Xem giỏ hàng
          </Button>
        </Space>
      </Empty>
    );
  }

  return (
    <Space direction="vertical" size="large" className="full-width">
      <div>
        <Typography.Title level={3}>Sản phẩm yêu thích</Typography.Title>
        <Typography.Text type="secondary">
          Chọn biến thể còn hàng để chuyển thẳng vào giỏ hàng.
        </Typography.Text>
      </div>
      <Space wrap>
        <Button
          type="primary"
          icon={<ShoppingCartOutlined aria-hidden />}
          disabled={busyProductId !== null}
          onClick={() => navigate('/cart')}
        >
          Xem giỏ hàng
        </Button>
        <Button disabled={busyProductId !== null} onClick={() => navigate('/products')}>
          Khám phá sản phẩm
        </Button>
      </Space>
      <List
        className="wishlist-list"
        dataSource={wishlist.items}
        renderItem={({ product }) => {
          const inStockVariants = product.catalogOnly
            ? []
            : product.variants.filter((variant) => variant.stock > 0);
          const selectedVariantId = selectedVariantIds[product.id];

          return (
            <List.Item
              actions={[
                <Button
                  key="remove"
                  danger
                  type="text"
                  loading={busyProductId === product.id}
                  disabled={busyProductId !== null}
                  icon={<DeleteOutlined />}
                  onClick={() => void removeItem(product.id)}
                >
                  Xoá
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Image width={100} height={76} src={product.thumbnail} preview={false} />
                }
                title={<Link to={`/products/${product.slug}`}>{product.name}</Link>}
                description={
                  <Space direction="vertical" size={7}>
                    <Space wrap>
                      <Typography.Text strong className="product-sale-price">
                        {formatCurrency(product.salePrice)}
                      </Typography.Text>
                      {product.catalogOnly ? <Typography.Text type="secondary">Giá tham khảo</Typography.Text> : null}
                      {!product.catalogOnly && product.isOnSale ? (
                        <Typography.Text delete type="secondary">
                          {formatCurrency(product.originalPrice)}
                        </Typography.Text>
                      ) : null}
                      {product.catalogOnly ? (
                        <Tag>Liên hệ tư vấn</Tag>
                      ) : product.availableStock > 0 ? (
                        <Tag color="green">Còn hàng</Tag>
                      ) : (
                        <Tag color="red">Hết hàng</Tag>
                      )}
                    </Space>
                    {product.catalogOnly ? (
                      <Link to="/pages/contact"><Button>Liên hệ tư vấn</Button></Link>
                    ) : <Space wrap className="wishlist-purchase-controls">
                      <Select
                        className="wishlist-variant-select"
                        value={selectedVariantId}
                        placeholder="Chọn màu / size"
                        disabled={!inStockVariants.length || busyProductId !== null}
                        onChange={(variantId) =>
                          setSelectedVariantIds((current) => ({
                            ...current,
                            [product.id]: variantId,
                          }))
                        }
                        options={inStockVariants.map((variant) => ({
                          value: variant.id,
                          label: `${variant.color} / ${variant.size} · ${formatCurrency(variant.price)}`,
                        }))}
                      />
                      <Button
                        type="primary"
                        icon={<ShoppingCartOutlined />}
                        disabled={!selectedVariantId || busyProductId !== null}
                        loading={busyProductId === product.id}
                        onClick={() => void moveToCart(product.id, selectedVariantId)}
                      >
                        Chuyển vào giỏ
                      </Button>
                    </Space>}
                  </Space>
                }
              />
            </List.Item>
          );
        }}
      />
    </Space>
  );
};
