import { TransformFnParams } from 'class-transformer';

/**
 * Converts the only two supported query/body string representations to a
 * boolean. Invalid values are deliberately returned unchanged so
 * class-validator's @IsBoolean() can reject them instead of treating every
 * typo as false.
 */
export const toOptionalBoolean = ({ value }: TransformFnParams): unknown => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return value;
};
