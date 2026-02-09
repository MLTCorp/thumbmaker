import { supabaseAdmin } from './supabase';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Check if Supabase is configured
export const isSupabaseConfigured = supabaseAdmin !== null;

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type ProgressCallback = (progress: UploadProgress) => void;

/**
 * Download an image from a URL and convert it to a File
 */
async function downloadImageFromUrl(url: string): Promise<File> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }

  const blob = await response.blob();

  // Check file size
  if (blob.size > MAX_FILE_SIZE) {
    throw new Error('Arquivo muito grande');
  }

  // Get content type and determine extension
  const contentType = blob.type || 'image/jpeg';
  const extension = contentType.split('/')[1] || 'jpg';

  // Create file
  const file = new File([blob], `thumbnail-${Date.now()}.${extension}`, {
    type: contentType,
  });

  return file;
}

/**
 * Upload a file to Supabase Storage with retry logic
 */
async function uploadFileWithRetry(
  bucket: string,
  path: string,
  file: File,
  options: {
    upsert?: boolean;
    contentType?: string;
    onProgress?: ProgressCallback;
  } = {}
): Promise<{ url: string; path: string }> {
  const { upsert = false, contentType, onProgress } = options;
  let lastError: Error | null = null;

  if (!supabaseAdmin) {
    throw new Error('Serviço indisponível');
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Convert file to ArrayBuffer for upload
      const arrayBuffer = await file.arrayBuffer();

      // Upload to Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, arrayBuffer, {
          upsert,
          contentType: contentType || file.type,
          duplex: 'half',
        });

      if (error) {
        // Check for service unavailable
        if (error.message.includes('Service unavailable') ||
            error.message.includes('503') ||
            error.message.includes('Network error')) {
          throw new Error('Serviço indisponível');
        }

        throw new Error(error.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(path);

      // Simulate progress for demonstration
      // Supabase Storage doesn't provide real upload progress
      if (onProgress) {
        onProgress({
          loaded: file.size,
          total: file.size,
          percentage: 100,
        });
      }

      return {
        url: publicUrl,
        path: data.path,
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  // All retries failed
  throw lastError || new Error('Erro ao fazer upload');
}

/**
 * Upload a generated thumbnail to Supabase Storage
 *
 * Note: When integrated with US-007 (Histórico persistente), this upload will run in parallel
 * with database save using Promise.all. If database save fails but upload succeeds,
 * EDGE CASES: "Upload parcialmente completo" will show warning "Thumbnail salva com sucesso"
 */
export async function uploadThumbnailToStorage(
  imageUrl: string,
  userId: string,
  options?: {
    onProgress?: ProgressCallback;
  }
): Promise<{ url: string; path: string }> {
  // Download the image from the URL
  const file = await downloadImageFromUrl(imageUrl);

  // Generate unique path for the thumbnail
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 15);
  const path = `thumbnails/${userId}/${timestamp}-${randomStr}.${file.name.split('.').pop()}`;

  // Upload with retry logic
  const result = await uploadFileWithRetry('thumbnails', path, file, {
    upsert: true,
    onProgress: options?.onProgress,
  });

  return result;
}

/**
 * Validate if an image URL is valid and accessible
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type');
    return contentType?.startsWith('image/') || false;
  } catch (error) {
    return false;
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFileFromStorage(
  bucket: string,
  path: string
): Promise<boolean> {
  try {
    if (!supabaseAdmin) {
      return false;
    }

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    return false;
  }
}
