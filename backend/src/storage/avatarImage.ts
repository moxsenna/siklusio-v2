export interface AvatarImageInfo {
  extension: "webp" | "png" | "jpg";
  contentType: "image/webp" | "image/png" | "image/jpeg";
  width?: number;
  height?: number;
}

export const MAX_AVATAR_DIMENSION = 2048;
export const MAX_AVATAR_PIXELS = MAX_AVATAR_DIMENSION * MAX_AVATAR_DIMENSION;

const startsWithBytes = (buffer: Buffer, signature: number[]): boolean =>
  signature.every((byte, index) => buffer[index] === byte);

function hasSafeDimensions(
  image: AvatarImageInfo | null,
): image is AvatarImageInfo & { width: number; height: number } {
  return Boolean(
    image &&
    Number.isInteger(image.width) &&
    Number.isInteger(image.height) &&
    image.width! > 0 &&
    image.height! > 0,
  );
}

function readPngDimensions(buffer: Buffer): Pick<AvatarImageInfo, "width" | "height"> | null {
  if (buffer.length < 24 || buffer.toString("ascii", 12, 16) !== "IHDR") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegDimensions(buffer: Buffer): Pick<AvatarImageInfo, "width" | "height"> | null {
  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;

    if (
      marker === 0xd8 ||
      marker === 0xd9 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      continue;
    }

    if (offset + 2 > buffer.length) return null;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      if (segmentLength < 7) return null;
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += segmentLength;
  }

  return null;
}

function readWebpDimensions(buffer: Buffer): Pick<AvatarImageInfo, "width" | "height"> | null {
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (dataOffset + chunkSize > buffer.length) return null;

    if (chunkType === "VP8X" && chunkSize >= 10) {
      return {
        width: buffer.readUIntLE(dataOffset + 4, 3) + 1,
        height: buffer.readUIntLE(dataOffset + 7, 3) + 1,
      };
    }

    if (chunkType === "VP8 " && chunkSize >= 10) {
      const hasStartCode =
        buffer[dataOffset + 3] === 0x9d &&
        buffer[dataOffset + 4] === 0x01 &&
        buffer[dataOffset + 5] === 0x2a;
      if (!hasStartCode) return null;
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    if (chunkType === "VP8L" && chunkSize >= 5 && buffer[dataOffset] === 0x2f) {
      const b1 = buffer[dataOffset + 1];
      const b2 = buffer[dataOffset + 2];
      const b3 = buffer[dataOffset + 3];
      const b4 = buffer[dataOffset + 4];
      return {
        width: 1 + (b1 | ((b2 & 0x3f) << 8)),
        height: 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10)),
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  return null;
}

function sanitizePng(buffer: Buffer): Buffer {
  if (!startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return buffer;

  const chunks: Buffer[] = [buffer.subarray(0, 8)];
  let offset = 8;

  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > buffer.length) return buffer;

    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const isCritical = type[0] === type[0].toUpperCase();
    if (isCritical) chunks.push(buffer.subarray(offset, chunkEnd));

    offset = chunkEnd;
    if (type === "IEND") break;
  }

  return Buffer.concat(chunks);
}

function sanitizeJpeg(buffer: Buffer): Buffer {
  if (!startsWithBytes(buffer, [0xff, 0xd8])) return buffer;

  const chunks: Buffer[] = [buffer.subarray(0, 2)];
  let offset = 2;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      chunks.push(buffer.subarray(offset));
      break;
    }

    let markerOffset = offset;
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xda) {
      chunks.push(buffer.subarray(markerOffset));
      break;
    }

    if (marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      chunks.push(buffer.subarray(markerOffset, offset));
      continue;
    }

    if (offset + 2 > buffer.length) return buffer;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return buffer;

    const segment = buffer.subarray(markerOffset, offset + segmentLength);
    const isMetadata = marker === 0xfe || (marker >= 0xe1 && marker <= 0xef);
    if (!isMetadata) chunks.push(segment);

    offset += segmentLength;
  }

  return Buffer.concat(chunks);
}

function sanitizeWebp(buffer: Buffer): Buffer {
  if (
    buffer.length < 12 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return buffer;
  }

  const chunks: Buffer[] = [];
  let offset = 12;

  while (offset + 8 <= buffer.length) {
    const chunkType = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    const paddedEnd = dataOffset + chunkSize + (chunkSize % 2);
    if (dataOffset + chunkSize > buffer.length || paddedEnd > buffer.length) return buffer;

    if (!["EXIF", "ICCP", "XMP "].includes(chunkType)) {
      const chunk = Buffer.from(buffer.subarray(offset, paddedEnd));
      if (chunkType === "VP8X" && chunk.length >= 18) {
        chunk[8] = chunk[8] & ~0x2c;
      }
      chunks.push(chunk);
    }

    offset = paddedEnd;
  }

  const riffSize = 4 + chunks.reduce((total, chunk) => total + chunk.length, 0);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(riffSize, 4);
  header.write("WEBP", 8, "ascii");
  return Buffer.concat([header, ...chunks]);
}

export function sanitizeAvatarImage(buffer: Buffer, image: AvatarImageInfo | null): Buffer {
  if (!image) return buffer;
  if (image.extension === "png") return sanitizePng(buffer);
  if (image.extension === "jpg") return sanitizeJpeg(buffer);
  if (image.extension === "webp") return sanitizeWebp(buffer);
  return buffer;
}

export function isAvatarImageWithinPolicy(image: AvatarImageInfo | null): boolean {
  if (!hasSafeDimensions(image)) return false;
  if (image.width > MAX_AVATAR_DIMENSION || image.height > MAX_AVATAR_DIMENSION) return false;
  return image.width * image.height <= MAX_AVATAR_PIXELS;
}

export function detectAvatarImage(buffer: Buffer): AvatarImageInfo | null {
  if (buffer.length < 4) return null;

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    const dimensions = readWebpDimensions(buffer);
    return { extension: "webp", contentType: "image/webp", ...(dimensions || {}) };
  }

  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    const dimensions = readPngDimensions(buffer);
    return { extension: "png", contentType: "image/png", ...(dimensions || {}) };
  }

  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    const dimensions = readJpegDimensions(buffer);
    return { extension: "jpg", contentType: "image/jpeg", ...(dimensions || {}) };
  }

  return null;
}
