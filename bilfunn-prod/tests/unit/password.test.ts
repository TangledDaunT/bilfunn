import { describe, expect, it } from "vitest";
import { scryptSync } from "node:crypto";
import { verifyPassword } from "../../src/lib/password";

describe("demo password verification", () => {
  it("accepts only the password matching a well-formed scrypt hash", async () => {
    const salt = "qM0w9g8gCZV5G0P9oAqv3A";
    const encoded = `scrypt$${salt}$${scryptSync("correct horse battery staple", salt, 64).toString("hex")}`;
    await expect(
      verifyPassword("correct horse battery staple", encoded),
    ).resolves.toBe(true);
    await expect(verifyPassword("wrong password", encoded)).resolves.toBe(false);
    await expect(verifyPassword("anything", "malformed")).resolves.toBe(false);
  });
});
