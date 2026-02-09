// Simple in-memory database for development
// In production, this would be replaced with Supabase or another database

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
  createdAt: Date;
}

// In-memory store
let users: User[] = [];
let references: Reference[] = [];
let avatars: Avatar[] = [];
let thumbnails: Thumbnail[] = [];

// Simulate database delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const db = {
  // Find user by email
  async findUserByEmail(email: string): Promise<User | null> {
    await delay(50); // Simulate DB latency
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  // Find user by ID
  async findUserById(id: string): Promise<User | null> {
    await delay(50);
    return users.find(u => u.id === id) || null;
  },

  // Create new user
  async createUser(email: string, password: string): Promise<User> {
    await delay(50);

    // Check if email already exists
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

    users.push(newUser);
    return newUser;
  },

  // Verify user credentials
  async verifyCredentials(email: string, password: string): Promise<User | null> {
    await delay(50);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return null;
    }
    // Password verification should be done with bcrypt in the auth handler
    return user;
  },

  // Get all users (for debugging)
  getAllUsers(): User[] {
    return users;
  },

  // Reference CRUD operations

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
    await delay(100);

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

    references.push(newReference);
    return newReference;
  },

  // Get all references for a user
  async getReferencesByUserId(userId: string): Promise<Reference[]> {
    await delay(50);
    return references
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Get reference by ID
  async getReferenceById(id: string): Promise<Reference | null> {
    await delay(50);
    return references.find(r => r.id === id) || null;
  },

  // Update reference
  async updateReference(
    id: string,
    updates: Partial<Pick<Reference, 'description' | 'type' | 'fileName' | 'fileUrl' | 'fileSize' | 'mimeType'>>
  ): Promise<Reference | null> {
    await delay(50);
    const index = references.findIndex(r => r.id === id);
    if (index === -1) return null;

    references[index] = { ...references[index], ...updates };
    return references[index];
  },

  // Delete reference
  async deleteReference(id: string): Promise<boolean> {
    await delay(50);
    const index = references.findIndex(r => r.id === id);
    if (index === -1) return false;

    references.splice(index, 1);
    return true;
  },

  // Get references by type
  async getReferencesByType(userId: string, type: 'thumbnail' | 'logo' | 'icon' | 'background' | 'all'): Promise<Reference[]> {
    await delay(50);
    const userReferences = references.filter(r => r.userId === userId);
    if (type === 'all') return userReferences;
    return userReferences.filter(r => r.type === type).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Get all references (for debugging)
  getAllReferences(): Reference[] {
    return references;
  },

  // Avatar CRUD operations

  // Create new avatar with photos
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
    await delay(100);

    const photoObjects = photos.map(photo => ({
      id: generateId(),
      ...photo
    }));

    const newAvatar: Avatar = {
      id: generateId(),
      userId,
      name,
      photos: photoObjects,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    avatars.push(newAvatar);
    return newAvatar;
  },

  // Get all avatars for a user
  async getAvatarsByUserId(userId: string): Promise<Avatar[]> {
    await delay(50);
    return avatars
      .filter(a => a.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Get avatar by ID
  async getAvatarById(id: string): Promise<Avatar | null> {
    await delay(50);
    return avatars.find(a => a.id === id) || null;
  },

  // Update avatar (name and photos)
  async updateAvatar(
    id: string,
    updates: Partial<Pick<Avatar, 'name' | 'photos'>>
  ): Promise<Avatar | null> {
    await delay(50);
    const index = avatars.findIndex(a => a.id === id);
    if (index === -1) return null;

    avatars[index] = {
      ...avatars[index],
      ...updates,
      updatedAt: new Date(),
    };
    return avatars[index];
  },

  // Delete avatar
  async deleteAvatar(id: string): Promise<boolean> {
    await delay(50);
    const index = avatars.findIndex(a => a.id === id);
    if (index === -1) return false;

    avatars.splice(index, 1);
    return true;
  },

  // Get all avatars (for debugging)
  getAllAvatars(): Avatar[] {
    return avatars;
  },

  // Thumbnail CRUD operations

  // Create new thumbnail
  async createThumbnail(
    userId: string,
    avatarId: string,
    avatarName: string,
    prompt: string,
    textIdea: string,
    thumbnailUrl: string,
    references: string[]
  ): Promise<Thumbnail> {
    await delay(100);

    const newThumbnail: Thumbnail = {
      id: generateId(),
      userId,
      avatarId,
      avatarName,
      prompt,
      textIdea,
      thumbnailUrl,
      references,
      createdAt: new Date(),
    };

    thumbnails.push(newThumbnail);
    return newThumbnail;
  },

  // Get all thumbnails for a user
  async getThumbnailsByUserId(userId: string): Promise<Thumbnail[]> {
    await delay(50);
    return thumbnails
      .filter(t => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  // Get thumbnail by ID
  async getThumbnailById(id: string): Promise<Thumbnail | null> {
    await delay(50);
    return thumbnails.find(t => t.id === id) || null;
  },

  // Delete thumbnail
  async deleteThumbnail(id: string): Promise<boolean> {
    await delay(50);
    const index = thumbnails.findIndex(t => t.id === id);
    if (index === -1) return false;

    thumbnails.splice(index, 1);
    return true;
  },

  // Get all thumbnails (for debugging)
  getAllThumbnails(): Thumbnail[] {
    return thumbnails;
  }
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
