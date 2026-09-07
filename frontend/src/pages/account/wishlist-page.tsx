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
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { wishlistService } from '../../api/services/wishlist.service';
import { useCommerceStore } from '../../stores/commerce.store';
import type { ProductVariant } from '../../types/catalog';
import type { Wishlist } from '../../types/commerce';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

const getFirstAvailableVariant = (
  variants: ProductVariant[],
): ProductVariant | undefined => variants.find((variant) => variant.stock > 0);

export const WishlistPage = () => {
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const setCart = useCommerceStore((state) => state.setCart);
  const setWishlistCount = useCommerceStore((state) => state.setWishlist);

  const applyWishlist = useCallback((nextWishlist: Wishlist): void => {
    setWishlist(nextWishlist);
    setWishlistCount(nextWishlist);
  }, [setWishlistCount]);

  useEffect(() => {
    const loadWishlist = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextWishlist = await wishlistService.getMine();
        applyWishlist(nextWishlist);
        setSelectedVariantIds(
          Object.fromEntries(
            nextWishlist.items.flatMap(({ product }) => {
              const firstVariant = getFirstAvailableVariant(product.variants);
              return firstVariant ? [[product.id, firstVariant.id]] : [];
            }),
          ),
        );
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadWishlist();
  }, [applyWishlist]);

  const removeItem = async (productId: string): Promise<void> => {
    setBusyProductId(productId);

    try {
      applyWishlist(await wishlistService.remove(productId));
      message.success('Đã xoá sản phẩm khỏi danh sách yêu thích.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusyProductId(null);
    }
  };

  const moveToCart = async (
    productId: string,
    selectedVariantId: string | undefined,
  ): Promise<void> => {
    if (!selectedVariantId) {
      message.warning('Sản phẩm này hiện không có biến thể còn hàng.');
      return;
    }

    setBusyProductId(productId);

    try {
      const result = await wishlistService.moveToCart(productId, {
        variantId: selectedVariantId,
        quantity: 1,
      });
      setCart(result.cart);
      applyWishlist(result.wishlist);
      message.success('Đã chuyển sản phẩm sang giỏ hàng.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusyProductId(null);
    }
  };

  if (isLoading) {
    return <Spin size="large" className="account-page-spinner" />;
  }

  if (!wishlist?.items.length) {
    return (
      <Empty description="Danh sách yêu thích đang trống">
        <Link to="/products">
          <Button type="primary">Khám phá sản phẩm</Button>
        </Link>
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
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
      <List
        className="wishlist-list"
        dataSource={wishlist.items}
        renderItem={({ product }) => {
          const inStockVariants = product.variants.filter((variant) => variant.stock > 0);
          const selectedVariantId = selectedVariantIds[product.id];

          return (
            <List.Item
              actions={[
                <Button
                  key="remove"
                  danger
                  type="text"
                  loading={busyProductId === product.id}
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
                      {product.isOnSale ? (
                        <Typography.Text delete type="secondary">
                          {formatCurrency(product.originalPrice)}
                        </Typography.Text>
                      ) : null}
                      {product.availableStock > 0 ? (
                        <Tag color="green">Còn hàng</Tag>
                      ) : (
                        <Tag color="red">Hết hàng</Tag>
                      )}
                    </Space>
                    <Space wrap>
                      <Select
                        className="wishlist-variant-select"
                        value={selectedVariantId}
                        placeholder="Chọn màu / size"
                        disabled={!inStockVariants.length || busyProductId === product.id}
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
                        disabled={!selectedVariantId}
                        loading={busyProductId === product.id}
                        onClick={() => void moveToCart(product.id, selectedVariantId)}
                      >
                        Chuyển vào giỏ
                      </Button>
                    </Space>
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
