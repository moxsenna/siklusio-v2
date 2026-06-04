import { Hono } from "hono";
import { Buffer } from "node:buffer";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { type Env } from "../env";
import { requireUser } from "../middleware/auth";
import {
  detectAvatarImage,
  isAvatarImageWithinPolicy,
  sanitizeAvatarImage,
} from "../storage/avatarImage";

const router = new Hono<{ Bindings: Env }>();

// API Route for Avatar Upload to Cloudflare R2
router.post("/api/upload-avatar", async (c) => {
  console.log("--> [BACKEND] Received request /api/upload-avatar");
  try {
    const auth = await requireUser(c);
    if (!auth) {
      return c.json({ error: "Missing or invalid session" }, 401);
    }

    const { base64 } = await c.req.json();
    if (!base64 || typeof base64 !== "string") {
      return c.json({ error: "Missing or invalid 'base64' field" }, 400);
    }

    // Validate size (base64 is ~33% larger than raw bytes)
    const estimatedBytes = Math.ceil(base64.length * 0.75);
    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
    if (estimatedBytes > MAX_BYTES) {
      return c.json({ error: "Ukuran gambar maksimal 5 MB" }, 400);
    }

    const buffer = Buffer.from(base64, "base64");
    const avatarImage = detectAvatarImage(buffer);
    if (!avatarImage) {
      return c.json({ error: "Format avatar tidak didukung. Gunakan WebP, PNG, atau JPEG." }, 400);
    }

    if (!isAvatarImageWithinPolicy(avatarImage)) {
      return c.json({ error: "Dimensi avatar maksimal 2048x2048 piksel." }, 400);
    }

    const bucketName = c.env.R2_BUCKET_NAME || "siklusio-avatars";
    const publicUrl = (c.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

    if (!publicUrl) {
      return c.json({ error: "R2_PUBLIC_URL is not configured" }, 500);
    }

    const sanitizedBuffer = sanitizeAvatarImage(buffer, avatarImage);
    const key = `avatars/${auth.user.id}/${Date.now()}.${avatarImage.extension}`;

    // Setup R2 client using env variables from context c.env
    const accountId = c.env.R2_ACCOUNT_ID;
    const accessKeyId = c.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = c.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return c.json(
        {
          error: "Missing R2 configuration (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
        },
        500,
      );
    }

    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: sanitizedBuffer,
        ContentType: avatarImage.contentType,
      }),
    );

    const url = `${publicUrl}/${key}`;
    console.log("<-- [BACKEND] Avatar uploaded successfully", {
      contentType: avatarImage.contentType,
    });
    return c.json({ url });
  } catch (error: any) {
    console.error("<-- [BACKEND] Avatar upload error:", error.stack || error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Gagal mengunggah avatar",
      },
      500,
    );
  }
});

export default router;
