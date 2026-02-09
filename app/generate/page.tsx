"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThumbnailGenerator } from '@/components/generate/thumbnail-generator';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function GeneratePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gerador de Thumbnails
            </h1>
            <p className="text-gray-600 mt-1">
              Bem-vindo, {session?.user?.email}
            </p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <Button variant="outline">
              Sair
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <ThumbnailGenerator />
        </div>
      </div>
    </div>
  );
}
