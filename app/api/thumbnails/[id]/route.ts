import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

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

    // Await params (Next.js 15)
    const { id } = await params;

    // Get thumbnail by ID
    const thumbnail = await db.getThumbnailById(id);

    if (!thumbnail) {
      return NextResponse.json(
        { error: 'Thumbnail não encontrada' },
        { status: 404 }
      );
    }

    // EDGE CASES: Usuário vê apenas seus próprios thumbnails (isolamento de dados)
    if (thumbnail.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // US-010: Add Cache-Control header for 10 minutes (600 seconds)
    return NextResponse.json(thumbnail, {
      headers: {
        'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Get thumbnail error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar thumbnail' },
      { status: 500 }
    );
  }
}

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

    // Await params (Next.js 15)
    const { id } = await params;

    // Get thumbnail by ID to verify ownership
    const thumbnail = await db.getThumbnailById(id);

    if (!thumbnail) {
      return NextResponse.json(
        { error: 'Thumbnail não encontrada' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (thumbnail.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete thumbnail
    const success = await db.deleteThumbnail(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao deletar thumbnail' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete thumbnail error:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar thumbnail' },
      { status: 500 }
    );
  }
}
