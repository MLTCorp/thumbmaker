// Simple in-memory database for development
// INTEGRATED WITH SUPABASE - Avatars and thumbnails are now saved to Supabase

export interface User {
  id: string;
  email: string;
  password: string; // hashed
  createdAt: Date;
}

export interface Reference {
  id: string;
  userId: string;
  type: 'thumbnail' | 'logo' | 'icon' | 'background';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  createdAt: Date;
}

export interface Avatar {
  id: string;
  userId: string;
  name: string;
  photos: Array<{
    id: string;
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Thumbnail {
  id: string;
  userId: string;
  avatarId: string;
  avatarName: string;
  prompt: string;
  textIdea: string;
  thumbnailUrl: string;
  references: string[];
  additionalPrompt?: string;
  createdAt: Date;
}

// In-memory store (for fallback when Supabase not configured)
let users: User[] = [];
let references: Reference[] = [];
let avatars: Avatar[] = [];
let thumbnails: Thumbnail[] = [];

// Simulate database delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Supabase client (non-null assertion - Supabase is always configured in this project)
import { supabaseAdmin as _supabaseAdmin } from './supabase';
const supabaseAdmin = _supabaseAdmin!;

// Parse photos array that may contain JSON strings instead of objects
function parsePhotos(photos: any[]): Avatar['photos'] {
  if (!photos || !Array.isArray(photos)) return [];
  return photos.map(photo => {
    if (typeof photo === 'string') {
      try {
        return JSON.parse(photo);
      } catch {
        return null;
      }
    }
    return photo;
  }).filter(Boolean);
}

export const db = {
  // Find user by email
  async findUserByEmail(email: string): Promise<User | null> {
    console.log('Finding user by email:', email);

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user not found
          return null;
        }
        console.error('Error finding user by email:', error);
        // Fall back to in-memory
      } else if (data) {
        return {
          id: data.id,
          email: data.email,
          password: data.password,
          createdAt: new Date(data.created_at),
        };
      }
    }

