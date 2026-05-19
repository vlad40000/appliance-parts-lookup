export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  databaseUrlSecondary: process.env.DATABASE_URL_SECONDARY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  blobToken: process.env.BLOB_READ_WRITE_TOKEN ?? "",
  neonAuthUrl: process.env.NEON_AUTH_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
