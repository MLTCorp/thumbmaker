import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';

// Simple file storage utility for development
// In production, this would be replaced with Supabase Storage

const UPLOAD_BASE_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
async function ensureUploadDir(subfolder: string = 'references') {
  try {
    await mkdir(path.join(UPLOAD_BASE_DIR, subfolder), { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

export const fileStorage = {
  async init(subfolder: string = 'references') {
    await ensureUploadDir(subfolder);
  },

  // Save file and return the URL
  async saveFile(file: File, userId: string, subfolder: string = 'references'): Promise<{ url: string; fileName: string; fileSize: number; mimeType: string }> {
    await ensureUploadDir(subfolder);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const fileName = `${userId}-${timestamp}-${randomStr}.${extension}`;
    const filePath = path.join(UPLOAD_BASE_DIR, subfolder, fileName);

    // Write file to disk
    fs.writeFileSync(filePath, buffer);

    // Return public URL
    const url = `/uploads/${subfolder}/${fileName}`;

    return {
      url,
      fileName: file.name, // Original filename
      fileSize: file.size,
      mimeType: file.type,
    };
  },

  // Delete file
  async deleteFile(url: string): Promise<boolean> {
    try {
      const parts = url.split('/uploads/');
      if (parts.length < 2) return false;
      const relativePath = parts[1];
      const filePath = path.join(UPLOAD_BASE_DIR, relativePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
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
