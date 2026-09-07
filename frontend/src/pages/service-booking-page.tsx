import {
  CalendarOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  List,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { serviceBookingService } from '../api/services/service-booking.service';
import { useAuthStore } from '../stores/auth.store';
import {
  ServiceBookingStatus,
  ServiceBookingType,
  type CreateServiceBookingPayload,
  type ServiceBooking,
  type ServiceBookingListResult,
  serviceBookingStatusLabels,
  serviceBookingTypeLabels,
} from '../types/service-booking';
import { getErrorMessage } from '../utils/error-message';

interface ServiceBookingFormValues extends Omit<CreateServiceBookingPayload, 'preferredDate'> {
  preferredDate: string;
}

const serviceStatusColor: Record<ServiceBookingStatus, string> = {
  [ServiceBookingStatus.PENDING]: 'gold',
  [ServiceBookingStatus.CONFIRMED]: 'blue',
  [ServiceBookingStatus.IN_PROGRESS]: 'cyan',
  [ServiceBookingStatus.COMPLETED]: 'green',
  [ServiceBookingStatus.CANCELLED]: 'red',
};

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date(value));

const timeSlotOptions = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '13:00 - 15:00',
  '15:00 - 17:00',
  '17:00 - 19:00',
];

const tomorrow = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};

