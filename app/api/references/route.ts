import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileStorage } from '@/lib/file-storage';

// Initialize file storage
fileStorage.init();

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'thumbnail' | 'logo' | 'icon' | 'background' | null;
    const description = formData.get('description') as string | null;

    // EDGE CASES: Criar referência sem arquivo mostra erro "Selecione uma imagem"
    if (!file) {
      return NextResponse.json({ error: 'Selecione uma imagem' }, { status: 400 });
    }

    // Validate file type (JPG, PNG, WEBP only)
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

    // EDGE CASES: Criar referência sem selecionar tipo mostra erro "Selecione um tipo"
    if (!type || !['thumbnail', 'logo', 'icon', 'background'].includes(type)) {
      return NextResponse.json({ error: 'Selecione um tipo' }, { status: 400 });
    }

    // Save file
    const savedFile = await fileStorage.saveFile(file, session.user.id);

    // FUNCIONAL: Usuário cria nova referência com upload de arquivo + campo de descrição (opcional)
    // FUNCIONAL: Usuário seleciona tipo de referência: thumbnail, logo, ícone ou fundo (dropdown)
    const reference = await db.createReference(
      session.user.id,
      type,
      savedFile.fileName,
      savedFile.url,
      savedFile.fileSize,
      savedFile.mimeType,
      description || undefined
    );

    return NextResponse.json(reference, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Erro no upload' },
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as 'thumbnail' | 'logo' | 'icon' | 'background' | 'all' || 'all';

    // Get references
    const references = await db.getReferencesByType(session.user.id, type);

    return NextResponse.json(references);
  } catch (error) {
    console.error('Get references error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar referências' },
      { status: 500 }
    );
  }
}
