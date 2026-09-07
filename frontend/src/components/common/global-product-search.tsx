import { AutoComplete, Empty, Input, Spin, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { productService } from '../../api/services/product.service';
import type { Product } from '../../types/catalog';
import { ProductSort } from '../../types/catalog';
import { formatCurrency } from '../../utils/currency';

const SEARCH_DELAY_MS = 260;
const SEARCH_SUGGESTION_LIMIT = 6;

export const GlobalProductSearch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setKeyword(location.pathname === '/products' ? params.get('keyword') ?? '' : '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    const normalizedKeyword = keyword.trim();

    if (normalizedKeyword.length < 2) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    let isMounted = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingSuggestions(true);

      void productService
        .getPublicList({
          keyword: normalizedKeyword,
          inStock: true,
          limit: SEARCH_SUGGESTION_LIMIT,
          sort: ProductSort.BEST_SELLING,
        })
        .then((result) => {
          if (isMounted) {
            setSuggestions(result.items);
          }
        })
        .catch(() => {
          if (isMounted) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingSuggestions(false);
          }
        });
    }, SEARCH_DELAY_MS);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [keyword]);

  const search = (value: string): void => {
    const normalizedValue = value.trim();
    const params = new URLSearchParams();

    if (normalizedValue) {
      params.set('keyword', normalizedValue);
    }

    setIsFocused(false);
    setSuggestions([]);

    const searchParams = params.toString();
    navigate({
      pathname: '/products',
      search: searchParams ? `?${searchParams}` : '',
    });
  };

  const options = useMemo(
    () =>
      suggestions.map((product) => ({
        value: product.slug,
        label: (
          <div className="global-search-suggestion">
            <img src={product.thumbnail} alt="" />
            <div className="global-search-suggestion-copy">
              <Typography.Text strong ellipsis>
                {product.name}
              </Typography.Text>
              <Typography.Text type="secondary" ellipsis>
                {product.brand.name ?? 'XeDap22h'} · {product.category.name ?? 'Sản phẩm'}
              </Typography.Text>
            </div>
            <Typography.Text className="global-search-suggestion-price">
              {formatCurrency(product.salePrice)}
            </Typography.Text>
          </div>
        ),
      })),
    [suggestions],
  );

  const canShowSuggestions = isFocused && keyword.trim().length >= 2;

  return (
    <AutoComplete
      className="global-product-search"
      value={keyword}
      options={options}
      open={canShowSuggestions}
      notFoundContent={
        isLoadingSuggestions ? (
          <div className="global-search-suggestion-empty">
            <Spin size="small" /> Đang tìm sản phẩm…
          </div>
        ) : (
          <Empty
            className="global-search-suggestion-empty"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Không có sản phẩm phù hợp"
          />
        )
      }
      onChange={(value) => setKeyword(value)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        window.setTimeout(() => setIsFocused(false), 120);
      }}
      onSelect={(slug) => {
        setIsFocused(false);
        navigate(`/products/${slug}`);
      }}
    >
      <Input.Search
        allowClear
        placeholder="Tìm xe đạp, phụ kiện..."
        onSearch={search}
        onChange={(event) => setKeyword(event.target.value)}
      />
    </AutoComplete>
  );
};
