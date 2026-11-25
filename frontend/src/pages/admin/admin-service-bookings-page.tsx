import {
  EditOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useRef, useState } from 'react';
import { serviceBookingService } from '../../api/services/service-booking.service';
import type {
  AdminServiceBookingQuery,
  ServiceBooking,
  ServiceBookingListResult,
  UpdateServiceBookingStatusPayload,
} from '../../types/service-booking';
import {
  ServiceBookingStatus,
  ServiceBookingType,
  serviceBookingStatusLabels,
  serviceBookingTypeLabels,
} from '../../types/service-booking';
import { getErrorMessage } from '../../utils/error-message';

type StatusFormValues = UpdateServiceBookingStatusPayload;

const serviceStatusColor: Record<ServiceBookingStatus, string> = {
  [ServiceBookingStatus.PENDING]: 'gold',
  [ServiceBookingStatus.CONFIRMED]: 'blue',
  [ServiceBookingStatus.IN_PROGRESS]: 'cyan',
  [ServiceBookingStatus.COMPLETED]: 'green',
  [ServiceBookingStatus.CANCELLED]: 'red',
};

const nextStatuses: Record<ServiceBookingStatus, ServiceBookingStatus[]> = {
  [ServiceBookingStatus.PENDING]: [
    ServiceBookingStatus.CONFIRMED,
    ServiceBookingStatus.CANCELLED,
  ],
  [ServiceBookingStatus.CONFIRMED]: [
    ServiceBookingStatus.IN_PROGRESS,
    ServiceBookingStatus.CANCELLED,
  ],
  [ServiceBookingStatus.IN_PROGRESS]: [
    ServiceBookingStatus.COMPLETED,
    ServiceBookingStatus.CANCELLED,
  ],
  [ServiceBookingStatus.COMPLETED]: [],
  [ServiceBookingStatus.CANCELLED]: [],
};

