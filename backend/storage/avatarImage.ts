export interface AvatarImageInfo {
  extension: "webp" | "png" | "jpg";
  contentType: "image/webp" | "image/png" | "image/jpeg";
}

const startsWithBytes = (buffer: Buffer, signature: number[]): boolean =>
  signature.every((byte, index) => buffer[index] === byte);

export function detectAvatarImage(buffer: Buffer): AvatarImageInfo | null {
  if (buffer.length < 4) return null;

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }

  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: "png", contentType: "image/png" };
  }

  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }

  return null;
}
