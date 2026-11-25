import { CloseOutlined, SwapOutlined } from '@ant-design/icons';
import { Badge, Button, Space, Typography } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useCompareStore } from '../../stores/compare.store';

export const CompareTray = () => {
  const { pathname } = useLocation();
  const items = useCompareStore((state) => state.items);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);

  if (!items.length || pathname.replace(/\/$/, '') === '/compare') {
    return null;
  }

  return (
    <aside className="compare-tray" aria-label="Sản phẩm đang chờ so sánh">
      <div className="compare-tray-heading">
        <Space size={6}>
          <Badge count={items.length} color="#d9372c" />
          <Typography.Text strong>So sánh xe</Typography.Text>
        </Space>
        <Button type="link" size="small" onClick={clear}>
          Xóa hết
        </Button>
      </div>
      <div className="compare-tray-items">
        {items.map((item) => (
          <div key={item.id} className="compare-tray-item">
            <img
              src={item.thumbnail}
              alt=""
              width={38}
              height={30}
              loading="lazy"
              decoding="async"
              style={{ objectFit: 'contain', background: '#f5f6f7', borderRadius: 4 }}
            />
            <Link to={`/products/${item.slug}`}>{item.name}</Link>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              aria-label={`Bỏ ${item.name} khỏi danh sách so sánh`}
              onClick={() => remove(item.id)}
            />
          </div>
        ))}
      </div>
      <Link to="/compare">
        <Button type="primary" block icon={<SwapOutlined />}>
          So sánh {items.length} xe
        </Button>
      </Link>
    </aside>
  );
};
