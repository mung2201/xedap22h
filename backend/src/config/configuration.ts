const toBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
};

const toCookieSameSite = (
  value: string | undefined,
): 'lax' | 'strict' | 'none' => {
  const normalized = value?.toLowerCase();

  if (normalized === 'strict' || normalized === 'none') {
    return normalized;
  }

  return 'lax';
};

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, '');

export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    backendUrl: trimTrailingSlash(
      process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
    ),
    frontendUrl: trimTrailingSlash(
      process.env.FRONTEND_URL ?? 'http://localhost:5173',
    ),
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => trimTrailingSlash(origin.trim()))
      .filter(Boolean),
    cookieSecure: toBoolean(process.env.COOKIE_SECURE),
    cookieSameSite: toCookieSameSite(process.env.COOKIE_SAME_SITE),
  },
  database: {
    mongoUri: process.env.MONGODB_URI,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  security: {
    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),
  },
  passwordReset: {
    expiresInMinutes: Number(process.env.RESET_PASSWORD_EXPIRES_MINUTES ?? 60),
  },
  checkout: {
    standardShippingFee: Number(process.env.SHIPPING_STANDARD_FEE ?? 30_000),
    expressShippingFee: Number(process.env.SHIPPING_EXPRESS_FEE ?? 50_000),
    freeShippingMinOrder: Number(process.env.FREE_SHIPPING_MIN_ORDER ?? 0),
  },
  payment: {
    onlineProvider: process.env.ONLINE_PAYMENT_PROVIDER ?? 'QR_TRANSFER',
    payos: {
      clientId: process.env.PAYOS_CLIENT_ID ?? '',
      apiKey: process.env.PAYOS_API_KEY ?? '',
      checksumKey: process.env.PAYOS_CHECKSUM_KEY ?? '',
      expiryMinutes: Number(process.env.PAYOS_PAYMENT_EXPIRES_MINUTES ?? 30),
    },
    momo: {
      environment: process.env.MOMO_ENVIRONMENT ?? 'sandbox',
      partnerCode: process.env.MOMO_PARTNER_CODE ?? '',
      accessKey: process.env.MOMO_ACCESS_KEY ?? '',
      secretKey: process.env.MOMO_SECRET_KEY ?? '',
      ipnUrl: process.env.MOMO_IPN_URL ?? '',
    },
    qr: {
      mode: process.env.PAYMENT_QR_MODE ?? 'SANDBOX',
      bankBin: process.env.PAYMENT_QR_BANK_BIN ?? '',
      accountNumber: process.env.PAYMENT_QR_ACCOUNT_NO ?? '',
      accountName: process.env.PAYMENT_QR_ACCOUNT_NAME ?? '',
      template: process.env.PAYMENT_QR_TEMPLATE ?? 'compact2',
      transferContentPrefix:
        process.env.PAYMENT_QR_CONTENT_PREFIX ?? 'BIKESTORE',
    },
  },
  inventory: {
    lowStockThreshold: Number(process.env.LOW_STOCK_THRESHOLD ?? 5),
  },
  uploads: {
    directory: process.env.UPLOAD_DIR ?? 'uploads',
    maxImageSizeMb: Number(process.env.UPLOAD_MAX_IMAGE_SIZE_MB ?? 5),
  },
  mail: {
    previewMode: toBoolean(process.env.MAIL_PREVIEW_MODE, true),
    from: process.env.MAIL_FROM ?? 'XeDap22h <no-reply@example.com>',
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: toBoolean(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
  },
});
