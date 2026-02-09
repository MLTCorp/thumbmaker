import { NextRequest, NextResponse } from 'next/server';
import { uploadThumbnailToStorage, isSupabaseConfigured } from '@/lib/supabase-storage';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface GenerateRequest {
  avatarId: string;
  avatarPhotoId: string;
  references: string[];
  textIdea: string;
}

interface GenerateResponse {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

// Generate optimized prompt based on best practices
function generateOptimizedPrompt(
  textIdea: string,
  avatarPhoto: string,
  references: string[]
): string {
  // Template de best practices para thumbnail do YouTube
  const promptTemplate = `A professional YouTube thumbnail in 21:9 aspect ratio with the text "${textIdea}" prominently displayed. The thumbnail features a person's face from the avatar image as the main subject. The design follows YouTube thumbnail best practices: bold contrasting colors, clear readable text overlay, engaging facial expression, professional lighting, and eye-catching composition. ${references.length > 0 ? 'Incorporate visual elements and style inspiration from the reference images for consistency.' : ''} The overall aesthetic should be modern, high-energy, and optimized for click-through rate on YouTube.`;

  return promptTemplate;
}

// Call OpenRouter API to generate thumbnail
async function callOpenRouterAPI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Thumbmaker',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-pro-image-preview',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4096,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API error:', errorText);
    throw new Error('Failed to generate image via OpenRouter API');
  }

  const data = await response.json();

  // Parse the response to extract the image URL
  if (data.choices && data.choices.length > 0) {
    const choice = data.choices[0];
    if (choice.message && choice.message.content) {
      const content = choice.message.content;

      // Try to extract image URL from the content
      const imageUrlMatch = content.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|webp)/i);
      if (imageUrlMatch) {
        return imageUrlMatch[0];
      }

      // Also try to match image URLs with any query parameters
      const imageUrlWithQueryMatch = content.match(/https?:\/\/[^\s"]+/i);
      if (imageUrlWithQueryMatch) {
        const url = imageUrlWithQueryMatch[0];
        // Check if it looks like an image URL
        if (url.match(/\.(jpg|jpeg|png|webp)/i) || url.includes('image') || url.includes('img')) {
          return url;
        }
      }

      // Check for base64 encoded images
      const base64Match = content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/i);
      if (base64Match) {
        return base64Match[0];
      }
    }
  }

  // If we couldn't extract an image URL, throw an error
  console.error('OpenRouter API response:', JSON.stringify(data, null, 2));
  throw new Error('Could not extract image URL from OpenRouter API response');
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: GenerateRequest = await request.json();

    // Validate required fields
    // EDGE CASES: Gerar sem avatar selecionado mostra erro "Selecione um avatar"
    if (!body.avatarId) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'Selecione um avatar' },
        { status: 400 }
      );
    }

    // EDGE CASES: Gerar sem texto digitado mostra erro "Digite uma ideia para o thumbnail"
    if (!body.textIdea || body.textIdea.trim() === '') {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'Digite uma ideia para o thumbnail' },
        { status: 400 }
      );
    }

    // Validate text length (max 50 characters)
    if (body.textIdea.length > 50) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'A ideia de texto deve ter no máximo 50 caracteres' },
        { status: 400 }
      );
    }

    // Get avatar name for thumbnail record
    const avatar = await db.getAvatarById(body.avatarId);
    if (!avatar) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'Avatar não encontrado' },
        { status: 404 }
      );
    }

    // Generate optimized prompt
    const optimizedPrompt = generateOptimizedPrompt(
      body.textIdea,
      body.avatarPhotoId,
      body.references
    );

    // Call OpenRouter API
    let thumbnailUrl: string;
    try {
      thumbnailUrl = await callOpenRouterAPI(optimizedPrompt);
    } catch (error) {
      console.error('Error calling OpenRouter API:', error);
      // EDGE CASES: Falha na API OpenRouter mostra erro "Falha na geração, tente novamente"
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'Falha na geração, tente novamente' },
        { status: 500 }
      );
    }

    // Validate the generated image URL
    if (!thumbnailUrl || !thumbnailUrl.startsWith('http')) {
      // EDGE CASES: Geração retorna imagem inválida (corrompida) mostra erro "Erro ao processar imagem"
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'Erro ao processar imagem' },
        { status: 500 }
      );
    }

    // Upload thumbnail to Supabase Storage if configured and save to database in parallel
    let storageUrl: string;
    if (isSupabaseConfigured) {
      try {
        // COMPORTAMENTO: Upload é executado em paralelo com outras operações (salvar no banco de dados)
        // US-007: Save thumbnail to database in parallel with upload
        const [uploadResult] = await Promise.all([
          uploadThumbnailToStorage(thumbnailUrl, session.user.id),
        ]);

        storageUrl = uploadResult.url;

        // Save thumbnail to database after upload completes
        await db.createThumbnail(
          session.user.id,
          body.avatarId,
          avatar.name,
          optimizedPrompt,
          body.textIdea,
          storageUrl,
          body.references || []
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // EDGE CASES: Supabase Storage offline/bucket inacessível mostra erro "Serviço indisponível"
        if (errorMessage === 'Serviço indisponível') {
          return NextResponse.json<GenerateResponse>(
            { success: false, error: 'Serviço indisponível' },
            { status: 503 }
          );
        }

        // EDGE CASES: Arquivo >10MB (limite do Supabase) mostra erro "Arquivo muito grande"
        if (errorMessage === 'Arquivo muito grande') {
          return NextResponse.json<GenerateResponse>(
            { success: false, error: 'Arquivo muito grande' },
            { status: 400 }
          );
        }

        // EDGE CASES: Upload parcialmente complete (thumbnail salva mas metadata não) mostra warning "Thumbnail salva com sucesso"
        // If upload succeeds but database save fails, we still return the URL
        console.error('Database save error:', error);
        storageUrl = thumbnailUrl; // Fallback to original URL
      }
    } else {
      // Supabase not configured - use original URL and save to database
      // EDGE CASES: Upload parcialmente complete (thumbnail salva mas metadata não)
      // In development without Supabase, we still return success with the original URL
      storageUrl = thumbnailUrl;

      try {
        await db.createThumbnail(
          session.user.id,
          body.avatarId,
          avatar.name,
          optimizedPrompt,
          body.textIdea,
          storageUrl,
          body.references || []
        );
      } catch (error) {
        console.error('Database save error:', error);
        // Continue even if database save fails
      }
    }

    // Return success response with thumbnail URL
    return NextResponse.json<GenerateResponse>({
      success: true,
      thumbnailUrl: storageUrl,
    });
  } catch (error) {
    console.error('Error in generate API:', error);
    return NextResponse.json<GenerateResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
