import {
  EditOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';
import { adminUserService } from '../../api/services/admin-user.service';
import { useAuthStore } from '../../stores/auth.store';
import { Permission, UserRole, UserStatus } from '../../types/auth';
import type { CurrentUser } from '../../types/auth';
import type { AdminUserListResult } from '../../types/admin';
import { getErrorMessage } from '../../utils/error-message';

const roleColor: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'red',
  [UserRole.STAFF]: 'blue',
  [UserRole.CUSTOMER]: 'default',
};

const statusColor: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'green',
  [UserStatus.INACTIVE]: 'default',
  [UserStatus.LOCKED]: 'red',
};

const statusLabel: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Hoạt động',
  [UserStatus.INACTIVE]: 'Tạm dừng',
  [UserStatus.LOCKED]: 'Đã khóa',
};

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

interface RoleFormValues {
  role: UserRole;
}

interface PermissionsFormValues {
  permissions: Permission[];
}

export const AdminUsersPage = () => {
  const currentUser = useAuthStore((state) => state.user);
  const [result, setResult] = useState<AdminUserListResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState<string>();
  const [role, setRole] = useState<UserRole>();
  const [status, setStatus] = useState<UserStatus>();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [roleUser, setRoleUser] = useState<CurrentUser | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<CurrentUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [roleForm] = Form.useForm<RoleFormValues>();
  const [permissionsForm] = Form.useForm<PermissionsFormValues>();
  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const canChangeStatus = (user: CurrentUser): boolean =>
    user.id !== currentUser?.id &&
    (isAdmin || user.role === UserRole.CUSTOMER);

  const loadUsers = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      setResult(
        await adminUserService.getList({
          page,
          limit: 10,
          ...(keyword ? { keyword } : {}),
          ...(role ? { role } : {}),
          ...(status ? { status } : {}),
        }),
      );
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [page, keyword, role, status]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const updateStatus = async (user: CurrentUser): Promise<void> => {
    const nextStatus = user.status === UserStatus.ACTIVE ? UserStatus.LOCKED : UserStatus.ACTIVE;
    setBusyUserId(user.id);
    try {
      await adminUserService.updateStatus(user.id, { status: nextStatus });
      message.success(nextStatus === UserStatus.LOCKED ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
      await loadUsers();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusyUserId(null);
    }
  };

  const openRoleModal = (user: CurrentUser): void => {
    roleForm.setFieldsValue({ role: user.role });
    setRoleUser(user);
  };

  const saveRole = async (values: RoleFormValues): Promise<void> => {
    if (!roleUser) {
      return;
    }

    setIsSaving(true);
    try {
      await adminUserService.updateRole(roleUser.id, values);
      message.success('Đã cập nhật role người dùng.');
      setRoleUser(null);
      await loadUsers();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const openPermissionsModal = (user: CurrentUser): void => {
    permissionsForm.setFieldsValue({ permissions: user.permissions as Permission[] });
    setPermissionsUser(user);
  };

  const savePermissions = async (values: PermissionsFormValues): Promise<void> => {
    if (!permissionsUser) {
      return;
    }

    setIsSaving(true);
    try {
      await adminUserService.updatePermissions(permissionsUser.id, values);
      message.success('Đã cập nhật quyền STAFF.');
      setPermissionsUser(null);
      await loadUsers();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const columns: ColumnsType<CurrentUser> = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_, user) => (
        <Space>
          <Avatar src={user.avatarUrl}>{user.fullName.slice(0, 1).toUpperCase()}</Avatar>
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{user.fullName}</Typography.Text>
            <Typography.Text type="secondary">@{user.username}</Typography.Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      render: (_, user) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{user.email}</Typography.Text>
          <Typography.Text type="secondary">{user.phone ?? 'Chưa cập nhật SĐT'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (value: UserRole) => <Tag color={roleColor[value]}>{value}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: UserStatus) => <Tag color={statusColor[value]}>{statusLabel[value]}</Tag>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDate(value),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      render: (_, user) => (
        <Space wrap>
          {canChangeStatus(user) ? (
            <Popconfirm
              title={user.status === UserStatus.ACTIVE ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản này?'}
              description="Thay đổi trạng thái sẽ vô hiệu hóa session hiện tại của người dùng."
              okText="Xác nhận"
              cancelText="Hủy"
              onConfirm={() => void updateStatus(user)}
            >
              <Button
                type="link"
                danger={user.status === UserStatus.ACTIVE}
                loading={busyUserId === user.id}
                icon={user.status === UserStatus.ACTIVE ? <LockOutlined /> : <UnlockOutlined />}
              >
                {user.status === UserStatus.ACTIVE ? 'Khóa' : 'Mở khóa'}
              </Button>
            </Popconfirm>
          ) : null}
          {isAdmin && user.id !== currentUser?.id ? (
            <Button type="link" icon={<EditOutlined />} onClick={() => openRoleModal(user)}>
              Role
            </Button>
          ) : null}
          {isAdmin && user.role === UserRole.STAFF ? (
            <Button
              type="link"
              icon={<SafetyCertificateOutlined />}
              onClick={() => openPermissionsModal(user)}
            >
              Quyền
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const users = result?.items ?? [];
  const meta = result?.meta;

  return (
    <section className="admin-page">
      <div className="admin-page-heading">
        <div>
          <Typography.Title level={2}>Người dùng</Typography.Title>
          <Typography.Text type="secondary">
            Quản lý customer, staff, trạng thái tài khoản và phân quyền theo vai trò.
          </Typography.Text>
        </div>
      </div>

      <Space wrap className="admin-user-filters">
        <Input.Search
          allowClear
          className="admin-user-search"
          value={searchInput}
          placeholder="Tên, username, email hoặc số điện thoại"
          enterButton={<SearchOutlined />}
          onChange={(event) => setSearchInput(event.target.value)}
          onSearch={(value) => {
            setKeyword(value.trim() || undefined);
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="admin-user-filter-select"
          value={role}
          placeholder="Tất cả role"
          options={Object.values(UserRole).map((value) => ({ value, label: value }))}
          onChange={(value) => {
            setRole(value);
            setPage(1);
          }}
        />
        <Select
          allowClear
          className="admin-user-filter-select"
          value={status}
          placeholder="Tất cả trạng thái"
          options={Object.values(UserStatus).map((value) => ({ value, label: statusLabel[value] }))}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={users}
        pagination={false}
        scroll={{ x: 1120 }}
      />
      {meta && (meta.totalPages ?? 1) > 1 ? (
        <Pagination
          className="admin-table-pagination"
          current={page}
          pageSize={10}
          total={meta.total}
          showSizeChanger={false}
          onChange={setPage}
        />
      ) : null}

      <Modal
        title={`Đổi role cho ${roleUser?.fullName ?? ''}`}
        open={Boolean(roleUser)}
        footer={null}
        destroyOnHidden
        onCancel={() => setRoleUser(null)}
      >
        <Form<RoleFormValues> form={roleForm} layout="vertical" onFinish={saveRole}>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={Object.values(UserRole).map((value) => ({ value, label: value }))} />
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={() => setRoleUser(null)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu role
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Modal
        title={`Phân quyền cho ${permissionsUser?.fullName ?? ''}`}
        open={Boolean(permissionsUser)}
        footer={null}
        destroyOnHidden
        onCancel={() => setPermissionsUser(null)}
      >
        <Form<PermissionsFormValues> form={permissionsForm} layout="vertical" onFinish={savePermissions}>
          <Form.Item name="permissions" label="Quyền của STAFF" rules={[{ required: true, type: 'array' }]}>
            <Checkbox.Group className="admin-permission-options">
              {Object.values(Permission).map((permission) => (
                <Checkbox key={permission} value={permission}>
                  {permission}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>
          <div className="modal-form-actions">
            <Space>
              <Button onClick={() => setPermissionsUser(null)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={isSaving}>
                Lưu quyền
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </section>
  );
};
