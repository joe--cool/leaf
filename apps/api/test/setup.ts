process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '4000';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret_1234567890';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://leaf:leaf@localhost:5432/leaf';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
