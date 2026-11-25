import {
  CheckCircleFilled,
  CompassOutlined,
  RocketOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Modal, Space, Typography } from 'antd';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { RecommendationChatbotFlow } from '../chatbot/recommendation-chatbot-flow';
import { BikeType } from '../../types/catalog';

const quickRideLinks = [
  {
    label: 'Đi làm hằng ngày',
    detail: 'Êm ái, thực dụng',
    to: `/products?bikeType=${BikeType.CITY}`,
  },
  {
    label: 'Khám phá địa hình',
    detail: 'Bền bỉ, kiểm soát tốt',
    to: `/products?bikeType=${BikeType.MOUNTAIN}`,
  },
  {
    label: 'Tăng tốc đường trường',
    detail: 'Nhẹ, tối ưu tốc độ',
    to: `/products?bikeType=${BikeType.ROAD}`,
  },
];

export const RideMatchLauncher = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section className="page-container ride-match-section" aria-labelledby="ride-match-title">
        <div className="ride-match-shell">
          <div className="ride-match-copy">
            <span className="ride-match-kicker">
              <CompassOutlined /> TƯ VẤN CHỌN XE
            </span>
            <Typography.Title id="ride-match-title" level={2}>
              Chọn xe theo hành trình của bạn.
            </Typography.Title>
            <Typography.Paragraph className="ride-match-description">
              Khám phá xe theo nhu cầu di chuyển hoặc tính size theo chiều cao.
              Trợ lý tư vấn đối chiếu ngân sách, size và tồn kho để gợi ý các mẫu đã mở bán.
            </Typography.Paragraph>

            <div className="ride-match-proof-list">
              <span><CheckCircleFilled /> Không chọn ngẫu nhiên</span>
              <span><CheckCircleFilled /> Có đối chiếu size</span>
              <span><CheckCircleFilled /> Kiểm tra tồn kho trước khi mua</span>
            </div>

            <Space wrap size="middle" className="ride-match-actions">
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={() => setIsOpen(true)}
              >
                Bắt đầu tư vấn
              </Button>
              <Link to="/size-guide">
                <Button size="large">Tôi chỉ cần tính size</Button>
              </Link>
            </Space>
          </div>

          <div className="ride-match-visual" aria-hidden="true">
            <div className="ride-match-route ride-match-route--one" />
            <div className="ride-match-route ride-match-route--two" />
            <div className="ride-match-route ride-match-route--three" />
            <div className="ride-match-orbit ride-match-orbit--outer" />
            <div className="ride-match-orbit ride-match-orbit--inner" />
            <div className="ride-match-compass"><CompassOutlined /></div>
            <div className="ride-match-stat ride-match-stat--top">
              <small>BƯỚC 01</small>
              <strong>Nhu cầu đi xe</strong>
            </div>
            <div className="ride-match-stat ride-match-stat--bottom">
              <small>BƯỚC 02–03</small>
              <strong>Ngân sách · Chiều cao</strong>
            </div>
          </div>

          <div className="ride-match-quick-links">
            <Typography.Text>Hoặc bắt đầu thật nhanh</Typography.Text>
            <div>
              {quickRideLinks.map((item) => (
                <Link key={item.label} to={item.to}>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                  <ThunderboltOutlined />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Modal
        open={isOpen}
        footer={null}
        centered
        destroyOnHidden
        className="ride-match-modal"
        onCancel={() => setIsOpen(false)}
      >
        <div className="ride-match-modal-header">
          <span><CompassOutlined /></span>
          <div>
            <Typography.Text strong>Ride Match</Typography.Text>
            <Typography.Text type="secondary">Tìm xe phù hợp từ dữ liệu thật của cửa hàng</Typography.Text>
          </div>
        </div>
        {isOpen ? (
          <RecommendationChatbotFlow
            backLabel="← Đóng tư vấn"
            onBackToFaq={() => setIsOpen(false)}
          />
        ) : null}
      </Modal>
    </>
  );
};
