import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileStorage } from '@/lib/file-storage';
import { uploadAvatarPhotoToStorage } from '@/lib/supabase-storage';

// Initialize file storage for avatars
fileStorage.init('avatars');

// GET /api/avatars/[id] - Get a specific avatar by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get avatar by ID
    const avatar = await db.getAvatarById(id);

    if (!avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    // EDGE CASES: Usuário vê apenas seus próprios avatars (isolamento de dados)
    if (avatar.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(avatar);
  } catch (error) {
    console.error('Get avatar error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar avatar' },
      { status: 500 }
    );
  }
}

// PUT /api/avatars/[id] - Update an avatar
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const deletePhotos = formData.get('deletePhotos') as string;
    const newFiles = formData.getAll('newPhotos') as File[];

    // Get existing avatar
    const existingAvatar = await db.getAvatarById(id);

    if (!existingAvatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    // EDGE CASES: Usuário vê apenas seus próprios avatars (isolamento de dados)
    if (existingAvatar.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepare photos array
    let updatedPhotos = [...existingAvatar.photos];

    // Remove photos marked for deletion
    if (deletePhotos) {
      const photoIdsToDelete = deletePhotos.split(',').filter(Boolean);
      photoIdsToDelete.forEach(photoId => {
        // Delete from storage
        const photoToDelete = updatedPhotos.find(p => p.id === photoId);
        if (photoToDelete) {
          fileStorage.deleteFile(photoToDelete.url);
        }
      });

      updatedPhotos = updatedPhotos.filter(p => !photoIdsToDelete.includes(p.id));
    }

    // Add new photos
    if (newFiles && newFiles.length > 0) {
      // Validate file types
      const invalidTypeFiles = newFiles.filter(f => !fileStorage.isValidImageType(f.type));
      if (invalidTypeFiles.length > 0) {
        return NextResponse.json(
          { error: 'Tipo de arquivo não suportado. Use JPG, PNG ou WEBP' },
          { status: 400 }
        );
      }

      // Validate file sizes
      const maxSize = 5 * 1024 * 1024; // 5MB
      const invalidSizeFiles = newFiles.filter(f => !fileStorage.isValidFileSize(f.size, maxSize));
      if (invalidSizeFiles.length > 0) {
        return NextResponse.json(
          { error: 'Arquivo muito grande (máximo 5MB)' },
          { status: 400 }
        );
      }

      // Upload new files to Supabase Storage
      const uploadPromises = newFiles.map(async (file) => {
        const photoId = Math.random().toString(36).substring(2, 15);
        return await fileStorage.saveAvatarPhoto(file, session.user.id);
      });

      const uploadedPhotos = await Promise.all(uploadPromises);

      // Add new photos to array
      const newPhotoObjects = uploadedPhotos.map(photo => ({
        id: Math.random().toString(36).substring(2, 15),
        url: photo.url,
        fileName: photo.fileName,
        fileSize: photo.fileSize,
        mimeType: photo.mimeType,
      }));

      updatedPhotos = [...updatedPhotos, ...newPhotoObjects];
    }

    // EDGE CASES: Editar avatar para remover fotos deixa <3 mostra erro "Mínimo de 3 fotos"
    if (updatedPhotos.length < 3) {
      return NextResponse.json(
        { error: 'Mínimo de 3 fotos' },
        { status: 400 }
      );
    }

    // EDGE CASES: Editar avatar para adicionar fotos deixa >10 mostra erro "Máximo de 10 fotos"
    if (updatedPhotos.length > 10) {
      return NextResponse.json(
        { error: 'Máximo de 10 fotos' },
        { status: 400 }
      );
    }

    // Update avatar in database
    const updatedAvatar = await db.updateAvatar(id, {
      name: name ? name.trim() : existingAvatar.name,
      photos: updatedPhotos,
    });

    return NextResponse.json(updatedAvatar);
  } catch (error) {
    console.error('Update avatar error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar avatar' },
      { status: 500 }
    );
  }
}

// DELETE /api/avatars/[id] - Delete an avatar
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get existing avatar
    const existingAvatar = await db.getAvatarById(id);

    if (!existingAvatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 });
    }

    // EDGE CASES: Usuário vê apenas seus próprios avatars (isolamento de dados)
    if (existingAvatar.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete all photos from storage
    existingAvatar.photos.forEach(photo => {
      fileStorage.deleteFile(photo.url);
    });

    // Delete avatar from database
    const deleted = await db.deleteAvatar(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Erro ao deletar avatar' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete avatar error:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar avatar' },
      { status: 500 }
    );
  }
}
