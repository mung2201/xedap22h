import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CreditCardOutlined,
  HeartFilled,
  HeartOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  SwapOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  List,
  Modal,
  Pagination,
  Rate,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cartService } from '../../api/services/cart.service';
import { productService } from '../../api/services/product.service';
import { reviewService } from '../../api/services/review.service';
import { wishlistService } from '../../api/services/wishlist.service';
import { ProductGrid } from '../../components/products/product-grid';
import { ProductQuestionsSection } from '../../components/products/product-questions-section';
import { useAuthStore } from '../../stores/auth.store';
import { useCommerceStore } from '../../stores/commerce.store';
import { useCompareStore } from '../../stores/compare.store';
import { UserRole } from '../../types/auth';
import type { Product, ProductImage, ProductVariant } from '../../types/catalog';
import { ProductType, bikeTypeLabels } from '../../types/catalog';
import type {
  EligibleReviewOrder,
  ProductReviewListResult,
} from '../../types/review';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';
import { rememberRecentlyViewedProduct } from '../../utils/recently-viewed-products';

const getFirstAvailableVariant = (
  variants: ProductVariant[],
): ProductVariant | undefined =>
  variants.find((variant) => variant.stock > 0) ?? variants[0];

interface ReviewFormValues {
  orderId: string;
  rating: number;
  comment?: string;
}

const formatReviewDate = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
  }).format(new Date(value));

