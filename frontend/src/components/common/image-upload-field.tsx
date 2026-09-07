import { LoadingOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Image, Input, Space, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useState } from 'react';
import { uploadService } from '../../api/services/upload.service';
import { getErrorMessage } from '../../utils/error-message';

interface ImageUploadFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  uploadKind?: 'avatar' | 'management';
  previewAlt?: string;
  placeholder?: string;
}

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

export const ImageUploadField = ({
  value,
  onChange,
  uploadKind = 'management',
  previewAlt = 'Ảnh xem trước',
  placeholder = 'Dán URL ảnh hoặc tải ảnh lên',
}: ImageUploadFieldProps) => {
  const [isUploading, setIsUploading] = useState(false);

  const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
    if (!acceptedTypes.includes(file.type)) {
      message.error('Chỉ nhận ảnh JPEG, PNG hoặc WebP.');
      return Upload.LIST_IGNORE;
    }

    const maxSize = uploadKind === 'avatar' ? 2 : 5;
    if (file.size > maxSize * 1024 * 1024) {
      message.error(`Ảnh tối đa ${maxSize} MB.`);
      return Upload.LIST_IGNORE;
    }

    setIsUploading(true);
    try {
      const image =
        uploadKind === 'avatar'
          ? await uploadService.uploadAvatar(file)
          : await uploadService.uploadManagementImage(file);
      onChange?.(image.url);
      message.success('Đã tải ảnh lên.');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setIsUploading(false);
    }

    return Upload.LIST_IGNORE;
  };

  return (
    <Space direction="vertical" className="image-upload-field full-width" size="small">
      <Space.Compact className="full-width">
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
        />
        <Upload
          accept="image/jpeg,image/png,image/webp"
          showUploadList={false}
          beforeUpload={beforeUpload}
        >
          <Button icon={isUploading ? <LoadingOutlined /> : <UploadOutlined />} loading={isUploading}>
            Tải ảnh
          </Button>
        </Upload>
      </Space.Compact>
      {value ? (
        <Image
          className="image-upload-field-preview"
          width={112}
          height={76}
          src={value}
          alt={previewAlt}
          preview
        />
      ) : null}
    </Space>
  );
};
