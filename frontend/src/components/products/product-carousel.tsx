import { Carousel, Grid } from 'antd';
import { useMemo } from 'react';
import type { Product } from '../../types/catalog';
import { ProductCard } from './product-card';

interface ProductCarouselProps {
  products: Product[];
  autoplaySpeed?: number;
  maxVisibleProductCount?: number;
}

const getVisibleProductCount = (screens: ReturnType<typeof Grid.useBreakpoint>): number => {
  if (screens.xl) {
    return 4;
  }

  if (screens.md) {
    return 3;
  }

  if (screens.sm) {
    return 2;
  }

  return 1;
};

/**
 * The carousel builds an overlapping slide for every product index. This makes
 * a product rail advance one item at a time instead of jumping an entire row.
 */
export const ProductCarousel = ({
  products,
  autoplaySpeed = 4200,
  maxVisibleProductCount,
}: ProductCarouselProps) => {
  const screens = Grid.useBreakpoint();
  const visibleProductCount = Math.min(
    getVisibleProductCount(screens),
    maxVisibleProductCount ?? Number.POSITIVE_INFINITY,
  );
  const slides = useMemo(() => {
    if (products.length <= visibleProductCount) {
      return [products];
    }

    return products.map((_, startIndex) =>
      Array.from(
        { length: visibleProductCount },
        (_, offset) => products[(startIndex + offset) % products.length],
      ),
    );
  }, [products, visibleProductCount]);

  if (products.length <= visibleProductCount) {
    return (
      <div className="product-carousel-static">
        {products.map((product) => (
          <article key={product.id} className="product-carousel-item">
            <ProductCard product={product} />
          </article>
        ))}
      </div>
    );
  }

  return (
    <Carousel
      className="product-carousel"
      autoplay
      autoplaySpeed={autoplaySpeed}
      speed={640}
      pauseOnHover
      dots={{ className: 'product-carousel-dots' }}
    >
      {slides.map((slide, slideIndex) => (
        <div key={`${slide[0]?.id ?? 'slide'}-${slideIndex}`}>
          <div className="product-carousel-slide">
            {slide.map((product, productIndex) => (
              <article
                key={`${product.id}-${slideIndex}-${productIndex}`}
                className="product-carousel-item"
              >
                <ProductCard product={product} />
              </article>
            ))}
          </div>
        </div>
      ))}
    </Carousel>
  );
};
