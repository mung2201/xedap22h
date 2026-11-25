import { Button, Result, Space } from 'antd';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="Trang bạn tìm không tồn tại."
      extra={
        <Space wrap>
          <Button type="primary" onClick={() => navigate('/')}>Về trang chủ</Button>
          <Button onClick={() => navigate('/products')}>Xem sản phẩm</Button>
        </Space>
      }
    />
  );
};
