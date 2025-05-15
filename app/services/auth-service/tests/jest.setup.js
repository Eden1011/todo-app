const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn().mockImplementation(() => { });
  console.error = jest.fn().mockImplementation(() => { });
  console.info = jest.fn().mockImplementation(() => { });
  console.warn = jest.fn().mockImplementation(() => { });
  console.debug = jest.fn().mockImplementation(() => { });
});

afterAll(() => {
  Object.assign(console, originalConsole);
}); require('dotenv').config({ path: '.env.test' });

process.env.ACCESS_TOKEN_SECRET = 'test-access-token-secret';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
process.env.DATABASE_URL = 'file:./test.db';
process.env.ACCESS_TOKEN_EXPIRATION = '15m';
process.env.REFRESH_TOKEN_EXPIRATION = '7d';
process.env.EMAIL_EXPIRATION = '1d';
process.env.SMTP_HOST = 'test-smtp.example.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';
process.env.FROM_EMAIL = 'test@example.com';
process.env.APP_NAME = 'Test App';
process.env.APP_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = "file:./test-integration.db";

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

const realSetImmediate = global.setImmediate;
global.setImmediate = function(callback) {
  callback();
};

afterAll(() => {
  global.setImmediate = realSetImmediate;
});