export const ProductDetailPage = () => {
  const { slug = '' } = useParams();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const setCart = useCommerceStore((state) => state.setCart);
  const setWishlist = useCommerceStore((state) => state.setWishlist);
  const addToCompare = useCompareStore((state) => state.add);
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [reviewResult, setReviewResult] = useState<ProductReviewListResult | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [reviewErrorMessage, setReviewErrorMessage] = useState<string | null>(null);
  const [eligibleReviewOrders, setEligibleReviewOrders] = useState<EligibleReviewOrder[]>([]);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewForm] = Form.useForm<ReviewFormValues>();
  const productId = product?.id;
  const userId = user?.id;
  const isCustomer = user?.role === UserRole.CUSTOMER;

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);
      setRelatedProducts([]);

      try {
        const loadedProduct = await productService.getBySlug(slug);

        if (!isMounted) {
          return;
        }

        rememberRecentlyViewedProduct(loadedProduct);

        const firstVariant = getFirstAvailableVariant(loadedProduct.variants);
        setProduct(loadedProduct);
        setActiveImage(firstVariant?.imageUrl ?? loadedProduct.thumbnail);
        setSelectedColor(firstVariant?.color ?? '');
        setSelectedSize(firstVariant?.size ?? '');
        setQuantity(1);
        setReviewPage(1);
        setReviewResult(null);
        setReviewErrorMessage(null);
        setEligibleReviewOrders([]);
        setIsReviewModalOpen(false);
        reviewForm.resetFields();

        void productService
          .getRelated(slug)
          .then((related) => {
            if (isMounted) {
              setRelatedProducts(related);
            }
          })
          .catch(() => {
            // Product detail remains usable when related products cannot load.
          });
      } catch (error) {
        if (isMounted) {
          setProduct(null);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      isMounted = false;
    };
  }, [slug, reviewForm]);

  useEffect(() => {
    let isMounted = true;

    if (!userId || !productId) {
      setIsWishlisted(false);
      return () => {
        isMounted = false;
      };
    }

    void wishlistService
      .getStatus(productId)
      .then((status) => {
        if (isMounted) {
          setIsWishlisted(status);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsWishlisted(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [productId, userId]);

  useEffect(() => {
    let isMounted = true;

    if (!productId) {
      setReviewResult(null);
      return () => {
        isMounted = false;
      };
    }

    setIsReviewsLoading(true);
    setReviewErrorMessage(null);

    void reviewService
      .getByProduct(productId, { page: reviewPage, limit: 5 })
      .then((nextReviews) => {
        if (isMounted) {
          setReviewResult(nextReviews);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setReviewResult(null);
          setReviewErrorMessage(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsReviewsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [productId, reviewPage]);

  useEffect(() => {
    let isMounted = true;

    if (!productId || !userId || !isCustomer) {
      setEligibleReviewOrders([]);
      return () => {
        isMounted = false;
      };
    }

    void reviewService
      .getEligibility(productId)
      .then((eligibility) => {
        if (isMounted) {
          setEligibleReviewOrders(eligibility.eligibleOrders);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEligibleReviewOrders([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isCustomer, productId, userId]);

  const galleryImages = useMemo<ProductImage[]>(() => {
    if (!product) {
      return [];
    }

    const images = [
      { url: product.thumbnail, alt: product.name, sortOrder: -1 },
      ...product.images,
    ];

    return Array.from(new Map(images.map((image) => [image.url, image])).values()).sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
  }, [product]);

  const colorOptions = useMemo<ProductVariant[]>(() => {
    const variants = product?.variants ?? [];
    return Array.from(
      new Map(variants.map((variant) => [variant.color, variant])).values(),
    );
  }, [product]);

  const sizesForColor = useMemo(
    () =>
      (product?.variants ?? []).filter((variant) => variant.color === selectedColor),
    [product, selectedColor],
  );

  const selectedVariant = useMemo<ProductVariant | undefined>(
    () =>
      product?.variants.find(
        (variant) =>
          variant.color === selectedColor && variant.size === selectedSize,
      ),
    [product, selectedColor, selectedSize],
  );

  const selectColor = (color: string): void => {
    if (!product) {
      return;
    }

    const nextVariant = getFirstAvailableVariant(
      product.variants.filter((variant) => variant.color === color),
    );
    setSelectedColor(color);
    setSelectedSize(nextVariant?.size ?? '');
    setQuantity(1);

    if (nextVariant?.imageUrl) {
      setActiveImage(nextVariant.imageUrl);
    }
  };

  const selectSize = (variant: ProductVariant): void => {
    setSelectedSize(variant.size);
    setQuantity(1);

    if (variant.imageUrl) {
      setActiveImage(variant.imageUrl);
    }
  };

  const requireAuthentication = (): boolean => {
    if (user) {
      return true;
    }

    message.info('Vui lòng đăng nhập để tiếp tục.');
    navigate('/login');
    return false;
  };

  const addToCart = async (): Promise<void> => {
    if (!requireAuthentication() || !product || !selectedVariant) {
      return;
    }

    setIsAddingToCart(true);

    try {
      const cart = await cartService.addItem({
        productId: product.id,
        variantId: selectedVariant.id,
        quantity,
      });
      setCart(cart);
      message.success('Đã thêm sản phẩm vào giỏ hàng.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsAddingToCart(false);
    }
  };

  const buyNow = async (): Promise<void> => {
    if (!requireAuthentication() || !product || !selectedVariant) {
      return;
    }

    setIsBuyingNow(true);

    try {
      const cart = await cartService.addItem({
        productId: product.id,
        variantId: selectedVariant.id,
        quantity,
      });
      setCart(cart);
      message.success('Đã cập nhật giỏ hàng. Chuyển đến bước thanh toán.');
      navigate('/checkout');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsBuyingNow(false);
    }
  };

  const toggleWishlist = async (): Promise<void> => {
    if (!requireAuthentication() || !product) {
      return;
    }

    setIsWishlistLoading(true);

    try {
      const wishlist = isWishlisted
        ? await wishlistService.remove(product.id)
        : await wishlistService.add(product.id);
      setWishlist(wishlist);
      setIsWishlisted(!isWishlisted);
      message.success(
        isWishlisted
          ? 'Đã xoá sản phẩm khỏi danh sách yêu thích.'
          : 'Đã thêm sản phẩm vào danh sách yêu thích.',
      );
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const addComparison = (): void => {
    if (!product) {
      return;
    }

    const result = addToCompare(product);
    const messages = {
      added: 'Đã thêm xe vào danh sách so sánh.',
      'already-added': 'Xe này đã có trong danh sách so sánh.',
      'limit-reached': 'Bạn chỉ có thể so sánh tối đa 3 xe.',
      unsupported: 'Chức năng so sánh hiện dành cho xe đạp.',
    } as const;
    if (result === 'added') {
      message.success(messages[result]);
      return;
    }

    message.info(messages[result]);
  };

  const openReviewModal = (): void => {
    if (!requireAuthentication()) {
      return;
    }

    const firstEligibleOrder = eligibleReviewOrders[0];
    if (!firstEligibleOrder) {
      message.info('Bạn chỉ có thể đánh giá sau khi đơn chứa sản phẩm đã được giao thành công.');
      return;
    }

    reviewForm.setFieldsValue({
      orderId: firstEligibleOrder.orderId,
      rating: 5,
      comment: undefined,
    });
    setIsReviewModalOpen(true);
  };

  const submitReview = async (values: ReviewFormValues): Promise<void> => {
    if (!product) {
      return;
    }

    setIsSubmittingReview(true);

    try {
      const created = await reviewService.create({
        productId: product.id,
        orderId: values.orderId,
        rating: values.rating,
        ...(values.comment?.trim() ? { comment: values.comment.trim() } : {}),
      });
      setProduct((current) =>
        current
          ? {
              ...current,
              averageRating: created.productRating.averageRating,
              reviewCount: created.productRating.reviewCount,
            }
          : current,
      );
      setEligibleReviewOrders((current) =>
        current.filter((order) => order.orderId !== values.orderId),
      );
      setReviewErrorMessage(null);

      if (reviewPage === 1) {
        setReviewResult((current) => {
          if (!current) {
            return current;
          }

          const limit = current.meta.limit ?? 5;
          const total = (current.meta.total ?? current.items.length) + 1;
          return {
            items: [created.review, ...current.items].slice(0, limit),
            meta: {
              ...current.meta,
              page: 1,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          };
        });
      } else {
        setReviewResult(null);
        setReviewPage(1);
      }

      setIsReviewModalOpen(false);
      reviewForm.resetFields();
      message.success('Cảm ơn bạn đã đánh giá sản phẩm.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="catalog-loading product-detail-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <main className="page-container empty-page">
        <Empty description="Sản phẩm không tồn tại hoặc đã ngừng bán">
          <Link to="/products">Quay lại danh sách sản phẩm</Link>
        </Empty>
        {errorMessage ? <Alert type="warning" showIcon message={errorMessage} /> : null}
      </main>
    );
  }

  const displayPrice = selectedVariant?.price ?? product.salePrice;
  const variantOutOfStock = !selectedVariant || selectedVariant.stock <= 0;

  return (
    <main className="product-detail-page page-container">
      <Link to="/products" className="back-link">
        <ArrowLeftOutlined /> Quay lại sản phẩm
      </Link>

      <Row gutter={[40, 32]} className="product-detail-main">
        <Col xs={24} lg={12}>
          <Card className="product-gallery-card">
            <Image
              src={activeImage || product.thumbnail}
              alt={product.name}
              className="product-detail-main-image"
              preview
            />
            <div className="product-thumbnail-list" aria-label="Album ảnh sản phẩm">
              {galleryImages.map((image) => (
                <button
                  key={image.url}
                  type="button"
                  className={`product-thumbnail-button ${
                    activeImage === image.url ? 'is-active' : ''
                  }`}
                  onClick={() => setActiveImage(image.url)}
                >
                  <img src={image.url} alt={image.alt ?? product.name} />
                </button>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Space direction="vertical" size="middle" className="full-width">
            <Space wrap>
              <Tag color="cyan">{product.category.name ?? 'Danh mục'}</Tag>
              {product.bikeType ? <Tag>{bikeTypeLabels[product.bikeType]}</Tag> : null}
              {product.availableStock > 0 ? (
                <Tag color="green">Còn hàng</Tag>
              ) : (
                <Tag color="red">Hết hàng</Tag>
              )}
            </Space>
            <Typography.Title level={1} className="product-detail-title">
              {product.name}
            </Typography.Title>
            <Typography.Text type="secondary">SKU gốc: {product.sku}</Typography.Text>
            <Space wrap>
              <Rate disabled allowHalf value={product.averageRating} />
              <Typography.Text type="secondary">
                {product.reviewCount > 0
                  ? `${product.averageRating.toFixed(1)} (${product.reviewCount} đánh giá)`
                  : 'Chưa có đánh giá'}
              </Typography.Text>
            </Space>
            <Space align="baseline" wrap>
              <Typography.Title level={2} className="product-detail-price">
                {formatCurrency(displayPrice)}
              </Typography.Title>
              {product.isOnSale ? (
                <>
                  <Typography.Text delete type="secondary">
                    {formatCurrency(product.originalPrice)}
                  </Typography.Text>
                  <Tag color="red">Giảm {product.discountPercent}%</Tag>
                </>
              ) : null}
            </Space>
            <Typography.Paragraph>{product.shortDescription}</Typography.Paragraph>

            <div className="product-purchase-summary">
              <Typography.Text type="secondary">
                Tạm tính {quantity} sản phẩm
              </Typography.Text>
              <Typography.Text strong>{formatCurrency(displayPrice * quantity)}</Typography.Text>
              <Typography.Text type="secondary" className="product-purchase-summary-note">
                Giá, tồn kho, voucher và phí giao hàng luôn được hệ thống xác nhận lại ở bước thanh toán.
              </Typography.Text>
            </div>

            <div className="variant-picker">
              <Typography.Text strong>Màu sắc</Typography.Text>
              <Space wrap>
                {colorOptions.map((variant) => (
                  <Button
                    key={variant.color}
                    type={selectedColor === variant.color ? 'primary' : 'default'}
                    onClick={() => selectColor(variant.color)}
                  >
                    {variant.colorHex ? (
                      <span
                        className="color-dot"
                        style={{ backgroundColor: variant.colorHex }}
                      />
                    ) : null}
                    {variant.color}
                  </Button>
                ))}
              </Space>
            </div>

            <div className="variant-picker">
              <Typography.Text strong>Kích cỡ</Typography.Text>
              <Space wrap>
                {sizesForColor.map((variant) => (
                  <Button
                    key={variant.id}
                    type={selectedSize === variant.size ? 'primary' : 'default'}
                    disabled={variant.stock <= 0}
                    onClick={() => selectSize(variant)}
                  >
                    {variant.size}
                  </Button>
                ))}
              </Space>
              <Typography.Text type={variantOutOfStock ? 'danger' : 'secondary'}>
                {selectedVariant
                  ? variantOutOfStock
                    ? `Biến thể ${selectedVariant.color} / ${selectedVariant.size} đã hết hàng`
                    : `Còn ${selectedVariant.stock} sản phẩm · SKU ${selectedVariant.sku}`
                  : 'Vui lòng chọn màu và kích cỡ'}
              </Typography.Text>
            </div>

            <Space wrap>
              <InputNumber
                min={1}
                max={Math.max(1, selectedVariant?.stock ?? 1)}
                precision={0}
                value={quantity}
                disabled={variantOutOfStock}
                onChange={(value) => setQuantity(value ?? 1)}
                aria-label="Số lượng sản phẩm"
              />
              <Button
                type="primary"
                size="large"
                icon={<ShoppingCartOutlined />}
                loading={isAddingToCart}
                disabled={variantOutOfStock}
                onClick={() => void addToCart()}
              >
                Thêm vào giỏ hàng
              </Button>
              <Button
                size="large"
                className="product-buy-now-button"
                icon={<CreditCardOutlined />}
                loading={isBuyingNow}
                disabled={variantOutOfStock}
                onClick={() => void buyNow()}
              >
                Mua ngay
              </Button>
              <Button
                size="large"
                icon={isWishlisted ? <HeartFilled /> : <HeartOutlined />}
                loading={isWishlistLoading}
                onClick={() => void toggleWishlist()}
              >
                {isWishlisted ? 'Đã yêu thích' : 'Yêu thích'}
              </Button>
              {product.productType === ProductType.BICYCLE ? (
                <Button size="large" icon={<SwapOutlined />} onClick={addComparison}>
                  So sánh xe
                </Button>
              ) : null}
            </Space>

            <div className="product-purchase-assurances">
              <div>
                <TruckOutlined />
                <span>
                  <strong>Giao hàng minh bạch</strong>
                  Phí ship và thời gian giao được hiển thị trước khi xác nhận đơn.
                </span>
              </div>
              <div>
                <CreditCardOutlined />
                <span>
                  <strong>Thanh toán linh hoạt</strong>
                  Hỗ trợ COD và thanh toán trực tuyến theo cấu hình checkout.
                </span>
              </div>
              <div>
                <SafetyCertificateOutlined />
                <span>
                  <strong>Hỗ trợ sau mua</strong>
                  Xem chính sách bảo hành hoặc đặt lịch chăm sóc xe khi cần.
                </span>
              </div>
            </div>
          </Space>
        </Col>
      </Row>

      <Divider />
      <Row gutter={[32, 24]}>
        <Col xs={24} lg={14}>
          <Typography.Title level={3}>Mô tả sản phẩm</Typography.Title>
          <Typography.Paragraph className="product-description">
            {product.description}
          </Typography.Paragraph>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Thông số kỹ thuật">
            <Descriptions column={1} size="small">
              {product.frameMaterial ? (
                <Descriptions.Item label="Khung xe">
                  {product.frameMaterial}
                </Descriptions.Item>
              ) : null}
              {product.wheelSize ? (
                <Descriptions.Item label="Cỡ bánh">
                  {product.wheelSize}
                </Descriptions.Item>
              ) : null}
              {product.weight ? (
                <Descriptions.Item label="Trọng lượng">{product.weight}</Descriptions.Item>
              ) : null}
              {product.specifications.map((specification) => (
                <Descriptions.Item
                  key={`${specification.group ?? ''}-${specification.label}`}
                  label={specification.label}
                >
                  {specification.value}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <section className="product-detail-benefit">
        <CheckCircleOutlined /> Tồn kho được xác định theo đúng màu và kích cỡ bạn đã chọn.
      </section>

      <section className="product-order-information">
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title={<><TruckOutlined /> Giao hàng & nhận xe</>}>
              <Typography.Paragraph>
                Sau khi chọn màu, kích cỡ và số lượng, bạn có thể thêm vào giỏ hoặc chọn <strong>Mua ngay</strong> để đi thẳng tới checkout. Tại đó bạn chọn địa chỉ, phương thức giao hàng và kiểm tra lại đơn trước khi đặt.
              </Typography.Paragraph>
              <Typography.Paragraph>
                Với xe đạp, cửa hàng có thể liên hệ để xác nhận size, thời gian giao và nhu cầu lắp ráp trước khi xử lý đơn.
              </Typography.Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title={<><CreditCardOutlined /> Thanh toán an toàn</>}>
              <Typography.Paragraph>
                Hệ thống hỗ trợ COD và thanh toán trực tuyến. Tổng tiền cuối cùng được backend tính từ giá hiện tại, biến thể, voucher và phí giao hàng — không lấy giá từ trình duyệt.
              </Typography.Paragraph>
              <Space wrap>
                <Link to="/pages/warranty-policy">Chính sách bảo hành</Link>
                <Link to="/pages/return-policy">Chính sách đổi trả</Link>
                <Link to="/service-booking">Đặt lịch dịch vụ</Link>
              </Space>
            </Card>
          </Col>
        </Row>
      </section>

      <section className="product-reviews-section">
        <div className="section-heading product-reviews-heading">
          <div>
            <Typography.Title level={2}>Đánh giá từ khách hàng</Typography.Title>
            <Typography.Text type="secondary">
              Chỉ khách đã nhận thành công đơn có sản phẩm này mới có thể đánh giá.
            </Typography.Text>
          </div>
          <Space direction="vertical" align="end" size={4}>
            <Space>
              <Rate disabled allowHalf value={product.averageRating} />
              <Typography.Text strong>
                {product.reviewCount > 0
                  ? `${product.averageRating.toFixed(1)} / 5`
                  : 'Chưa có đánh giá'}
              </Typography.Text>
            </Space>
            {user?.role === UserRole.CUSTOMER && eligibleReviewOrders.length > 0 ? (
              <Button type="primary" icon={<StarOutlined />} onClick={openReviewModal}>
                Đánh giá sản phẩm
              </Button>
            ) : !user ? (
              <Link to="/login">Đăng nhập để đánh giá sau khi mua</Link>
            ) : null}
          </Space>
        </div>

        {reviewErrorMessage ? (
          <Alert className="product-reviews-alert" type="warning" showIcon message={reviewErrorMessage} />
        ) : null}

        {isReviewsLoading ? (
          <div className="product-reviews-loading">
            <Spin />
          </div>
        ) : reviewResult?.items.length ? (
          <>
            <List
              className="product-reviews-list"
              itemLayout="horizontal"
              dataSource={reviewResult.items}
              renderItem={(review) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar src={review.author.avatarUrl}>
                        {review.author.fullName.slice(0, 1).toUpperCase()}
                      </Avatar>
                    }
                    title={
                      <Space wrap>
                        <Typography.Text strong>{review.author.fullName}</Typography.Text>
                        <Rate disabled value={review.rating} />
                      </Space>
                    }
                    description={formatReviewDate(review.createdAt)}
                  />
                  <div className="product-review-content">
                    {review.comment ? <Typography.Paragraph>{review.comment}</Typography.Paragraph> : null}
                    {review.images.length ? (
                      <Space wrap className="product-review-images">
                        {review.images.map((imageUrl) => (
                          <Image
                            key={imageUrl}
                            width={88}
                            height={72}
                            src={imageUrl}
                            preview
                          />
                        ))}
                      </Space>
                    ) : null}
                  </div>
                </List.Item>
              )}
            />
            {(reviewResult.meta.totalPages ?? 1) > 1 ? (
              <Pagination
                className="product-reviews-pagination"
                current={reviewPage}
                pageSize={reviewResult.meta.limit ?? 5}
                total={reviewResult.meta.total}
                showSizeChanger={false}
                onChange={setReviewPage}
              />
            ) : null}
          </>
        ) : (
          <Empty className="product-reviews-empty" description="Chưa có đánh giá cho sản phẩm này." />
        )}
      </section>

      <Modal
        title="Đánh giá sản phẩm"
        open={isReviewModalOpen}
        footer={null}
        destroyOnHidden
        onCancel={() => {
          setIsReviewModalOpen(false);
          reviewForm.resetFields();
        }}
      >
        <Form<ReviewFormValues> form={reviewForm} layout="vertical" onFinish={submitReview}>
          <Form.Item
            name="orderId"
            label="Đơn hàng đã giao"
            rules={[{ required: true, message: 'Chọn đơn hàng đã nhận.' }]}
          >
            <Select
              options={eligibleReviewOrders.map((order) => ({
                value: order.orderId,
                label: `${order.orderCode} · ${formatReviewDate(order.createdAt)} · ${order.items
                  .map((item) => `${item.color}/${item.size}`)
                  .join(', ')}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="rating"
            label="Số sao"
            rules={[{ required: true, message: 'Chọn số sao đánh giá.' }]}
          >
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="Nhận xét (không bắt buộc)">
            <Input.TextArea rows={4} maxLength={2000} showCount />
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={() => setIsReviewModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSubmittingReview}>
                Gửi đánh giá
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <ProductQuestionsSection productId={product.id} />

      {relatedProducts.length > 0 ? (
        <section className="related-products-section">
          <div className="section-heading">
            <div>
              <Typography.Title level={2}>Sản phẩm liên quan</Typography.Title>
              <Typography.Text type="secondary">
                Các sản phẩm cùng danh mục được API gợi ý.
              </Typography.Text>
            </div>
          </div>
          <ProductGrid products={relatedProducts} />
        </section>
      ) : null}
    </main>
  );
};
