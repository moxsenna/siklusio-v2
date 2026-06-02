import test from "node:test";
import assert from "node:assert/strict";
import { detectAvatarImage } from "./avatarImage";

test("detectAvatarImage recognizes WebP, PNG, and JPEG signatures", () => {
  const webp = Buffer.from("524946460000000057454250", "hex");
  const png = Buffer.from("89504e470d0a1a0a0000000d", "hex");
  const jpeg = Buffer.from("ffd8ffe000104a464946", "hex");

  assert.deepEqual(detectAvatarImage(webp), { extension: "webp", contentType: "image/webp" });
  assert.deepEqual(detectAvatarImage(png), { extension: "png", contentType: "image/png" });
  assert.deepEqual(detectAvatarImage(jpeg), { extension: "jpg", contentType: "image/jpeg" });
});

test("detectAvatarImage rejects non-image bytes", () => {
  assert.equal(detectAvatarImage(Buffer.from("not an image")), null);
});
