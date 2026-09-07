import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  MONGODB_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),
  FRONTEND_URL: Joi.string().uri().required(),
  BACKEND_URL: Joi.string().uri().optional(),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  COOKIE_SECURE: Joi.boolean().default(false),
  COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),

  RESET_PASSWORD_EXPIRES_MINUTES: Joi.number().integer().min(5).max(1440).default(60),

  SHIPPING_STANDARD_FEE: Joi.number().integer().min(0).default(30000),
  SHIPPING_EXPRESS_FEE: Joi.number().integer().min(0).default(50000),
  FREE_SHIPPING_MIN_ORDER: Joi.number().integer().min(0).default(0),
  LOW_STOCK_THRESHOLD: Joi.number().integer().min(0).default(5),

  // SANDBOX is safe for local testing. VIETQR creates a real bank-transfer
  // QR and requires the public receiving-account details below.
  PAYMENT_QR_MODE: Joi.string().valid('SANDBOX', 'VIETQR').default('SANDBOX'),
  PAYMENT_QR_BANK_BIN: Joi.string().trim().pattern(/^\d{6}$/).allow('').optional(),
  PAYMENT_QR_ACCOUNT_NO: Joi.string().trim().pattern(/^\d+$/).allow('').optional(),
  PAYMENT_QR_ACCOUNT_NAME: Joi.string().trim().max(120).allow('').optional(),
  PAYMENT_QR_TEMPLATE: Joi.string().trim().max(40).default('compact2'),
  PAYMENT_QR_CONTENT_PREFIX: Joi.string().trim().min(2).max(20).default('BIKESTORE'),

  // Upload directory is local-only by default. Use object storage or Cloudinary
  // behind the same module when deploying across multiple application instances.
  UPLOAD_DIR: Joi.string().trim().min(1).max(240).default('uploads'),
  UPLOAD_MAX_IMAGE_SIZE_MB: Joi.number().integer().min(1).max(10).default(5),

  MAIL_PREVIEW_MODE: Joi.boolean().default(true),
  MAIL_FROM: Joi.string().required(),
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),

  SEED_ADMIN_PASSWORD: Joi.string().min(8).optional(),
  SEED_STAFF_PASSWORD: Joi.string().min(8).optional(),
  SEED_CUSTOMER_PASSWORD: Joi.string().min(8).optional(),
}).custom((value, helpers) => {
  if (value.NODE_ENV === 'production' && !value.COOKIE_SECURE) {
    return helpers.error('any.invalid');
  }

  if (value.COOKIE_SAME_SITE === 'none' && !value.COOKIE_SECURE) {
    return helpers.error('any.invalid');
  }

  if (value.NODE_ENV === 'production' && value.MAIL_PREVIEW_MODE) {
    return helpers.error('any.invalid');
  }

  if (
    value.NODE_ENV === 'production' &&
    (!value.SMTP_HOST || !value.SMTP_USER || !value.SMTP_PASSWORD)
  ) {
    return helpers.error('any.invalid');
  }

  if (
    value.PAYMENT_QR_MODE === 'VIETQR' &&
    (!value.PAYMENT_QR_BANK_BIN ||
      !value.PAYMENT_QR_ACCOUNT_NO ||
      !value.PAYMENT_QR_ACCOUNT_NAME)
  ) {
    return helpers.error('any.invalid');
  }

  return value;
});
