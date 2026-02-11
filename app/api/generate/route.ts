import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { uploadOpenRouterImageToStorage } from '@/lib/supabase-storage';

// Allow longer execution for AI image generation
export const maxDuration = 60;

export interface GenerateRequest {
  avatarId: string;
  avatarPhotoId?: string;
  avatarPhotoIndex?: number;
  references: string[];
  textIdea: string;
  additionalPrompt?: string;
}

export interface GenerateResponse {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
}

// Generate optimized prompt based on best practices
function generateOptimizedPrompt(
  textIdea: string,
  avatarPhotoUrl: string,
  references: string[],
  additionalPrompt?: string
): string {
  // Template de best practices para thumbnail do YouTube
  let promptTemplate = `A professional YouTube thumbnail in 1280x720 (16:9 aspect ratio) with the text "${textIdea}" prominently displayed. The thumbnail features a person's face from the attached avatar photo as the main subject. You MUST use the person's face, features, and appearance from the provided avatar image to generate the thumbnail - maintain their identity, skin tone, hair style, and facial features exactly. The design follows YouTube thumbnail best practices: bold contrasting colors, clear readable text overlay, engaging facial expression, professional lighting, and eye-catching composition. ${references.length > 0 ? 'Incorporate visual elements and style inspiration from the attached reference images for consistency.' : ''} The overall aesthetic should be modern, high-energy, and optimized for click-through rate on YouTube.`;

  // Append additional prompt if provided
  if (additionalPrompt && additionalPrompt.trim()) {
    promptTemplate += ` Additional instructions: ${additionalPrompt.trim()}`;
  }

  return promptTemplate;
}

