// Simple file storage utility - INTEGRATED WITH SUPABASE
// All uploads go directly to Supabase Storage (no local file system)

import { supabaseAdmin } from './supabase';
import { uploadAvatarPhotoToStorage, uploadReferenceToStorage } from './supabase-storage';

const isSupabaseConfigured = supabaseAdmin !== null;

export const fileStorage = {
  // Init function - does nothing now (Supabase is ready)
  async init(subfolder: string = 'references') {
    console.log('FileStorage initialized (using Supabase)');
  },

  // Upload avatar photo to Supabase Storage
  async saveAvatarPhoto(file: File, userId: string, photoId?: string): Promise<{ url: string; fileName: string; fileSize: number; mimeType: string }> {
    const result = await uploadAvatarPhotoToStorage(file, userId, photoId || generateId());
    
    console.log('Avatar photo saved to Supabase:', result.url);
    
    return {
      url: result.url,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
  },

  // Upload reference photo to Supabase Storage
  async saveReferencePhoto(file: File, userId: string): Promise<{ url: string; fileName: string; fileSize: number; mimeType: string }> {
    const result = await uploadReferenceToStorage(file, userId);
    
    console.log('Reference photo saved to Supabase:', result.url);
    
    return {
      url: result.url,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
  },

  // Delete file from Supabase Storage
  async deleteFile(url: string): Promise<boolean> {
    try {
      if (url.includes('supabase.co/storage')) {
        // Extract bucket and path from URL
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/storage/v1/object/public/');
        if (pathParts.length < 2) return false;
        
        const [bucket, ...pathSegments] = pathParts[1].split('/');
        const filePath = pathSegments.join('/');
        
        if (!supabaseAdmin) return false;
        
        const { error } = await supabaseAdmin.storage
          .from(bucket)
          .remove([filePath]);
        
        if (error) {
          console.error('Error deleting file from Supabase:', error);
          return false;
        }
        
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  },

  // Validate file type
  isValidImageType(mimeType: string): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(mimeType);
  },

  // Validate file size (max 5MB)
  isValidFileSize(size: number, maxSize: number = 5 * 1024 * 1024): boolean {
    return size <= maxSize;
  },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
