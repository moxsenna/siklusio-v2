import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_AVATAR_DIMENSION,
  detectAvatarImage,
  isAvatarImageWithinPolicy,
  sanitizeAvatarImage,
} from "./avatarImage";

function pngWithDimensions(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(33);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 6;
  return buffer;
}

function jpegWithDimensions(width: number, height: number): Buffer {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

test("detectAvatarImage recognizes WebP, PNG, and JPEG signatures", () => {
  const webp = Buffer.from("524946460000000057454250", "hex");
  const png = pngWithDimensions(320, 240);
  const jpeg = jpegWithDimensions(640, 480);

  assert.deepEqual(detectAvatarImage(webp), { extension: "webp", contentType: "image/webp" });
  assert.deepEqual(detectAvatarImage(png), { extension: "png", contentType: "image/png", width: 320, height: 240 });
  assert.deepEqual(detectAvatarImage(jpeg), { extension: "jpg", contentType: "image/jpeg", width: 640, height: 480 });
});

test("detectAvatarImage rejects non-image bytes", () => {
  assert.equal(detectAvatarImage(Buffer.from("not an image")), null);
});

test("isAvatarImageWithinPolicy rejects oversized dimensions", () => {
  const avatarImage = detectAvatarImage(pngWithDimensions(MAX_AVATAR_DIMENSION + 1, 256));

  assert.equal(avatarImage?.extension, "png");
  assert.equal(isAvatarImageWithinPolicy(avatarImage), false);
});

function pngChunk(type: string, data: Buffer): Buffer {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, "ascii");
  data.copy(chunk, 8);
  return chunk;
}

test("sanitizeAvatarImage strips PNG ancillary metadata chunks", () => {
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(320, 0);
  ihdrData.writeUInt32BE(240, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  const png = Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", ihdrData),
    pngChunk("tEXt", Buffer.from("Author\0Sensitive Name")),
    pngChunk("IDAT", Buffer.from([0x78, 0x9c, 0x03, 0x00])),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  const image = detectAvatarImage(png);

  const sanitized = sanitizeAvatarImage(png, image);

  assert.equal(sanitized.includes(Buffer.from("Sensitive Name")), false);
  assert.notEqual(sanitized.indexOf(Buffer.from("IHDR")), -1);
  assert.notEqual(sanitized.indexOf(Buffer.from("IDAT")), -1);
});