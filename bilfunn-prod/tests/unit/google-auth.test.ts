import { expect, it } from "vitest";
import { googleIdentity, safeLoginNext } from "../../src/lib/google-auth";
it("validates Google identity claims", () => {
  const p = {
    sub: "subject",
    email: "USER@example.test",
    email_verified: true,
    nonce: "expected",
  };
  expect(googleIdentity(p, "expected").email).toBe("user@example.test");
  expect(() =>
    googleIdentity({ ...p, email_verified: false }, "expected"),
  ).toThrow();
  expect(() => googleIdentity(p, "wrong")).toThrow();
  expect(() => googleIdentity({ ...p, sub: "" }, "expected")).toThrow();
});
it("restricts post-login destinations", () => {
  expect(safeLoginNext("/kasse?nr=AB12345")).toBe("/kasse?nr=AB12345");
  for (const next of [
    "https://evil.test",
    "//evil.test",
    "/konto\\evil",
    "/account",
    "/konto\n",
  ]) {
    expect(safeLoginNext(next)).toBe("/konto");
  }
});
