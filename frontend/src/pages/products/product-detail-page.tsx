import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  HeartFilled,
  HeartOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  SwapOutlined,
  ToolOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
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
import '../../styles/product-detail.css';

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
  const location = useLocation();
  const cartMutationPending = useRef(false);
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
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
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
        setSelectedVariantId(firstVariant?.id ?? '');
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
    () => product?.variants.find((variant) => variant.id === selectedVariantId),
    [product, selectedVariantId],
  );
  const maxQuantity = product?.catalogOnly ? 0 : Math.min(99, selectedVariant?.stock ?? 0);
  const isQuantityValid = Number.isInteger(quantity) && quantity >= 1 && quantity <= maxQuantity;
  const isCartMutationPending = isAddingToCart || isBuyingNow;

  const selectColor = (color: string): void => {
    if (!product) {
      return;
    }

    const nextVariant = getFirstAvailableVariant(
      product.variants.filter((variant) => variant.color === color),
    );
    setSelectedColor(color);
    setSelectedSize(nextVariant?.size ?? '');
    setSelectedVariantId(nextVariant?.id ?? '');
    setQuantity(1);

    if (nextVariant?.imageUrl) {
      setActiveImage(nextVariant.imageUrl);
    }
  };

  const selectSize = (variant: ProductVariant): void => {
    setSelectedVariantId(variant.id);
    setSelectedColor(variant.color);
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
    navigate('/login', {
      state: { from: `${location.pathname}${location.search}${location.hash}` },
    });
    return false;
  };

  const addToCart = async (): Promise<void> => {
    if (cartMutationPending.current || product?.catalogOnly || !isQuantityValid) return;
    if (!requireAuthentication() || !product || !selectedVariant) {
      return;
    }

    cartMutationPending.current = true;
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
      cartMutationPending.current = false;
      setIsAddingToCart(false);
    }
  };

  const buyNow = async (): Promise<void> => {
    if (cartMutationPending.current || product?.catalogOnly || !isQuantityValid) return;
    if (!requireAuthentication() || !product || !selectedVariant) {
      return;
    }

    cartMutationPending.current = true;
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
      cartMutationPending.current = false;
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
  const quickSpecifications = [
    { label: 'Khung xe', value: product.frameMaterial },
    { label: 'Cỡ bánh', value: product.wheelSize },
    { label: 'Trọng lượng', value: product.weight },
  ].filter((specification) => specification.value);

  return (
    <main className="product-detail-page page-container">
      <nav className="product-detail-breadcrumb" aria-label="Điều hướng sản phẩm">
        <Link to="/products"><ArrowLeftOutlined /> Tất cả sản phẩm</Link>
        <RightOutlined aria-hidden />
        <span>{product.category.name ?? 'Sản phẩm'}</span>
      </nav>

      <Row gutter={[{ xs: 16, sm: 32 }, 24]} className="product-detail-main">
        <Col xs={24} lg={13}>
          <div className="product-detail-gallery">
            <div className="product-gallery-stage">
              <div className="product-gallery-labels">
                {product.brand.name ? <span>{product.brand.name}</span> : null}
                {product.bikeType ? <span>{bikeTypeLabels[product.bikeType]}</span> : null}
              </div>
              <Image
                src={activeImage || product.thumbnail}
                alt={product.name}
                className="product-detail-main-image"
                fallback="/images/product-placeholder.svg"
                preview
              />
              <span className="product-gallery-hint">Chạm vào ảnh để xem chi tiết</span>
            </div>
            <div className="product-thumbnail-list" aria-label="Album ảnh sản phẩm">
              {galleryImages.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  className={`product-thumbnail-button ${
                    activeImage === image.url ? 'is-active' : ''
                  }`}
                  aria-label={`Xem ảnh ${index + 1} của ${product.name}`}
                  aria-pressed={activeImage === image.url}
                  onClick={() => setActiveImage(image.url)}
                >
                  <img
                    src={image.url}
                    alt={image.alt ?? product.name}
                    loading="lazy"
                    onError={(event) => {
                      if (!event.currentTarget.src.endsWith('/images/product-placeholder.svg')) {
                        event.currentTarget.src = '/images/product-placeholder.svg';
                      }
                    }}
                  />
                </button>
              ))}
            </div>
            {quickSpecifications.length ? (
              <dl className="product-quick-specs">
                {quickSpecifications.map((specification) => (
                  <div key={specification.label}>
                    <dt>{specification.label}</dt>
                    <dd>{specification.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </Col>

        <Col xs={24} lg={11}>
          <section className="product-purchase-panel" aria-label="Chọn và mua sản phẩm">
            <div className="product-detail-meta">
              <span className="product-detail-category">{product.category.name ?? 'Sản phẩm'}</span>
              <span className="product-detail-sku">Mã: {product.sku}</span>
            </div>
            <Typography.Title level={1} className="product-detail-title">
              {product.name}
            </Typography.Title>
            <a href="#product-reviews" className="product-rating-link">
              <Rate disabled allowHalf value={product.averageRating} />
              <span>
                {product.reviewCount > 0
                  ? `${product.averageRating.toFixed(1)} (${product.reviewCount} đánh giá)`
                  : 'Chưa có đánh giá'}
              </span>
            </a>
            <div className="product-detail-price-box">
              <span className="product-detail-price-label">{product.catalogOnly ? 'Giá tham khảo' : 'Giá sản phẩm'}</span>
              <Space align="baseline" wrap>
                <Typography.Title level={2} className="product-detail-price">
                  {formatCurrency(displayPrice)}
                </Typography.Title>
                {!product.catalogOnly && product.isOnSale ? (
                  <>
                    <Typography.Text delete type="secondary">
                      {formatCurrency(product.originalPrice)}
                    </Typography.Text>
                    <Tag className="product-detail-discount">Giảm {product.discountPercent}%</Tag>
                  </>
                ) : null}
              </Space>
            </div>
            <Typography.Paragraph className="product-detail-intro">
              {product.shortDescription}
            </Typography.Paragraph>

            {product.catalogOnly ? (
              <div className="variant-picker">
                <Alert
                  type="info"
                  showIcon
                  message="Sản phẩm đang trưng bày"
                  description="Giá mang tính tham khảo. Vui lòng liên hệ để xác nhận giá và tình trạng hàng trước khi mua."
                />
                {product.variants.length ? (
                  <Form.Item label="Phiên bản tham khảo" style={{ marginTop: 16, marginBottom: 0 }}>
                    <Select
                      aria-label="Phiên bản tham khảo"
                      className="full-width"
                      value={selectedVariantId || undefined}
                      onChange={(id) => {
                        const variant = product.variants.find((item) => item.id === id);
                        if (variant) selectSize(variant);
                      }}
                      options={product.variants.map((variant, index) => ({
                        value: variant.id,
                        label: `${index + 1}. ${variant.color || 'Màu chưa cập nhật'} / ${variant.size || 'Cỡ chưa cập nhật'} · ${formatCurrency(variant.price)}`,
                      }))}
                    />
                  </Form.Item>
                ) : null}
              </div>
            ) : <>
            <div className="variant-picker">
              <Typography.Text strong>Màu sắc <span>{selectedColor}</span></Typography.Text>
              <Space wrap>
                {colorOptions.map((variant) => (
                  <Button
                    key={variant.color}
                    type={selectedColor === variant.color ? 'primary' : 'default'}
                    aria-pressed={selectedColor === variant.color}
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
              <div className="product-size-heading">
                <Typography.Text strong>Kích cỡ <span>{selectedSize}</span></Typography.Text>
                {product.productType === ProductType.BICYCLE ? (
                  <Link to="/size-guide">Hướng dẫn chọn size <RightOutlined /></Link>
                ) : null}
              </div>
              <Space wrap>
                {sizesForColor.map((variant) => (
                  <Button
                    key={variant.id}
                    type={selectedVariantId === variant.id ? 'primary' : 'default'}
                    aria-pressed={selectedVariantId === variant.id}
                    disabled={variant.stock <= 0}
                    onClick={() => selectSize(variant)}
                  >
                    {variant.size}
                  </Button>
                ))}
              </Space>
              <Typography.Text className={`product-variant-stock ${variantOutOfStock ? 'is-unavailable' : ''}`}>
                {variantOutOfStock ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
                {selectedVariant
                  ? variantOutOfStock
                    ? `Biến thể ${selectedVariant.color} / ${selectedVariant.size} đã hết hàng`
                    : `Còn ${selectedVariant.stock} sản phẩm cho lựa chọn của bạn`
                  : 'Vui lòng chọn màu và kích cỡ'}
              </Typography.Text>
            </div>
            </>}

            {!product.catalogOnly ? <>
            <div className="product-purchase-quantity">
              <label htmlFor="product-quantity">Số lượng</label>
              <InputNumber
                id="product-quantity"
                min={1}
                max={Math.max(1, maxQuantity)}
                precision={0}
                value={quantity}
                disabled={variantOutOfStock || isCartMutationPending}
                onChange={(value) => setQuantity(value ?? 1)}
                aria-label="Số lượng sản phẩm"
              />
              <div className="product-purchase-total">
                <span>Tạm tính</span>
                <strong>{formatCurrency(displayPrice * quantity)}</strong>
              </div>
            </div>
            <div className="product-purchase-actions">
              <Button
                size="large"
                className="product-add-cart-button"
                icon={<ShoppingCartOutlined />}
                loading={isAddingToCart}
                disabled={!isQuantityValid || isCartMutationPending}
                onClick={() => void addToCart()}
              >
                Thêm vào giỏ
              </Button>
              <Button
                type="primary"
                size="large"
                className="product-buy-now-button"
                icon={<CreditCardOutlined />}
                loading={isBuyingNow}
                disabled={!isQuantityValid || isCartMutationPending}
                onClick={() => void buyNow()}
              >
                Mua ngay
              </Button>
            </div>
            </> : (
              <Link to="/pages/contact">
                <Button type="primary" size="large" block>Liên hệ tư vấn</Button>
              </Link>
            )}
            <div className="product-purchase-secondary">
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
            </div>
            <p className="product-purchase-note">
              {product.catalogOnly
                ? 'Tồn kho đang chờ xác nhận. Bạn vẫn có thể lưu yêu thích và xem thông tin sản phẩm.'
                : 'Phí giao hàng và ưu đãi được cập nhật ở bước thanh toán.'}
            </p>
          </section>
        </Col>
      </Row>

      <div className="product-detail-support">
        <Link to="/size-guide">
          <CheckCircleOutlined />
          <span><strong>Chọn xe vừa vặn</strong>Tham khảo hướng dẫn chọn size</span>
          <RightOutlined />
        </Link>
        <Link to="/pages/warranty-policy">
          <SafetyCertificateOutlined />
          <span><strong>An tâm sau mua</strong>Tìm hiểu chính sách bảo hành</span>
          <RightOutlined />
        </Link>
        <Link to="/service-booking">
          <ToolOutlined />
          <span><strong>Chăm sóc chiếc xe của bạn</strong>Đặt lịch dịch vụ cùng XeDap22h</span>
          <RightOutlined />
        </Link>
      </div>

      <Row gutter={[{ xs: 16, sm: 32 }, 24]} className="product-detail-content">
        <Col xs={24} lg={14}>
          <span className="product-section-eyebrow">Khám phá sản phẩm</span>
          <Typography.Title level={3}>Mô tả sản phẩm</Typography.Title>
          <Typography.Paragraph className="product-description">
            {product.description}
          </Typography.Paragraph>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Thông số kỹ thuật" className="product-specifications-card">
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

      <section className="product-order-information">
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title={<><TruckOutlined /> Giao hàng & nhận xe</>}>
              <Typography.Paragraph>
                Chọn địa chỉ và phương thức giao hàng ở bước thanh toán. Bạn có thể kiểm tra phí giao hàng, sản phẩm và số lượng trước khi xác nhận đơn.
              </Typography.Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title={<><CreditCardOutlined /> Thanh toán & hỗ trợ</>}>
              <Typography.Paragraph>
                Chọn phương thức thanh toán được hỗ trợ khi đặt hàng. Xem điều kiện bảo hành, đổi trả hoặc đặt lịch dịch vụ để được hỗ trợ sau mua.
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

      <section id="product-reviews" className="product-reviews-section">
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
                Thêm lựa chọn cùng danh mục dành cho bạn.
              </Typography.Text>
            </div>
          </div>
          <ProductGrid products={relatedProducts} />
        </section>
      ) : null}
    </main>
  );
};
