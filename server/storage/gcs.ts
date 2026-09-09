import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

let storage: Storage | null = null;
const LOCAL_CACHE_DIR = path.resolve('.gcs_cache');

export function getGcsStorage(): Storage | null {
  if (storage) return storage;

  try {
    // If credentials or project is available in environment
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCS_BUCKET_NAME) {
      storage = new Storage();
      return storage;
    }
  } catch (err) {
    console.warn('[GCS] Google Cloud Storage init warning, using local artifact cache:', err);
  }
  return null;
}

export async function uploadArtifactToGcs(
  destinationPath: string, 
  content: string | Buffer, 
  contentType: string = 'application/json'
): Promise<string> {
  const bucketName = process.env.GCS_BUCKET_NAME;
  const gcs = getGcsStorage();

  if (gcs && bucketName) {
    try {
      const bucket = gcs.bucket(bucketName);
      const file = bucket.file(destinationPath);
      await file.save(content, {
        contentType,
        metadata: {
          project: 'Project X',
          system: 'Agentic Script-to-Screen QA',
        },
      });
      return `gs://${bucketName}/${destinationPath}`;
    } catch (err) {
      console.warn(`[GCS] Upload failed for ${destinationPath}, saving to local cache:`, err);
    }
  }

  // Resilient fallback: save to local cache directory
  try {
    const localFilePath = path.join(LOCAL_CACHE_DIR, destinationPath);
    const dir = path.dirname(localFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localFilePath, content);
    return `file://${localFilePath.replace(/\\/g, '/')}`;
  } catch (e) {
    console.warn('[GCS Local Fallback] Could not write cache file:', e);
    return `virtual://${destinationPath}`;
  }
}
