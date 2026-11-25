import { AutoComplete, Empty, Input, Spin, Typography, type InputRef } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const inputRef = useRef<InputRef>(null);
  const [keyword, setKeyword] = useState('');
  const [suggestionResult, setSuggestionResult] = useState<{
    keyword: string;
    products: Product[];
    hasError: boolean;
  } | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const normalizedKeyword = keyword.trim();
  const canShowSuggestions = isFocused && normalizedKeyword.length >= 2;
  const currentSuggestions = suggestionResult?.keyword === normalizedKeyword
    ? suggestionResult
    : null;
  const isLoadingSuggestions = canShowSuggestions && !currentSuggestions;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setKeyword(location.pathname === '/products' ? params.get('keyword') ?? '' : '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!canShowSuggestions) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      void productService
        .getPublicList({
          keyword: normalizedKeyword,
          limit: SEARCH_SUGGESTION_LIMIT,
          sort: ProductSort.BEST_SELLING,
        }, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) {
            setSuggestionResult({ keyword: normalizedKeyword, products: result.items, hasError: false });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestionResult({ keyword: normalizedKeyword, products: [], hasError: true });
          }
        });
    }, SEARCH_DELAY_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [canShowSuggestions, normalizedKeyword]);

  const search = (value: string): void => {
    const normalizedValue = value.trim();
    const params = new URLSearchParams();

    if (normalizedValue) {
      params.set('keyword', normalizedValue);
    }

    setIsFocused(false);
    inputRef.current?.blur();
    setSuggestionResult(null);

    const searchParams = params.toString();
    navigate({
      pathname: '/products',
      search: searchParams ? `?${searchParams}` : '',
    });
  };

  const options = useMemo(
    () =>
      (currentSuggestions?.products ?? []).map((product) => ({
        value: product.slug,
        label: (
          <div className="global-search-suggestion">
            <img src={product.thumbnail} alt="" onError={(event) => {
              if (!event.currentTarget.src.endsWith('/images/product-placeholder.svg')) {
                event.currentTarget.src = '/images/product-placeholder.svg';
              }
            }} />
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
              {product.catalogOnly ? <><br /><Typography.Text type="secondary">Giá tham khảo</Typography.Text></> : null}
            </Typography.Text>
          </div>
        ),
      })),
    [currentSuggestions],
  );

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
            description={currentSuggestions?.hasError
              ? 'Chưa tải được gợi ý. Nhấn Enter để tìm kiếm.'
              : 'Không có sản phẩm phù hợp'}
          />
        )
      }
      onChange={(value) => setKeyword(value)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onSelect={(slug) => {
        setIsFocused(false);
        inputRef.current?.blur();
        navigate(`/products/${slug}`);
      }}
    >
      <Input.Search
        ref={inputRef}
        allowClear
        placeholder="Tìm xe đạp, phụ kiện..."
        onSearch={search}
        onClick={() => setIsFocused(true)}
        onChange={(event) => {
          setKeyword(event.target.value);
          setIsFocused(true);
        }}
      />
    </AutoComplete>
  );
};
