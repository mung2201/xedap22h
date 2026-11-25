import { Input, Typography } from 'antd';
import type { InputProps } from 'antd';
import { useState } from 'react';

interface PhoneNumberInputProps extends Omit<InputProps, 'value' | 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
}

export const PhoneNumberInput = ({ value = '', onChange, id, ...props }: PhoneNumberInputProps) => {
  const [inputError, setInputError] = useState('');
  const hintId = id ? `${id}-input-hint` : undefined;

  return <>
    <Input
      {...props}
      id={id}
      value={value}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="0912345678"
      maxLength={10}
      aria-describedby={[props['aria-describedby'], inputError ? hintId : undefined].filter(Boolean).join(' ') || undefined}
      onChange={(event) => {
        const next = event.target.value;
        if (/^[0-9]{0,10}$/.test(next)) {
          setInputError('');
          onChange?.(next);
        } else {
          setInputError('Chỉ nhập các chữ số từ 0 đến 9, tối đa 10 chữ số.');
        }
      }}
      onPaste={(event) => {
        const pasted = event.clipboardData.getData('text');
        const input = event.currentTarget;
        const next = value.slice(0, input.selectionStart ?? value.length) + pasted
          + value.slice(input.selectionEnd ?? value.length);
        // Reject the whole paste; silently truncating could save a different phone number.
        if (!/^[0-9]{0,10}$/.test(next)) {
          event.preventDefault();
          setInputError('Số vừa dán không hợp lệ. Chỉ dán tối đa 10 chữ số, không kèm chữ hoặc ký tự khác.');
        } else {
          setInputError('');
        }
      }}
    />
    {inputError && <Typography.Text id={hintId} type="danger" role="status">{inputError}</Typography.Text>}
  </>;
};
