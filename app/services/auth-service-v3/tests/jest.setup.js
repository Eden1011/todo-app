// Create silent versions of console methods for testing
const originalConsole = { ...console };

beforeAll(() => {
  // Silence all console methods
  console.log = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  // Restore original console methods after all tests
  Object.assign(console, originalConsole);
});

require('dotenv').config({ path: '.env.test' });

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

// Handle timing issues with timers
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

// Patch setImmediate to execute immediately during tests
const realSetImmediate = global.setImmediate;
global.setImmediate = function(callback) {
  callback();
};

// Restore original setImmediate after tests
afterAll(() => {
  global.setImmediate = realSetImmediate;
});