const formatDateTime = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const AdminServiceBookingsPage = () => {
  const [result, setResult] = useState<ServiceBookingListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState<string>();
  const [status, setStatus] = useState<ServiceBookingStatus>();
  const [serviceType, setServiceType] = useState<ServiceBookingType>();
  const [detailBooking, setDetailBooking] = useState<ServiceBooking | null>(null);
  const [statusBooking, setStatusBooking] = useState<ServiceBooking | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusForm] = Form.useForm<StatusFormValues>();
  const nextStatus = Form.useWatch('status', statusForm);
  const loadSequence = useRef(0);
  const detailSequence = useRef(0);
  const isMounted = useRef(false);
  const savingRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      detailSequence.current += 1;
    };
  }, []);

  const loadBookings = useCallback(async (): Promise<void> => {
    const sequence = ++loadSequence.current;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const query: AdminServiceBookingQuery = {
        page,
        limit: 12,
        ...(keyword ? { keyword } : {}),
        ...(status ? { status } : {}),
        ...(serviceType ? { serviceType } : {}),
      };
      const nextResult = await serviceBookingService.getAdminList(query);
      if (sequence === loadSequence.current) setResult(nextResult);
    } catch (error) {
      if (sequence === loadSequence.current) {
        setErrorMessage(getErrorMessage(error));
        setResult(null);
      }
    } finally {
      if (sequence === loadSequence.current) setIsLoading(false);
    }
  }, [keyword, page, serviceType, status]);

  useEffect(() => {
    void loadBookings();
    return () => { loadSequence.current += 1; };
  }, [loadBookings]);

  const openDetail = async (booking: ServiceBooking): Promise<void> => {
    if (savingRef.current) return;
    const sequence = ++detailSequence.current;
    setLoadingDetailId(booking.id);
    try {
      const nextBooking = await serviceBookingService.getAdminById(booking.id);
      if (isMounted.current && sequence === detailSequence.current) {
        setDetailBooking(nextBooking);
        setIsDetailOpen(true);
      }
    } catch (error) {
      if (isMounted.current && sequence === detailSequence.current) {
        message.error(getErrorMessage(error));
      }
    } finally {
      if (isMounted.current && sequence === detailSequence.current) {
        setLoadingDetailId(null);
      }
    }
  };

  const closeDetail = (): void => {
    detailSequence.current += 1;
    setLoadingDetailId(null);
    setIsDetailOpen(false);
  };

  const openStatusModal = (booking: ServiceBooking): void => {
    if (savingRef.current) return;
    closeDetail();
    setStatusBooking(booking);
    statusForm.resetFields();
    const options = nextStatuses[booking.status];
    statusForm.setFieldsValue({ status: options[0] });
    setIsStatusModalOpen(true);
  };

  const closeStatusModal = (): void => {
    if (savingRef.current) return;
    setIsStatusModalOpen(false);
  };

  const updateStatus = async (values: StatusFormValues): Promise<void> => {
    if (!statusBooking || savingRef.current) {
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      await serviceBookingService.updateAdminStatus(statusBooking.id, {
        status: values.status,
        note: values.note?.trim() || undefined,
        adminNote: values.adminNote?.trim() || undefined,
      });
      if (!isMounted.current) return;
      message.success('Đã cập nhật lịch hẹn.');
      setIsStatusModalOpen(false);
      statusForm.resetFields();
      await loadBookings();
    } catch (error) {
      if (isMounted.current) message.error(getErrorMessage(error));
    } finally {
      savingRef.current = false;
      if (isMounted.current) setIsSaving(false);
    }
  };

  const columns: ColumnsType<ServiceBooking> = [
      {
        title: 'Mã lịch',
        dataIndex: 'bookingCode',
        key: 'bookingCode',
        render: (value: string, booking) => (
          <Button
            type="link"
            loading={loadingDetailId === booking.id}
            disabled={isSaving}
            onClick={() => void openDetail(booking)}
          >
            {value}
          </Button>
        ),
      },
      {
        title: 'Khách hàng',
        key: 'contact',
        render: (_, booking) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{booking.contact.name}</Typography.Text>
            <Typography.Text type="secondary">{booking.contact.phone}</Typography.Text>
          </Space>
        ),
      },
      {
        title: 'Dịch vụ',
        dataIndex: 'serviceType',
        key: 'serviceType',
        render: (value: ServiceBookingType) => serviceBookingTypeLabels[value],
      },
      {
        title: 'Lịch mong muốn',
        key: 'schedule',
        render: (_, booking) => (
          <Space direction="vertical" size={0}>
            <Typography.Text>{formatDateTime(booking.preferredDate)}</Typography.Text>
            <Typography.Text type="secondary">{booking.preferredTimeSlot}</Typography.Text>
          </Space>
        ),
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        render: (value: ServiceBookingStatus) => (
          <Tag color={serviceStatusColor[value]}>{serviceBookingStatusLabels[value]}</Tag>
        ),
      },
      {
        title: 'Thao tác',
        key: 'actions',
        fixed: 'right',
        render: (_, booking) => (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              loading={loadingDetailId === booking.id}
              disabled={isSaving}
              onClick={() => void openDetail(booking)}
            >
              Chi tiết
            </Button>
            {nextStatuses[booking.status].length ? (
              <Button type="link" icon={<EditOutlined />} disabled={isSaving} onClick={() => openStatusModal(booking)}>
                Cập nhật
              </Button>
            ) : null}
          </Space>
        ),
      },
  ];

  const bookings = result?.items ?? [];
  const meta = result?.meta;
  const statusOptions = statusBooking ? nextStatuses[statusBooking.status] : [];

  return (
    <section className="admin-page admin-service-bookings-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>Lịch dịch vụ xe đạp</Typography.Title>
          <Typography.Text type="secondary">
            Xác nhận, xử lý và lưu lịch sử các yêu cầu bảo dưỡng, sửa chữa hoặc bike fitting.
          </Typography.Text>
        </div>
      </div>

      <Space wrap className="admin-order-filters">
        <Input.Search
          allowClear
          className="admin-order-search"
          value={searchInput}
          placeholder="Mã lịch, khách hàng, số điện thoại, dòng xe"
          enterButton={<SearchOutlined />}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setKeyword(value.trim() || undefined);
            setPage(1);
          }}
        />
        <Select<ServiceBookingStatus>
          allowClear
          className="admin-order-filter-select"
          value={status}
          placeholder="Trạng thái"
          options={Object.values(ServiceBookingStatus).map((value) => ({
            value,
            label: serviceBookingStatusLabels[value],
          }))}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <Select<ServiceBookingType>
          allowClear
          className="admin-order-filter-select"
          value={serviceType}
          placeholder="Loại dịch vụ"
          options={Object.values(ServiceBookingType).map((value) => ({
            value,
            label: serviceBookingTypeLabels[value],
          }))}
          onChange={(value) => {
            setServiceType(value);
            setPage(1);
          }}
        />
        <Button
          disabled={!searchInput && !keyword && !status && !serviceType}
          onClick={() => {
            setSearchInput('');
            setKeyword(undefined);
            setStatus(undefined);
            setServiceType(undefined);
            setPage(1);
          }}
        >
          Xóa bộ lọc
        </Button>
      </Space>

      {errorMessage ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải lịch dịch vụ"
          description={errorMessage}
          action={<Button onClick={() => void loadBookings()}>Thử lại</Button>}
        />
      ) : (
        <Table
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={bookings}
          pagination={false}
          scroll={{ x: 1080 }}
        />
      )}
      {meta && (meta.totalPages ?? 1) > 1 ? (
        <Pagination
          className="admin-table-pagination"
          current={page}
          pageSize={12}
          total={meta.total}
          showSizeChanger={false}
          onChange={setPage}
        />
      ) : null}

      <Modal
        title={detailBooking ? `Chi tiết ${detailBooking.bookingCode}` : 'Chi tiết lịch hẹn'}
        open={isDetailOpen}
        footer={<Button onClick={closeDetail}>Đóng</Button>}
        width={760}
        onCancel={closeDetail}
      >
        {detailBooking ? (
          <Space direction="vertical" size="large" className="full-width">
            <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Khách hàng">{detailBooking.contact.name}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{detailBooking.contact.phone}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailBooking.contact.email}</Descriptions.Item>
              <Descriptions.Item label="Dịch vụ">
                {serviceBookingTypeLabels[detailBooking.serviceType]}
              </Descriptions.Item>
              <Descriptions.Item label="Lịch mong muốn">
                {formatDateTime(detailBooking.preferredDate)} · {detailBooking.preferredTimeSlot}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={serviceStatusColor[detailBooking.status]}>
                  {serviceBookingStatusLabels[detailBooking.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Khu vực / chi nhánh" span={2}>
                {detailBooking.serviceLocation}
              </Descriptions.Item>
              <Descriptions.Item label="Xe" span={2}>
                {[detailBooking.bicycleBrand, detailBooking.bicycleModel].filter(Boolean).join(' · ') || 'Chưa cung cấp'}
              </Descriptions.Item>
              <Descriptions.Item label="Yêu cầu" span={2}>
                {detailBooking.description}
              </Descriptions.Item>
              {detailBooking.adminNote ? (
                <Descriptions.Item label="Ghi chú nội bộ" span={2}>
                  {detailBooking.adminNote}
                </Descriptions.Item>
              ) : null}
            </Descriptions>
            <div>
              <Typography.Title level={5}>Lịch sử xử lý</Typography.Title>
              <Timeline
                items={detailBooking.statusHistory.map((history) => ({
                  color: serviceStatusColor[history.status],
                  children: (
                    <Space direction="vertical" size={0}>
                      <Typography.Text strong>{serviceBookingStatusLabels[history.status]}</Typography.Text>
                      <Typography.Text type="secondary">{formatDateTime(history.changedAt)}</Typography.Text>
                      {history.note ? <Typography.Text>{history.note}</Typography.Text> : null}
                    </Space>
                  ),
                }))}
              />
            </div>
          </Space>
        ) : null}
      </Modal>

      <Modal
        title={statusBooking ? `Cập nhật ${statusBooking.bookingCode}` : 'Cập nhật lịch hẹn'}
        open={isStatusModalOpen}
        footer={null}
        destroyOnHidden
        closable={!isSaving}
        maskClosable={!isSaving}
        keyboard={!isSaving}
        onCancel={closeStatusModal}
      >
        <Form<StatusFormValues> form={statusForm} layout="vertical" onFinish={updateStatus} disabled={isSaving}>
          <Form.Item name="status" label="Trạng thái mới" rules={[{ required: true }]}>
            <Select
              options={statusOptions.map((value) => ({
                value,
                label: serviceBookingStatusLabels[value],
              }))}
            />
          </Form.Item>
          <Form.Item
            name="note"
            label={
              nextStatus === ServiceBookingStatus.CANCELLED
                ? 'Lý do hủy gửi khách hàng'
                : 'Ghi chú gửi khách hàng'
            }
            rules={[
              {
                required: nextStatus === ServiceBookingStatus.CANCELLED,
                message: 'Nhập lý do hủy lịch hẹn.',
              },
            ]}
          >
            <Input.TextArea rows={3} maxLength={500} showCount />
          </Form.Item>
          <Form.Item name="adminNote" label="Ghi chú nội bộ">
            <Input.TextArea rows={3} maxLength={1000} showCount />
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={closeStatusModal} disabled={isSaving}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu trạng thái
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
