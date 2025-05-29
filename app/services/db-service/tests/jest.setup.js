const originalConsole = { ...console };

beforeAll(() => {
    console.log = jest.fn().mockImplementation(() => {});
    console.error = jest.fn().mockImplementation(() => {});
    console.info = jest.fn().mockImplementation(() => {});
    console.warn = jest.fn().mockImplementation(() => {});
    console.debug = jest.fn().mockImplementation(() => {});
});

afterAll(() => {
    Object.assign(console, originalConsole);
});

// Environment variables for testing
process.env.DATABASE_URL = "file:./test.db";
process.env.PORT = "4001";
process.env.NODE_ENV = "test";
process.env.AUTH_SERVICE_URL = "http://localhost:3000";
process.env.SMTP_HOST = "test-smtp.example.com";
process.env.SMTP_PORT = "587";
process.env.SMTP_USER = "test@example.com";
process.env.SMTP_PASS = "test-password";
process.env.FROM_EMAIL = "test@example.com";
process.env.APP_NAME = "Test DB Service";
process.env.DISABLE_RATE_LIMIT = "true";

beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
});

afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
});

const realSetImmediate = global.setImmediate;
global.setImmediate = function (callback) {
    callback();
};

afterAll(() => {
    global.setImmediate = realSetImmediate;
});
