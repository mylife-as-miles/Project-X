import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

let storage: Storage | null = null;
const LOCAL_CACHE_DIR = path.resolve('.gcs_cache');

export interface GcsUploadResult {
  url: string;
  persistedToGcs: boolean;
  provider: 'Google Cloud Storage' | 'Local development cache';
  bucketName?: string;
  destinationPath: string;
  sizeBytes: number;
}

export function getGcsStorage(): Storage | null {
  if (storage) return storage;

  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCS_BUCKET_NAME) {
      storage = new Storage();
      return storage;
    }
  } catch (err) {
    console.warn('[GCS] Google Cloud Storage init notice (using local dev cache if unconfigured):', err);
  }
  return null;
}

export async function uploadArtifactToGcs(
  destinationPath: string, 
  content: string | Buffer, 
  contentType: string = 'application/json'
): Promise<GcsUploadResult> {
  const bucketName = process.env.GCS_BUCKET_NAME;
  const gcs = getGcsStorage();
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  const sizeBytes = buffer.length;

  if (gcs && bucketName) {
    try {
      const bucket = gcs.bucket(bucketName);
      const file = bucket.file(destinationPath);
      await file.save(buffer, {
        contentType,
        metadata: {
          project: 'Project X',
          system: 'Agentic Script-to-Screen QA',
          uploadedAt: new Date().toISOString(),
        },
      });
      return {
        url: `gs://${bucketName}/${destinationPath}`,
        persistedToGcs: true,
        provider: 'Google Cloud Storage',
        bucketName,
        destinationPath,
        sizeBytes,
      };
    } catch (err) {
      console.warn(`[GCS] Upload failed for gs://${bucketName}/${destinationPath}:`, err);
    }
  }

  // Local development cache fallback (never masquerade as genuine GCS)
  try {
    const localFilePath = path.join(LOCAL_CACHE_DIR, destinationPath);
    const dir = path.dirname(localFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localFilePath, buffer);
    return {
      url: `file://${localFilePath.replace(/\\/g, '/')}`,
      persistedToGcs: false,
      provider: 'Local development cache',
      destinationPath,
      sizeBytes,
    };
  } catch (e) {
    console.warn('[GCS Local Fallback] Could not write cache file:', e);
    return {
      url: `unpersisted://${destinationPath}`,
      persistedToGcs: false,
      provider: 'Local development cache',
      destinationPath,
      sizeBytes: 0,
    };
  }
}