export const ServiceBookingPage = () => {
  const user = useAuthStore((state) => state.user);
  const [form] = Form.useForm<ServiceBookingFormValues>();
  const [result, setResult] = useState<ServiceBookingListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadBookings = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setResult(await serviceBookingService.getMine({ page: 1, limit: 12 }));
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    form.setFieldsValue({
      contactName: user?.fullName,
      serviceType: ServiceBookingType.MAINTENANCE,
      preferredDate: tomorrow(),
      preferredTimeSlot: timeSlotOptions[0],
      serviceLocation: 'XeDap22h - vui lòng liên hệ xác nhận chi nhánh',
    });
  }, [form, user?.fullName]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const createBooking = async (values: ServiceBookingFormValues): Promise<void> => {
    setIsSaving(true);
    try {
      await serviceBookingService.create({
        ...values,
        contactName: values.contactName.trim(),
        contactPhone: values.contactPhone.trim(),
        serviceLocation: values.serviceLocation.trim(),
        bicycleBrand: values.bicycleBrand?.trim() || undefined,
        bicycleModel: values.bicycleModel?.trim() || undefined,
        description: values.description.trim(),
        preferredDate: new Date(`${values.preferredDate}T09:00:00`).toISOString(),
      });
      message.success('Đã gửi yêu cầu đặt lịch. Shop sẽ xác nhận qua email.');
      form.setFieldsValue({
        serviceType: ServiceBookingType.MAINTENANCE,
        preferredDate: tomorrow(),
        preferredTimeSlot: timeSlotOptions[0],
        bicycleBrand: undefined,
        bicycleModel: undefined,
        description: undefined,
      });
      await loadBookings();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const cancelBooking = async (booking: ServiceBooking): Promise<void> => {
    try {
      await serviceBookingService.cancel(booking.id, 'Khách hàng chủ động hủy lịch hẹn.');
      message.success('Đã hủy lịch hẹn.');
      await loadBookings();
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const visibleBookings = [...(result?.items ?? [])].sort(
    (left, right) => Date.parse(right.preferredDate) - Date.parse(left.preferredDate),
  );

  return (
    <main className="service-booking-page page-container">
      <section className="service-booking-hero">
        <div>
          <Typography.Text className="section-eyebrow">Dịch vụ hậu mãi</Typography.Text>
          <Typography.Title level={1}>Đặt lịch chăm sóc xe đạp</Typography.Title>
          <Typography.Paragraph>
            Đặt lịch bảo dưỡng, sửa chữa, lắp ráp hoặc bike fitting. Thời gian đăng ký
            là thời gian mong muốn; nhân viên sẽ liên hệ xác nhận trước khi thực hiện.
          </Typography.Paragraph>
        </div>
        <ToolOutlined aria-hidden />
      </section>

      <Row gutter={[28, 28]} align="top">
        <Col xs={24} lg={14}>
          <Card className="service-booking-form-card" title="Thông tin lịch hẹn">
            <Form<ServiceBookingFormValues> form={form} layout="vertical" onFinish={createBooking}>
              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="serviceType"
                    label="Nhu cầu dịch vụ"
                    rules={[{ required: true, message: 'Chọn nhu cầu dịch vụ.' }]}
                  >
                    <Select
                      options={Object.values(ServiceBookingType).map((value) => ({
                        value,
                        label: serviceBookingTypeLabels[value],
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="contactName"
                    label="Họ tên liên hệ"
                    rules={[{ required: true, min: 2, message: 'Nhập họ tên từ 2 ký tự.' }]}
                  >
                    <Input maxLength={120} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="contactPhone"
                    label="Số điện thoại"
                    rules={[
                      { required: true, message: 'Nhập số điện thoại.' },
                      { min: 8, message: 'Số điện thoại chưa hợp lệ.' },
                    ]}
                  >
                    <Input inputMode="tel" maxLength={25} placeholder="0901234567" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="preferredDate"
                    label="Ngày mong muốn"
                    rules={[{ required: true, message: 'Chọn ngày hẹn.' }]}
                  >
                    <Input type="date" min={tomorrow()} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="preferredTimeSlot"
                    label="Khung giờ mong muốn"
                    rules={[{ required: true, message: 'Chọn khung giờ.' }]}
                  >
                    <Select options={timeSlotOptions.map((value) => ({ value, label: value }))} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="bicycleBrand" label="Thương hiệu xe (nếu có)">
                    <Input maxLength={120} placeholder="Ví dụ: Giant" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="serviceLocation"
                    label="Chi nhánh hoặc khu vực mong muốn"
                    rules={[{ required: true, min: 2, message: 'Nhập chi nhánh hoặc khu vực.' }]}
                  >
                    <Input maxLength={160} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="bicycleModel" label="Dòng xe / model (nếu có)">
                    <Input maxLength={160} placeholder="Ví dụ: Talon 2 2025" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="description"
                    label="Mô tả tình trạng hoặc yêu cầu"
                    rules={[{ required: true, min: 10, message: 'Mô tả ít nhất 10 ký tự.' }]}
                  >
                    <Input.TextArea
                      rows={5}
                      maxLength={1000}
                      showCount
                      placeholder="Ví dụ: Xe kêu khi đạp, cần kiểm tra phanh và bộ truyền động."
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" loading={isSaving} icon={<CalendarOutlined />}>
                Gửi yêu cầu đặt lịch
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            className="service-booking-list-card"
            title="Lịch hẹn của tôi"
            extra={<Button type="link" onClick={() => void loadBookings()}>Làm mới</Button>}
          >
            <Alert
              type="info"
              showIcon
              message="Bạn có thể hủy khi lịch đang chờ xác nhận hoặc đã xác nhận."
            />
            {isLoading ? (
              <Spin className="service-booking-loading" />
            ) : visibleBookings.length ? (
              <List
                className="service-booking-list"
                dataSource={visibleBookings}
                renderItem={(booking) => {
                  const canCancel = [
                    ServiceBookingStatus.PENDING,
                    ServiceBookingStatus.CONFIRMED,
                  ].includes(booking.status);
                  return (
                    <List.Item
                      actions={
                        canCancel
                          ? [
                              <Popconfirm
                                key="cancel"
                                title="Hủy lịch hẹn này?"
                                description="Shop sẽ nhận được thông báo hủy lịch của bạn."
                                okText="Hủy lịch"
                                cancelText="Quay lại"
                                onConfirm={() => void cancelBooking(booking)}
                              >
                                <Button danger type="link" size="small" icon={<DeleteOutlined />}>
                                  Hủy
                                </Button>
                              </Popconfirm>,
                            ]
                          : undefined
                      }
                    >
                      <List.Item.Meta
                        title={
                          <Space wrap>
                            <Typography.Text strong>{booking.bookingCode}</Typography.Text>
                            <Tag color={serviceStatusColor[booking.status]}>
                              {serviceBookingStatusLabels[booking.status]}
                            </Tag>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={2}>
                            <Typography.Text>{serviceBookingTypeLabels[booking.serviceType]}</Typography.Text>
                            <Typography.Text type="secondary">
                              <CalendarOutlined /> {formatDate(booking.preferredDate)}
                            </Typography.Text>
                            <Typography.Text type="secondary">
                              <ClockCircleOutlined /> {booking.preferredTimeSlot}
                            </Typography.Text>
                            {booking.statusHistory.at(-1)?.note ? (
                              <Typography.Text type="secondary">
                                {booking.statusHistory.at(-1)?.note}
                              </Typography.Text>
                            ) : null}
                          </Space>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description="Chưa có lịch hẹn nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>
    </main>
  );
};
