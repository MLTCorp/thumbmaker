import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileStorage } from '@/lib/file-storage';

// Initialize file storage for avatars
fileStorage.init('avatars');

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const name = formData.get('name') as string;
    const files = formData.getAll('photos') as File[];

    // EDGE CASES: Tentar criar avatar sem nome mostra erro "Nome do avatar é obrigatório"
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome do avatar é obrigatório' },
        { status: 400 }
      );
    }

    // FUNCIONAL: Sistema valida quantidade mínima de 3 fotos, rejeita se <3
    // COMPORTAMENTO: Sistema mostra erro "Mínimo de 3 fotos obrigatório" se tentar criar com <3
    if (!files || files.length < 3) {
      return NextResponse.json(
        { error: 'Mínimo de 3 fotos obrigatório' },
        { status: 400 }
      );
    }

    // FUNCIONAL: Sistema valida quantidade máxima de 10 fotos, rejeita se >10
    // COMPORTAMENTO: Sistema mostra erro "Máximo de 10 fotos permitido" se tentar carregar >10
    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Máximo de 10 fotos permitido' },
        { status: 400 }
      );
    }

    // Validate file types (JPG, PNG, WEBP only)
    const invalidTypeFiles = files.filter(f => !fileStorage.isValidImageType(f.type));
    if (invalidTypeFiles.length > 0) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado. Use JPG, PNG ou WEBP' },
        { status: 400 }
      );
    }

    // Validate file sizes (max 5MB per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const invalidSizeFiles = files.filter(f => !fileStorage.isValidFileSize(f.size, maxSize));
    if (invalidSizeFiles.length > 0) {
      return NextResponse.json(
        { error: 'Arquivo muito grande (máximo 5MB)' },
        { status: 400 }
      );
    }

    // Upload all files simultaneously
    const uploadPromises = files.map(async (file) => {
      return await fileStorage.saveFile(file, session.user.id, 'avatars');
    });

    const uploadedPhotos = await Promise.all(uploadPromises);

    // Create avatar in database
    const avatar = await db.createAvatar(
      session.user.id,
      name.trim(),
      uploadedPhotos.map(photo => ({
        url: photo.url,
        fileName: photo.fileName,
        fileSize: photo.fileSize,
        mimeType: photo.mimeType,
      }))
    );

    return NextResponse.json(avatar, { status: 201 });
  } catch (error) {
    console.error('Avatar creation error:', error);
    return NextResponse.json(
      { error: 'Erro ao criar avatar' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get avatars for user
    const avatars = await db.getAvatarsByUserId(session.user.id);

    return NextResponse.json(avatars);
  } catch (error) {
    console.error('Get avatars error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar avatars' },
      { status: 500 }
    );
  }
}
