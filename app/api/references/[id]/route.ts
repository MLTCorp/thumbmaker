import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileStorage } from '@/lib/file-storage';

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

    // Get reference
    const reference = await db.getReferenceById(id);
    if (!reference) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
    }

    // Check ownership
    if (reference.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete reference from database
    await db.deleteReference(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete reference error:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar referência' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const description = formData.get('description') as string | null;

    // Get reference
    const reference = await db.getReferenceById(id);
    if (!reference) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
    }

    // Check ownership
    if (reference.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Build updates object
    const updates: any = {};

    if (description !== null) {
      updates.description = description;
    }

    if (type && ['thumbnail', 'logo', 'icon', 'background'].includes(type)) {
      updates.type = type;
    }

    // FUNCIONAL: Usuário edita descrição da referência e substitui arquivo (upload novo)
    if (file) {
      // Validate file type (JPG, PNG, WEBP only)
      const fileStorage = (await import('@/lib/file-storage')).fileStorage;
      if (!fileStorage.isValidImageType(file.type)) {
        return NextResponse.json(
          { error: 'Tipo de arquivo não suportado' },
          { status: 400 }
        );
      }

      // Validate file size (max 5MB)
      if (!fileStorage.isValidFileSize(file.size, 5 * 1024 * 1024)) {
        return NextResponse.json(
          { error: 'Arquivo muito grande (máximo 5MB)' },
          { status: 400 }
        );
      }

      // Save new file to Supabase Storage
      const savedFile = await fileStorage.saveReferencePhoto(file, session.user.id);
      updates.fileName = savedFile.fileName;
      updates.fileUrl = savedFile.url;
      updates.fileSize = savedFile.fileSize;
      updates.mimeType = savedFile.mimeType;
    }

    // Update reference
    const updated = await db.updateReference(id, updates);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update reference error:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar referência' },
      { status: 500 }
    );
  }
}
