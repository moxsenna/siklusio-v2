import test from "node:test";
import assert from "node:assert/strict";
import { resolveApiBaseUrl } from "./apiBaseUrl";

test("resolveApiBaseUrl trims configured API base URL trailing slashes", () => {
  assert.equal(
    resolveApiBaseUrl({
      configured: "https://api.siklusio.web.id///",
      debuggerHost: "",
      isDevelopment: false,
    }),
    "https://api.siklusio.web.id",
  );
});

test("resolveApiBaseUrl falls back to Expo debugger host only in development", () => {
  assert.equal(
    resolveApiBaseUrl({
      configured: "",
      debuggerHost: "192.168.1.20:8081",
      isDevelopment: true,
    }),
    "http://192.168.1.20:3000",
  );
});

test("resolveApiBaseUrl allows localhost fallback only in development", () => {
  assert.equal(
    resolveApiBaseUrl({
      configured: "",
      debuggerHost: "",
      isDevelopment: true,
    }),
    "http://localhost:3000",
  );
});

test("resolveApiBaseUrl rejects missing production API base URL", () => {
  assert.throws(
    () =>
      resolveApiBaseUrl({
        configured: "",
        debuggerHost: "192.168.1.20:8081",
        isDevelopment: false,
      }),
    /EXPO_PUBLIC_API_BASE_URL/,
  );
});

test("resolveApiBaseUrl rejects invalid configured API base URL", () => {
  assert.throws(
    () =>
      resolveApiBaseUrl({
        configured: "localhost:3000",
        debuggerHost: "",
        isDevelopment: false,
      }),
    /valid absolute URL/,
  );
});
