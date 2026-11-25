/** Normalize one Vietnamese mobile number; never accept a list of contacts. */
export function normalizeVietnameseMobile(value: string): string | undefined {
  const compact = value.trim().replace(/[\s().-]/g, '');
  const local = compact.replace(/^(?:\+84|84)/, '0');
  return /^0[35789]\d{8}$/.test(local) ? local : undefined;
}
