// Vercel Blob storage helpers — replaces proprietary S3 proxy.
// Uses @vercel/blob SDK directly. BLOB_READ_WRITE_TOKEN must be set in env.

import { put, del, list } from "@vercel/blob";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const body = data instanceof Uint8Array && !Buffer.isBuffer(data)
    ? Buffer.from(data)
    : data;

  const blob = await put(key, body, {
    access: "public",
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return { key, url: blob.url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  // Vercel Blob public URLs are stable — construct from blob store base URL
  // The actual URL is returned on put; this helper returns the key for lookup
  return { key, url: key };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  // Vercel Blob public blobs don't require signed URLs — public URL is direct.
  // If private access is needed in future, use @vercel/blob `getDownloadUrl`.
  const key = normalizeKey(relKey);
  const { blobs } = await list({ prefix: key, token: process.env.BLOB_READ_WRITE_TOKEN });
  if (blobs.length === 0) throw new Error(`Blob not found: ${key}`);
  return blobs[0].url;
}

export async function storageDelete(relKey: string): Promise<void> {
  const key = normalizeKey(relKey);
  await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
