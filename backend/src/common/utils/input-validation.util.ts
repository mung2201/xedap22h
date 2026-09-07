import { BadRequestException } from '@nestjs/common';

/**
 * class-validator's IsOptional also skips validation for null. PATCH DTOs use
 * it heavily, so reject null explicitly unless a service documents it as a
 * deliberate clear operation for a specific field.
 */
export const assertNoUnexpectedNull = (
  input: object,
  nullableFields: readonly string[] = [],
): void => {
  const allowedFields = new Set(nullableFields);

  for (const [field, value] of Object.entries(input)) {
    if (value === null && !allowedFields.has(field)) {
      throw new BadRequestException(`${field} cannot be null.`);
    }
  }
};