// Convert an image URL to a base64 data URL for reliable model access
async function imageUrlToBase64(url: string): Promise<string | null> {
  try {
    // Already a data URL
    if (url.startsWith('data:')) return url;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Failed to fetch image for base64 conversion:', response.status, response.statusText);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

// Call OpenRouter API to generate thumbnail
async function callOpenRouterAPI(prompt: string, avatarPhotoUrl: string, referenceUrls: string[] = []): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  // Build content with prompt text and avatar photo as image reference
  const content: any[] = [
    {
      type: 'text',
      text: prompt
    }
  ];

  // Add avatar photo as visual reference (convert to base64 for reliable access)
  if (avatarPhotoUrl) {
    const base64Avatar = await imageUrlToBase64(avatarPhotoUrl);
    if (base64Avatar) {
      content.push({
        type: 'image_url',
        image_url: {
          url: base64Avatar
        }
      });
      console.log('Avatar photo added as base64 image reference');
    } else {
      console.warn('Could not convert avatar photo to base64, sending URL directly');
      content.push({
        type: 'image_url',
        image_url: {
          url: avatarPhotoUrl
        }
      });
    }
  }

  // Add reference images as visual context
  for (const refUrl of referenceUrls) {
    const base64Ref = await imageUrlToBase64(refUrl);
    if (base64Ref) {
      content.push({
        type: 'image_url',
        image_url: {
          url: base64Ref
        }
      });
    }
  }

  console.log('Sending content with', content.length, 'items (text + images)');

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
          content: content
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

  console.log('OpenRouter API response keys:', Object.keys(data.choices[0].message));

  if (!data.choices || data.choices.length === 0) {
    console.error('No choices in response:', JSON.stringify(data, null, 2));
    throw new Error('No choices returned from OpenRouter API');
  }

  const choice = data.choices[0];
  const message = choice.message;

  console.log('Message structure:', Object.keys(message));

  // Check for images field (OpenRouter format for image models)
  if (message.images && Array.isArray(message.images) && message.images.length > 0) {
    console.log('Found images field with', message.images.length, 'items');
    for (const img of message.images) {
      console.log('Image item:', JSON.stringify(img, null, 2));
      // Handle image_url type with nested url property
      if (img.type === 'image_url' && img.image_url?.url) {
        const imageUrl = img.image_url.url;
        console.log('Found image_url:', imageUrl.substring(0, 100));
        return imageUrl;
      }
      // Handle image type with data property
      if (img.type === 'image' && img.source?.data) {
        const imageData = img.source.data;
        if (imageData.startsWith('data:')) {
          return imageData;
        }
        // Add prefix if missing - detect format from base64
        const isPng = imageData.startsWith('iVBORw0KGgo');
        const isJpeg = imageData.startsWith('/9j/');
        const mimeType = isPng ? 'png' : isJpeg ? 'jpeg' : 'png';
        return `data:image/${mimeType};base64,${imageData}`;
      }
    }
  }

  // If we couldn't extract an image URL, throw an error
  console.error('OpenRouter API response:', JSON.stringify(data, null, 2));
  throw new Error('Could not extract image URL from OpenRouter API response');
}

export async function POST(request: NextRequest) {
  console.log('=== Generate API called ===');

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

    console.log('Request body:', body);

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

    // Validate additional prompt length (max 500 characters)
    if (body.additionalPrompt && body.additionalPrompt.length > 500) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'O prompt adicional deve ter no máximo 500 caracteres' },
        { status: 400 }
      );
    }

    // Get avatar with Supabase URL
    console.log('Fetching avatar from Supabase:', body.avatarId);
    const avatar = await db.getAvatarById(body.avatarId);
    if (!avatar) {
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'Avatar não encontrado' },
        { status: 404 }
      );
    }

    console.log('Avatar:', avatar);

    // Get selected photo from avatar - support both avatarPhotoId and avatarPhotoIndex
    let selectedPhoto;
    if (body.avatarPhotoId) {
      selectedPhoto = avatar.photos.find(p => p.id === body.avatarPhotoId);
    } else if (typeof body.avatarPhotoIndex === 'number') {
      selectedPhoto = avatar.photos[body.avatarPhotoIndex];
    } else {
      selectedPhoto = avatar.photos[0]; // Default to first photo
    }
    const avatarPhotoUrl = selectedPhoto?.url || '';

    console.log('Selected avatar photo URL:', avatarPhotoUrl);

    // Fetch reference URLs from database
    let referenceUrls: string[] = [];
    if (body.references && body.references.length > 0) {
      const refDetails = await Promise.all(
        body.references.map(id => db.getReferenceById(id))
      );
      referenceUrls = refDetails
        .filter((r): r is NonNullable<typeof r> => r !== null)
        .map(r => r.fileUrl);
      console.log('Fetched', referenceUrls.length, 'reference URLs');
    }

    // Generate optimized prompt with avatar photo as visual reference
    const optimizedPrompt = generateOptimizedPrompt(
      body.textIdea,
      avatarPhotoUrl,
      body.references,
      body.additionalPrompt
    );

    // Call OpenRouter API
    let thumbnailUrl: string;
    try {
      console.log('=== Calling OpenRouter API ===');
      console.log('Prompt:', optimizedPrompt);
      console.log('Avatar photo URL:', avatarPhotoUrl);
      console.log('Reference URLs:', referenceUrls.length);
      thumbnailUrl = await callOpenRouterAPI(optimizedPrompt, avatarPhotoUrl, referenceUrls);
      console.log('OpenRouter returned URL:', thumbnailUrl?.substring(0, 100));
    } catch (error) {
      console.error('=== Error calling OpenRouter API ===');
      console.error('Error:', error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      // EDGE CASES: Falha na API OpenRouter mostra erro "Falha na geração, tente novamente"
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'Falha na geração, tente novamente' },
        { status: 500 }
      );
    }

    // Upload generated image to Supabase Storage and get public URL
    let storageUrl: string;
    try {
      console.log('=== Uploading to Supabase ===');
      console.log('Generated image URL:', thumbnailUrl);
      console.log('User ID:', session.user.id);
      
      // Save to Supabase Storage
      const uploadResult = await uploadOpenRouterImageToStorage(thumbnailUrl, session.user.id);

      console.log('Upload result:', uploadResult);

      storageUrl = uploadResult.url;
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
      // If upload fails, return the base64 URL from OpenRouter
      storageUrl = thumbnailUrl;
    }

    console.log('Final storage URL:', storageUrl);

    // Validate the final storage URL
    if (!storageUrl || (!storageUrl.startsWith('http') && !storageUrl.startsWith('data:image'))) {
      console.error('Validation failed: storage URL is invalid');
      // EDGE CASES: Geração retorna imagem inválida (corrompida) mostra erro "Erro ao processar imagem"
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'Erro ao processar imagem' },
        { status: 500 }
      );
    }

    console.log('=== Validation passed ===');

    // Save to database with the storage URL
    try {
      const newThumbnail = await db.createThumbnail(
        session.user.id,
        body.avatarId,
        avatar.name,
        optimizedPrompt,
        body.textIdea,
        storageUrl,
        body.references,
        body.additionalPrompt
      );

      console.log('Thumbnail saved to database:', newThumbnail.id);

      return NextResponse.json<GenerateResponse>({
        success: true,
        thumbnailUrl: storageUrl
      });
    } catch (error) {
      console.error('Error saving to database:', error);
      return NextResponse.json<GenerateResponse>(
        { success: false, error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in generate API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return NextResponse.json<GenerateResponse>(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
