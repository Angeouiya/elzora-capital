-- CI-only actor used to exercise four-eyes controls. Never applied by production scripts.
INSERT INTO "User" (
  "id", "email", "phone", "password", "firstName", "lastName", "role",
  "kycStatus", "accountType", "country", "language", "avatar", "twoFactor",
  "emailVerified", "createdAt", "updatedAt", "verificationCode"
) VALUES (
  'ci-admin-secondary',
  'admin2@nexora.ci',
  NULL,
  '$2b$10$6IIIqHa/4US7C6QVsyQBOO2ssY9uaOZFNswHF/yK3.5zJIbGZbt3u',
  'Awa',
  'Traoré',
  'ADMIN',
  'VERIFIED',
  'INDIVIDUAL',
  'CI',
  'fr',
  NULL,
  0,
  1,
  1789560000000,
  1789560000000,
  NULL
);
