import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("formats logs with timestamp, level, and context", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("TestContext", "Test message", { key: "value" });

    expect(spy).toHaveBeenCalledTimes(1);
    const logOutput = spy.mock.calls[0][0];
    expect(logOutput).toContain("[INFO]");
    expect(logOutput).toContain("[TestContext]");
    expect(logOutput).toContain("Test message");

    const payload = spy.mock.calls[0][1];
    expect(payload).toBe('{"key":"value"}');

    spy.mockRestore();
  });

  it("redacts sensitive fields such as password, token, and secret", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.warn("AuthContext", "User registration payload", {
      email: "user@example.com",
      password: "secretPassword123!",
      confirmPassword: "secretPassword123!",
      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      nested: {
        token: "123456",
        safeKey: "safeValue",
      },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const payloadJson = spy.mock.calls[0][1];
    const parsed = JSON.parse(payloadJson as string);

    expect(parsed.email).toBe("user@example.com");
    expect(parsed.password).toBe("[REDACTED]");
    expect(parsed.confirmPassword).toBe("[REDACTED]");
    expect(parsed.accessToken).toBe("[REDACTED]");
    expect(parsed.nested.token).toBe("[REDACTED]");
    expect(parsed.nested.safeKey).toBe("safeValue");

    spy.mockRestore();
  });

  it("prints debug logs in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.debug("DebugContext", "Debug message in dev mode");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("[DEBUG]");

    spy.mockRestore();
  });

  it("suppresses debug logs in production mode while allowing info, warn, and error", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.debug("DebugContext", "Debug message should be suppressed");
    expect(spy).toHaveBeenCalledTimes(0);

    logger.info("InfoContext", "Info message in production");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("[INFO]");

    logger.warn("WarnContext", "Warn message in production");
    expect(spy).toHaveBeenCalledTimes(2);

    logger.error("ErrorContext", "Error message in production");
    expect(spy).toHaveBeenCalledTimes(3);

    spy.mockRestore();
  });

  it("handles empty data gracefully", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.error("ErrorContext", "Database error occurred");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("[ERROR]");
    expect(spy.mock.calls[0][0]).toContain("Database error occurred");
    expect(spy.mock.calls[0][1]).toBeUndefined();

    spy.mockRestore();
  });
});