    // Fallback to in-memory
    await delay(50);
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  // Find user by ID
  async findUserById(id: string): Promise<User | null> {
    console.log('Finding user by ID:', id);

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error finding user by ID:', error);
      } else if (data) {
        return {
          id: data.id,
          email: data.email,
          password: data.password,
          createdAt: new Date(data.created_at),
        };
      }
    }

    // Fallback to in-memory
    await delay(50);
    return users.find(u => u.id === id) || null;
  },

  // Create new user
  async createUser(email: string, password: string): Promise<User> {
    console.log('Creating user:', email);

    // Check if user exists
    const existing = await this.findUserByEmail(email);
    if (existing) {
      throw new Error('Email already exists');
    }

    const newUser: User = {
      id: generateId(),
      email: email.toLowerCase(),
      password,
      createdAt: new Date(),
    };

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          id: newUser.id,
          email: newUser.email,
          password: newUser.password,
          created_at: newUser.createdAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user in Supabase:', error);
        throw new Error('Erro ao criar usuário');
      }

      console.log('User created in Supabase:', data.id);
      return newUser;
    }

    // Fallback to in-memory
    await delay(50);
    users.push(newUser);
    return newUser;
  },

  // Verify user credentials
  async verifyCredentials(email: string, password: string): Promise<User | null> {
    console.log('Verifying credentials for:', email);
    const user = await this.findUserByEmail(email);
    if (!user) {
      return null;
    }
    // Password verification should be done with bcrypt in auth handler
    return user;
  },

  // Get all users (for debugging)
  getAllUsers(): User[] {
    return users;
  },

  // Reference CRUD operations (use Supabase when available)
  
  // Create new reference
  async createReference(
    userId: string,
    type: 'thumbnail' | 'logo' | 'icon' | 'background',
    fileName: string,
    fileUrl: string,
    fileSize: number,
    mimeType: string,
    description?: string
  ): Promise<Reference> {
    console.log('Creating reference:', fileName);

    const newReference: Reference = {
      id: generateId(),
      userId,
      type,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      description,
      createdAt: new Date(),
    };

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('references')
        .insert({
          id: newReference.id,
          user_id: userId,
          type,
          file_name: fileName,
          image_url: fileUrl,
          file_size: fileSize,
          mime_type: mimeType,
          description,
          created_at: newReference.createdAt.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating reference in Supabase:', error);
        throw new Error('Erro ao criar referência');
      }

      console.log('Reference created in Supabase:', data.id);
      return newReference;
    }

    // Fallback to in-memory
    await delay(100);
    references.push(newReference);
    return newReference;
  },

  // Get all references for a user
  async getReferencesByUserId(userId: string): Promise<Reference[]> {
    console.log('Fetching references for user:', userId);

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('references')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching references:', error);
        return [];
      }

      return (data || []).map(r => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        fileName: r.file_name,
        fileUrl: r.image_url,
        fileSize: r.file_size,
        mimeType: r.mime_type,
        description: r.description,
        createdAt: new Date(r.created_at),
      }));
    }

    // Fallback to in-memory
    await delay(50);
    return references
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Get reference by ID
  async getReferenceById(id: string): Promise<Reference | null> {
    console.log('Fetching reference:', id);

    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('references')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching reference:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        type: data.type,
        fileName: data.file_name,
        fileUrl: data.image_url,
        fileSize: data.file_size,
        mimeType: data.mime_type,
        description: data.description,
        createdAt: new Date(data.created_at),
      };
    }

    // Fallback to in-memory
    await delay(50);
    return references.find(r => r.id === id) || null;
  },

  // Get references by type
  async getReferencesByType(userId: string, type: 'thumbnail' | 'logo' | 'icon' | 'background' | 'all'): Promise<Reference[]> {
    const allReferences = await this.getReferencesByUserId(userId);
    if (type === 'all') return allReferences;
    return allReferences.filter(r => r.type === type);
  },

  // Delete reference
  async deleteReference(id: string): Promise<boolean> {
    console.log('Deleting reference:', id);

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('references')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting reference:', error);
        return false;
      }
      return true;
    }

    // Fallback to in-memory
    const index = references.findIndex(r => r.id === id);
    if (index >= 0) {
      references.splice(index, 1);
      return true;
    }
    return false;
  },

  // Update reference
  async updateReference(id: string, updates: Partial<Pick<Reference, 'type' | 'fileName' | 'fileUrl' | 'fileSize' | 'mimeType' | 'description'>>): Promise<Reference | null> {
    console.log('Updating reference:', id, updates);

    if (supabaseAdmin) {
      const updateData: any = {};
      if (updates.type) updateData.type = updates.type;
      if (updates.fileName) updateData.file_name = updates.fileName;
      if (updates.fileUrl) updateData.image_url = updates.fileUrl;
      if (updates.fileSize) updateData.file_size = updates.fileSize;
      if (updates.mimeType) updateData.mime_type = updates.mimeType;
      if (updates.description !== undefined) updateData.description = updates.description;

      const { data, error } = await supabaseAdmin
        .from('references')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating reference:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        type: data.type,
        fileName: data.file_name,
        fileUrl: data.image_url,
        fileSize: data.file_size,
        mimeType: data.mime_type,
        description: data.description,
        createdAt: new Date(data.created_at),
      };
    }

    // Fallback to in-memory
    const ref = references.find(r => r.id === id);
    if (!ref) return null;
    Object.assign(ref, updates);
    return ref;
  },

  // Avatar CRUD operations (use Supabase)
  
  // Create new avatar with photos (uploads to Supabase Storage)
  async createAvatar(
    userId: string,
    name: string,
    photos: Array<{
      url: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }>
  ): Promise<Avatar> {
    console.log('Creating avatar in Supabase:', name);

    const photoObjects = photos.map(photo => ({
      id: generateId(),
      ...photo
    }));

    const newAvatar = {
      user_id: userId,
      name,
      photos: photoObjects,
    };

    // Save to Supabase database
    const { data, error } = await supabaseAdmin
      .from('avatars')
      .insert(newAvatar)
      .select()
      .single();

    if (error) {
      console.error('Error creating avatar in Supabase:', error);
      throw new Error('Erro ao criar avatar');
    }

    console.log('Avatar created in Supabase:', data.id);

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      photos: parsePhotos(data.photos),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at || data.created_at),
    };
  },

  // Get all avatars for a user (from Supabase)
  async getAvatarsByUserId(userId: string): Promise<Avatar[]> {
    console.log('Fetching avatars from Supabase for user:', userId);

    const { data, error } = await supabaseAdmin
      .from('avatars')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching avatars:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} avatars`);
    return (data || []).map(a => ({
      id: a.id,
      userId: a.user_id,
      name: a.name,
      photos: parsePhotos(a.photos),
      createdAt: new Date(a.created_at),
      updatedAt: new Date(a.updated_at || a.created_at),
    }));
  },

  // Get avatar by ID (from Supabase)
  async getAvatarById(id: string): Promise<Avatar | null> {
    console.log('Fetching avatar from Supabase:', id);

    const { data, error } = await supabaseAdmin
      .from('avatars')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching avatar:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      photos: parsePhotos(data.photos),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at || data.created_at),
    };
  },

  // Update avatar (name and photos)
  async updateAvatar(
    id: string,
    updates: Partial<Pick<Avatar, 'name' | 'photos'>>
  ): Promise<Avatar | null> {
    console.log('Updating avatar in Supabase:', id, updates);

    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.photos) updateData.photos = updates.photos;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('avatars')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating avatar:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      photos: parsePhotos(data.photos),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at || data.created_at),
    };
  },

  // Delete avatar
  async deleteAvatar(id: string): Promise<boolean> {
    console.log('Deleting avatar from Supabase:', id);

    // Delete all photos from storage first
    const { data: avatarData } = await supabaseAdmin
      .from('avatars')
      .select('photos')
      .eq('id', id)
      .single();

    if (avatarData?.photos) {
      for (const photo of avatarData.photos) {
        try {
          const urlParts = photo.url.split('/storage/v1/object/public/');
          if (urlParts.length > 1) {
            const path = urlParts[1];
            await supabaseAdmin.storage.from('avatars').remove([path]);
          }
        } catch (e) {
          console.error('Error deleting photo from storage:', e);
        }
      }
    }

    // Delete from database
    const { error } = await supabaseAdmin
      .from('avatars')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting avatar:', error);
      return false;
    }

    return true;
  },

  // Get all avatars (for debugging)
  getAllAvatars(): Avatar[] {
    return avatars;
  },

  // Thumbnail CRUD operations (use Supabase)
  
  // Create new thumbnail (save to Supabase)
  async createThumbnail(
    userId: string,
    avatarId: string,
    avatarName: string,
    prompt: string,
    textIdea: string,
    thumbnailUrl: string,
    references: string[],
    additionalPrompt?: string
  ): Promise<Thumbnail> {
    console.log('Creating thumbnail in Supabase for avatar:', avatarId);

    const newThumbnail = {
      user_id: userId,
      avatar_id: avatarId,
      avatar_name: avatarName,
      prompt,
      text_idea: textIdea,
      thumbnail_url: thumbnailUrl,
      references,
      additional_prompt: additionalPrompt || null,
    };

    // Save to Supabase database
    const { data, error } = await supabaseAdmin
      .from('thumbnails')
      .insert(newThumbnail)
      .select()
      .single();

    if (error) {
      console.error('Error creating thumbnail in Supabase:', error);
      throw new Error('Erro ao criar thumbnail');
    }

    console.log('Thumbnail created in Supabase:', data.id);

    return {
      id: data.id,
      userId: data.user_id,
      avatarId: data.avatar_id,
      avatarName: data.avatar_name,
      prompt: data.prompt,
      textIdea: data.text_idea,
      thumbnailUrl: data.thumbnail_url,
      references: data.references || [],
      additionalPrompt: data.additional_prompt || undefined,
      createdAt: new Date(data.created_at),
    };
  },

  // Get all thumbnails for a user (from Supabase)
  async getThumbnailsByUserId(userId: string): Promise<Thumbnail[]> {
    console.log('Fetching thumbnails from Supabase for user:', userId);

    const { data, error } = await supabaseAdmin
      .from('thumbnails')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching thumbnails:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} thumbnails`);
    return (data || []).map(t => ({
      id: t.id,
      userId: t.user_id,
      avatarId: t.avatar_id,
      avatarName: t.avatar_name,
      prompt: t.prompt,
      textIdea: t.text_idea,
      thumbnailUrl: t.thumbnail_url,
      references: t.references || [],
      additionalPrompt: t.additional_prompt || undefined,
      createdAt: new Date(t.created_at),
    }));
  },

  // Get thumbnail by ID (from Supabase)
  async getThumbnailById(id: string): Promise<Thumbnail | null> {
    console.log('Fetching thumbnail from Supabase:', id);

    const { data, error } = await supabaseAdmin
      .from('thumbnails')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching thumbnail:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      avatarId: data.avatar_id,
      avatarName: data.avatar_name,
      prompt: data.prompt,
      textIdea: data.text_idea,
      thumbnailUrl: data.thumbnail_url,
      references: data.references || [],
      additionalPrompt: data.additional_prompt || undefined,
      createdAt: new Date(data.created_at),
    };
  },

  // Delete thumbnail
  async deleteThumbnail(id: string): Promise<boolean> {
    console.log('Deleting thumbnail from Supabase:', id);

    // Delete from database
    const { error } = await supabaseAdmin
      .from('thumbnails')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting thumbnail:', error);
      return false;
    }

    return true;
  },

  // Get all thumbnails (for debugging)
  getAllThumbnails(): Thumbnail[] {
    return thumbnails;
  },
};

function generateId(): string {
  return crypto.randomUUID();
}
