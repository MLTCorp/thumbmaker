import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.avatarId || !body.prompt || !body.textIdea || !body.thumbnailUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get avatar name
    const avatar = await db.getAvatarById(body.avatarId);
    if (!avatar) {
      return NextResponse.json(
        { error: 'Avatar not found' },
        { status: 404 }
      );
    }

    // Create thumbnail in database
    const thumbnail = await db.createThumbnail(
      session.user.id,
      body.avatarId,
      avatar.name,
      body.prompt,
      body.textIdea,
      body.thumbnailUrl,
      body.references || [],
      body.additionalPrompt
    );

    return NextResponse.json(thumbnail, { status: 201 });
  } catch (error) {
    console.error('Thumbnail creation error:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar thumbnail' },
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
    const searchParams = req.nextUrl.searchParams;
    const avatarId = searchParams.get('avatarId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const fields = searchParams.get('fields'); // Optional: limit fields returned

    // Get thumbnails for user
    let thumbnails = await db.getThumbnailsByUserId(session.user.id);

    // Filter by avatar if specified
    if (avatarId) {
      thumbnails = thumbnails.filter(t => t.avatarId === avatarId);
    }

    // Filter by date range if specified
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      thumbnails = thumbnails.filter(t => t.createdAt >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      // Set to end of the day
      toDate.setHours(23, 59, 59, 999);
      thumbnails = thumbnails.filter(t => t.createdAt <= toDate);
    }

    // US-010: Optimize response - return only necessary fields for grid view
    // If 'fields' param is 'grid', return only essential fields
    let response;
    if (fields === 'grid') {
      response = thumbnails.map(t => ({
        id: t.id,
        thumbnailUrl: t.thumbnailUrl,
        textIdea: t.textIdea,
        createdAt: t.createdAt,
      }));
    } else {
      // Return full objects (for history page or modal details)
      response = thumbnails;
    }

    // US-010: Add Cache-Control header for 10 minutes (600 seconds)
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=600, s-maxage=600, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Get thumbnails error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar thumbnails' },
      { status: 500 }
    );
  }
}
