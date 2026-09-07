import {
  AutoComplete,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  Pagination,
  Row,
  Select,
  Slider,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { brandService } from '../../api/services/brand.service';
import { categoryService } from '../../api/services/category.service';
import { productService } from '../../api/services/product.service';
import { ProductGrid } from '../../components/products/product-grid';
import type {
  Brand,
  CategoryTreeNode,
  ProductFacets,
  ProductListQuery,
  ProductListResult,
} from '../../types/catalog';
import { BikeType, ProductSort, bikeTypeLabels } from '../../types/catalog';
import { formatCurrency } from '../../utils/currency';
import { getErrorMessage } from '../../utils/error-message';

const flattenCategories = (
  categories: CategoryTreeNode[],
  depth = 0,
): Array<{ value: string; label: string }> =>
  categories.flatMap((category) => [
    { value: category.slug, label: `${'— '.repeat(depth)}${category.name}` },
    ...flattenCategories(category.children, depth + 1),
  ]);

const readNumber = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

export const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categoryOptions, setCategoryOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [facets, setFacets] = useState<ProductFacets | null>(null);
  const [result, setResult] = useState<ProductListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState(searchParams.get('keyword') ?? '');
  const [isKeywordFocused, setIsKeywordFocused] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);

  const query = useMemo<ProductListQuery>(() => {
    const sortValue = searchParams.get('sort');
    const bikeType = searchParams.get('bikeType');

    return {
      page: readNumber(searchParams.get('page')) ?? 1,
      limit: 12,
      keyword: searchParams.get('keyword') ?? undefined,
      category: searchParams.get('category') ?? undefined,
      brand: searchParams.get('brand') ?? undefined,
      color: searchParams.get('color') ?? undefined,
      size: searchParams.get('size') ?? undefined,
      bikeType: Object.values(BikeType).includes(bikeType as BikeType)
        ? (bikeType as BikeType)
        : undefined,
      minPrice: readNumber(searchParams.get('minPrice')),
      maxPrice: readNumber(searchParams.get('maxPrice')),
      onSale: searchParams.get('onSale') === 'true' || undefined,
      inStock: searchParams.get('inStock') === 'true' || undefined,
      featured: searchParams.get('featured') === 'true' || undefined,
      sort: Object.values(ProductSort).includes(sortValue as ProductSort)
        ? (sortValue as ProductSort)
        : ProductSort.NEWEST,
    };
  }, [searchParams]);

  const activeFilters = useMemo(
    () => {
      const filters: Array<{
        key: string;
        label: string;
        clearValues: Record<string, string | number | boolean | undefined>;
      }> = [];
      const categoryLabel = categoryOptions.find(
        (option) => option.value === query.category,
      )?.label;
      const brandLabel = brands.find((brand) => brand.slug === query.brand)?.name;

      if (query.keyword) {
        filters.push({
          key: 'keyword',
          label: `Từ khóa: ${query.keyword}`,
          clearValues: { keyword: undefined },
        });
      }
      if (query.category) {
        filters.push({
          key: 'category',
          label: `Danh mục: ${categoryLabel ?? query.category}`,
          clearValues: { category: undefined },
        });
      }
      if (query.brand) {
        filters.push({
          key: 'brand',
          label: `Thương hiệu: ${brandLabel ?? query.brand}`,
          clearValues: { brand: undefined },
        });
      }
      if (query.bikeType) {
        filters.push({
          key: 'bikeType',
          label: `Loại xe: ${bikeTypeLabels[query.bikeType]}`,
          clearValues: { bikeType: undefined },
        });
      }
      if (query.color) {
        filters.push({
          key: 'color',
          label: `Màu: ${query.color}`,
          clearValues: { color: undefined },
        });
      }
      if (query.size) {
        filters.push({
          key: 'size',
          label: `Size: ${query.size}`,
          clearValues: { size: undefined },
        });
      }
      if (query.minPrice !== undefined || query.maxPrice !== undefined) {
        filters.push({
          key: 'price',
          label: `Giá: ${
            query.minPrice !== undefined ? formatCurrency(query.minPrice) : '0 ₫'
          } – ${
            query.maxPrice !== undefined ? formatCurrency(query.maxPrice) : 'không giới hạn'
          }`,
          clearValues: { minPrice: undefined, maxPrice: undefined },
        });
      }
      if (query.onSale) {
        filters.push({
          key: 'onSale',
          label: 'Đang giảm giá',
          clearValues: { onSale: undefined },
        });
      }
      if (query.inStock) {
        filters.push({
          key: 'inStock',
          label: 'Còn hàng',
          clearValues: { inStock: undefined },
        });
      }
      if (query.featured) {
        filters.push({
          key: 'featured',
          label: 'Sản phẩm nổi bật',
          clearValues: { featured: undefined },
        });
      }

      return filters;
    },
    [brands, categoryOptions, query],
  );

  const updateQuery = (
    values: Record<string, string | number | boolean | undefined>,
    resetPage = true,
  ): void => {
    const next = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === '' || value === false) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    }

    if (resetPage) {
      next.set('page', '1');
    }

    setSearchParams(next);
  };

  const loadProducts = useCallback(async (): Promise<void> => {
    setIsLoading(true);

    try {
      setResult(await productService.getPublicList(query));
    } catch (error) {
      message.error(getErrorMessage(error));
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([
      categoryService.getTree(),
      brandService.getPublicList(),
      productService.getPublicFacets(),
    ])
      .then(([categories, brandList, productFacets]) => {
        if (!isMounted) {
          return;
        }

        setCategoryOptions(flattenCategories(categories));
        setBrands(brandList);
        setFacets(productFacets);
      })
      .catch((error: unknown) => message.error(getErrorMessage(error)));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setKeyword(searchParams.get('keyword') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const availablePriceRange = facets?.priceRange;

    if (!availablePriceRange) {
      setPriceRange(null);
      return;
    }

    const clamp = (value: number): number =>
      Math.min(Math.max(value, availablePriceRange.min), availablePriceRange.max);
    const minPrice = clamp(query.minPrice ?? availablePriceRange.min);
    const maxPrice = clamp(query.maxPrice ?? availablePriceRange.max);

    setPriceRange(minPrice <= maxPrice ? [minPrice, maxPrice] : [minPrice, minPrice]);
  }, [facets?.priceRange, query.maxPrice, query.minPrice]);

  const productNameOptions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('vi-VN');

    return (facets?.suggestions ?? [])
      .filter((suggestion) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [suggestion.name, suggestion.sku].some((value) =>
          value.toLocaleLowerCase('vi-VN').includes(normalizedKeyword),
        );
      })
      .slice(0, 8)
      .map((suggestion) => ({
        value: suggestion.slug,
        label: (
          <div className="catalog-product-suggestion">
            <img src={suggestion.thumbnail} alt="" />
            <div>
              <Typography.Text strong ellipsis>
                {suggestion.name}
              </Typography.Text>
              <Typography.Text type="secondary">SKU: {suggestion.sku}</Typography.Text>
            </div>
            <Typography.Text className="catalog-product-suggestion-price">
              {formatCurrency(suggestion.salePrice)}
            </Typography.Text>
          </div>
        ),
      }));
  }, [facets?.suggestions, keyword]);

  const priceStep = useMemo(() => {
    const availablePriceRange = facets?.priceRange;

    if (!availablePriceRange) {
      return 1;
    }

    const rawStep = Math.max(50_000, (availablePriceRange.max - availablePriceRange.min) / 100);
    return Math.max(50_000, Math.round(rawStep / 50_000) * 50_000);
  }, [facets?.priceRange]);

  const availablePriceRange = facets?.priceRange;

  return (
    <main className="catalog-page page-container">
      <section className="catalog-heading">
        <div>
          <Typography.Title level={1}>Sản phẩm xe đạp & phụ kiện</Typography.Title>
          <Typography.Text type="secondary">
            Lọc theo nhu cầu, thương hiệu, màu sắc, kích cỡ và mức giá phù hợp.
          </Typography.Text>
        </div>
      </section>

      <Card className="catalog-filter-card">
        <Row gutter={[12, 12]}>
          <Col xs={24} lg={8}>
            <AutoComplete
              value={keyword}
              options={productNameOptions}
              open={isKeywordFocused && productNameOptions.length > 0}
              onFocus={() => setIsKeywordFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setIsKeywordFocused(false), 120);
              }}
              onSelect={(slug) => {
                const selectedProduct = facets?.suggestions.find(
                  (suggestion) => suggestion.slug === slug,
                );

                if (selectedProduct) {
                  setKeyword(selectedProduct.name);
                  updateQuery({ keyword: selectedProduct.name });
                }

                setIsKeywordFocused(false);
              }}
            >
            <Input.Search
              value={keyword}
              placeholder="Tìm tên sản phẩm hoặc SKU"
              allowClear
              onChange={(event) => {
                const value = event.target.value;
                setKeyword(value);
                if (!value) {
                  updateQuery({ keyword: undefined });
                }
              }}
              onSearch={(value) => updateQuery({ keyword: value.trim() })}
            />
            </AutoComplete>
          </Col>
          <Col xs={12} md={8} lg={4}>
            <Select
              value={query.category}
              placeholder="Danh mục"
              allowClear
              className="full-width"
              options={categoryOptions}
              onChange={(value) => updateQuery({ category: value })}
            />
          </Col>
          <Col xs={12} md={8} lg={4}>
            <Select
              value={query.brand}
              placeholder="Thương hiệu"
              allowClear
              className="full-width"
              options={brands.map((brand) => ({ value: brand.slug, label: brand.name }))}
              onChange={(value) => updateQuery({ brand: value })}
            />
          </Col>
          <Col xs={12} md={8} lg={4}>
            <Select
              value={query.bikeType}
              placeholder="Loại xe"
              allowClear
              className="full-width"
              options={Object.values(BikeType).map((type) => ({
                value: type,
                label: bikeTypeLabels[type],
              }))}
              onChange={(value) => updateQuery({ bikeType: value })}
            />
          </Col>
          <Col xs={12} md={8} lg={4}>
            <Select
              value={query.sort}
              className="full-width"
              options={[
                { value: ProductSort.NEWEST, label: 'Mới nhất' },
                { value: ProductSort.OLDEST, label: 'Cũ nhất' },
                { value: ProductSort.PRICE_ASC, label: 'Giá thấp đến cao' },
                { value: ProductSort.PRICE_DESC, label: 'Giá cao đến thấp' },
                { value: ProductSort.BEST_SELLING, label: 'Bán chạy' },
                { value: ProductSort.RATING_DESC, label: 'Đánh giá cao' },
              ]}
              onChange={(value) => updateQuery({ sort: value })}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            {availablePriceRange && priceRange ? (
              <div className="catalog-price-filter">
                <div className="catalog-price-filter-heading">
                  <Typography.Text strong>Mức giá</Typography.Text>
                  <Typography.Text type="secondary">
                    {formatCurrency(priceRange[0])} – {formatCurrency(priceRange[1])}
                  </Typography.Text>
                </div>
                <Slider
                  range
                  min={availablePriceRange.min}
                  max={availablePriceRange.max}
                  step={priceStep}
                  value={priceRange}
                  tooltip={{
                    formatter: (value) =>
                      value === undefined ? '' : formatCurrency(value),
                  }}
                  onChange={(value) => {
                    if (Array.isArray(value) && value.length === 2) {
                      setPriceRange([value[0], value[1]]);
                    }
                  }}
                  onChangeComplete={(value) => {
                    if (Array.isArray(value) && value.length === 2) {
                      updateQuery({
                        minPrice:
                          value[0] === availablePriceRange.min ? undefined : value[0],
                        maxPrice:
                          value[1] === availablePriceRange.max ? undefined : value[1],
                      });
                    }
                  }}
                />
              </div>
            ) : (
              <div className="catalog-price-filter catalog-price-filter--loading">
                <Typography.Text type="secondary">Đang tải khoảng giá…</Typography.Text>
              </div>
            )}
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Select
              value={query.color}
              placeholder="Chọn màu sắc"
              allowClear
              loading={!facets}
              className="full-width catalog-facet-select"
              options={(facets?.colors ?? []).map((color) => ({
                value: color.value,
                label: (
                  <span className="catalog-facet-option">
                    <span
                      className="catalog-facet-color-dot"
                      style={{ backgroundColor: color.colorHex ?? '#cbd5e1' }}
                    />
                    <span>{color.value}</span>
                    <small>{color.count}</small>
                  </span>
                ),
              }))}
              onChange={(value) => updateQuery({ color: value })}
            />
          </Col>
          <Col xs={12} md={6} lg={4}>
            <Select
              value={query.size}
              placeholder="Chọn kích cỡ"
              allowClear
              loading={!facets}
              className="full-width catalog-facet-select"
              options={(facets?.sizes ?? []).map((size) => ({
                value: size.value,
                label: (
                  <span className="catalog-facet-option">
                    <span>{size.value}</span>
                    <small>{size.count}</small>
                  </span>
                ),
              }))}
              onChange={(value) => updateQuery({ size: value })}
            />
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Space wrap>
              <Checkbox
                checked={Boolean(query.onSale)}
                onChange={(event) => updateQuery({ onSale: event.target.checked })}
              >
                Đang giảm giá
              </Checkbox>
              <Checkbox
                checked={Boolean(query.inStock)}
                onChange={(event) => updateQuery({ inStock: event.target.checked })}
              >
                Còn hàng
              </Checkbox>
              <Button onClick={() => setSearchParams({})}>Xóa bộ lọc</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {activeFilters.length > 0 && (
        <Space wrap className="catalog-active-filters">
          <Typography.Text type="secondary">Đang lọc:</Typography.Text>
          {activeFilters.map((filter) => (
            <Tag
              key={filter.key}
              closable
              onClose={(event) => {
                event.preventDefault();
                updateQuery(filter.clearValues);
              }}
            >
              {filter.label}
            </Tag>
          ))}
        </Space>
      )}

      <section className="catalog-results" aria-live="polite">
        <div className="catalog-results-heading">
          <Typography.Text type="secondary">
            {result?.meta.total ?? 0} sản phẩm được tìm thấy
          </Typography.Text>
          <Typography.Text type="secondary">
            Sắp xếp: {
              [
                { value: ProductSort.NEWEST, label: 'Mới nhất' },
                { value: ProductSort.OLDEST, label: 'Cũ nhất' },
                { value: ProductSort.PRICE_ASC, label: 'Giá thấp đến cao' },
                { value: ProductSort.PRICE_DESC, label: 'Giá cao đến thấp' },
                { value: ProductSort.BEST_SELLING, label: 'Bán chạy' },
                { value: ProductSort.RATING_DESC, label: 'Đánh giá cao' },
              ].find((option) => option.value === query.sort)?.label
            }
          </Typography.Text>
        </div>
        {isLoading ? (
          <div className="catalog-loading">
            <Spin size="large" />
          </div>
        ) : result?.items.length ? (
          <>
            <ProductGrid products={result.items} />
            <div className="catalog-pagination">
              <Pagination
                current={result.meta.page ?? 1}
                pageSize={result.meta.limit ?? 12}
                total={result.meta.total ?? 0}
                showSizeChanger={false}
                onChange={(page) => updateQuery({ page }, false)}
              />
            </div>
          </>
        ) : (
          <Empty description="Không tìm thấy sản phẩm phù hợp" />
        )}
      </section>
    </main>
  );
};
