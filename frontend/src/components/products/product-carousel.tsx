import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CaretRightOutlined,
  PauseOutlined,
} from '@ant-design/icons';
import { Grid } from 'antd';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { Product } from '../../types/catalog';
import '../../styles/product-carousel.css';
import { ProductCard } from './product-card';

interface ProductCarouselProps {
  products: Product[];
  autoplaySpeed?: number;
  maxVisibleProductCount?: number;
}

const getVisibleProductCount = (screens: ReturnType<typeof Grid.useBreakpoint>): number => {
  if (screens.xl) return 4;
  if (screens.md) return 3;
  if (screens.sm) return 2;
  return 1;
};

const getItemStep = (track: HTMLDivElement): number => {
  const first = track.children[0] as HTMLElement | undefined;
  const second = track.children[1] as HTMLElement | undefined;
  return first && second ? second.offsetLeft - first.offsetLeft : track.clientWidth;
};

export const ProductCarousel = ({
  products,
  autoplaySpeed = 4200,
  maxVisibleProductCount,
}: ProductCarouselProps) => {
  const screens = Grid.useBreakpoint();
  const visibleProductCount = Math.max(
    1,
    Math.min(getVisibleProductCount(screens), maxVisibleProductCount ?? 4),
  );
  const trackId = useId();
  const railRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ first: 0, atStart: true, atEnd: false });
  const [inViewport, setInViewport] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const hasOverflow = products.length > visibleProductCount;
  const supportsAutoplay = Number.isFinite(autoplaySpeed) && autoplaySpeed > 0;

  const updatePosition = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const scrollLeft = Math.max(0, Math.min(track.scrollLeft, maxScroll));
    const step = getItemStep(track);
    const first = Math.min(
      Math.max(0, products.length - visibleProductCount),
      step > 0 ? Math.round(scrollLeft / step) : 0,
    );
    const next = { first, atStart: scrollLeft < 2, atEnd: maxScroll - scrollLeft < 2 };
    setPosition((current) =>
      current.first === next.first &&
      current.atStart === next.atStart &&
      current.atEnd === next.atEnd
        ? current
        : next,
    );
  }, [products.length, visibleProductCount]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(track);
    return () => observer.disconnect();
  }, [updatePosition]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInViewport(entry.isIntersecting && entry.intersectionRatio >= 0.35),
      { threshold: [0, 0.35] },
    );
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      media.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (
      !supportsAutoplay || !hasOverflow || !inViewport || !documentVisible ||
      reducedMotion || hovered || focused || userPaused
    ) return;

    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const maxScroll = track.scrollWidth - track.clientWidth;
      const step = getItemStep(track);
      const next = Math.min(maxScroll, (Math.round(track.scrollLeft / step) + 1) * step);
      track.scrollTo({ left: maxScroll - track.scrollLeft < 2 ? 0 : next, behavior: 'smooth' });
    }, autoplaySpeed);
    return () => window.clearInterval(timer);
  }, [
    autoplaySpeed, documentVisible, focused, hasOverflow, hovered,
    inViewport, reducedMotion, supportsAutoplay, userPaused,
  ]);

  const navigate = (direction: -1 | 1 | 'start' | 'end') => {
    const track = trackRef.current;
    if (!track) return;
    setUserPaused(true);
    const step = getItemStep(track);
    const maxScroll = track.scrollWidth - track.clientWidth;
    const left = direction === 'start' ? 0 : direction === 'end' ? maxScroll
      : Math.min(maxScroll, Math.max(0, (Math.round(track.scrollLeft / step) + direction) * step));
    track.scrollTo({ left, behavior: reducedMotion ? 'instant' : 'smooth' });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !hasOverflow) return;
    const directions = { ArrowLeft: -1, ArrowRight: 1, Home: 'start', End: 'end' } as const;
    if (event.key in directions) {
      event.preventDefault();
      navigate(directions[event.key as keyof typeof directions]);
    }
  };

  const firstVisible = Math.min(position.first, Math.max(0, products.length - visibleProductCount));
  const lastVisible = Math.min(products.length, firstVisible + visibleProductCount);

  return (
    <div
      ref={railRef}
      className="product-scroll-rail"
      role="group"
      aria-roledescription="băng chuyền sản phẩm"
      aria-label="Sản phẩm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div
        ref={trackRef}
        id={trackId}
        className="product-scroll-track"
        style={{ '--product-scroll-count': visibleProductCount } as CSSProperties}
        role="list"
        aria-label={hasOverflow ? 'Danh sách sản phẩm, dùng phím mũi tên để xem thêm' : 'Danh sách sản phẩm'}
        tabIndex={hasOverflow ? 0 : undefined}
        onScroll={updatePosition}
        onKeyDown={handleKeyDown}
        onPointerDown={() => setUserPaused(true)}
        onWheel={(event) => {
          if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) setUserPaused(true);
        }}
      >
        {products.map((product) => (
          <article key={product.id} role="listitem" className="product-scroll-item">
            <ProductCard product={product} />
          </article>
        ))}
      </div>
      {hasOverflow && (
        <div className="product-scroll-footer">
          <span className="product-scroll-range" aria-live="off">
            <strong>{String(firstVisible + 1).padStart(2, '0')}–{String(lastVisible).padStart(2, '0')}</strong>
            <span> / {String(products.length).padStart(2, '0')}</span>
          </span>
          <div className="product-scroll-progress" aria-hidden="true">
            <span style={{
              width: `${(Math.min(visibleProductCount, products.length) / products.length) * 100}%`,
              left: `${(firstVisible / products.length) * 100}%`,
            }} />
          </div>
          <div className="product-scroll-controls">
            {supportsAutoplay && !reducedMotion && (
              <button
                type="button"
                className="product-scroll-toggle"
                aria-label={userPaused ? 'Tự động chuyển sản phẩm' : 'Dừng tự động chuyển sản phẩm'}
                title={userPaused ? 'Tự động chuyển sản phẩm' : 'Dừng tự động chuyển sản phẩm'}
                aria-controls={trackId}
                onClick={() => setUserPaused((current) => !current)}
              >
                {userPaused ? <CaretRightOutlined /> : <PauseOutlined />}
              </button>
            )}
            <button
              type="button"
              aria-label="Xem sản phẩm trước"
              aria-controls={trackId}
              disabled={position.atStart}
              onClick={() => navigate(-1)}
            >
              <ArrowLeftOutlined />
            </button>
            <button
              type="button"
              aria-label="Xem sản phẩm tiếp theo"
              aria-controls={trackId}
              disabled={position.atEnd}
              onClick={() => navigate(1)}
            >
              <ArrowRightOutlined />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
