"use client";

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThreeColumnLayout } from '@/components/generate/three-column-layout';
import { AvatarReferencesColumn } from '@/components/generate/avatar-references-column';
import { ConfigurationColumn } from '@/components/generate/configuration-column';
import { HistoryGridColumn } from '@/components/generate/history-grid-column';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ImageIcon, UserIcon, FolderIcon, ClockIcon } from 'lucide-react';
import Link from 'next/link';

interface Thumbnail {
  id: string;
  userId: string;
  avatarId: string;
  avatarName: string;
  prompt: string;
  textIdea: string;
  thumbnailUrl: string;
  references: string[];
  additionalPrompt?: string;
  createdAt: Date | string;
}

export default function GeneratePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Shared state between columns
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedAvatarPhotoIndex, setSelectedAvatarPhotoIndex] = useState(0);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([]);
  const [newThumbnail, setNewThumbnail] = useState<Thumbnail | null>(null);

  // Handle avatar selection from Column 1 (memoized to prevent useEffect re-firing in child)
  const handleAvatarSelect = useCallback((avatarId: string | null, photoIndex: number) => {
    setSelectedAvatarId(avatarId);
    setSelectedAvatarPhotoIndex(photoIndex);
  }, []);

  // Handle references selection from Column 1 (memoized to prevent useEffect re-firing in child)
  const handleReferencesSelect = useCallback((referenceIds: string[]) => {
    setSelectedReferenceIds(referenceIds);
  }, []);

  // Handle generation success from Column 2 - triggers real-time update in Column 3 and returns thumbnail data for preview
  const handleGenerationSuccess = useCallback(async (thumbnailUrl: string): Promise<Thumbnail | null> => {
    console.log('Thumbnail generated:', thumbnailUrl);

    // Fetch the latest thumbnail from API to get full data
    try {
      const response = await fetch('/api/thumbnails');
      if (response.ok) {
        const thumbnails = await response.json();
        if (thumbnails.length > 0) {
          // Get the most recent thumbnail (first in array)
          const latestThumbnail = thumbnails[0];
          setNewThumbnail(latestThumbnail);
          return latestThumbnail;
        }
      }
    } catch (error) {
      console.error('Error fetching latest thumbnail:', error);
    }
    return null;
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="border-b bg-white">
        <div className="max-w-full px-6 py-4">
          <div className="mb-2">
            <Breadcrumb
              items={[
                { label: 'Gerar' },
              ]}
            />
          </div>
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gerador de Thumbnails
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Bem-vindo, {session?.user?.email}
              </p>
            </div>
            <form action="/api/auth/signout" method="POST">
              <Button variant="outline" size="sm">
                Sair
              </Button>
            </form>
          </div>

          <nav className="flex gap-2">
            <Link href="/avatars">
              <Button variant="outline" size="sm">
                <UserIcon className="h-4 w-4 mr-1" />
                Avatars
              </Button>
            </Link>
            <Link href="/references">
              <Button variant="outline" size="sm">
                <FolderIcon className="h-4 w-4 mr-1" />
                Referências
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="outline" size="sm">
                <ClockIcon className="h-4 w-4 mr-1" />
                Histórico
              </Button>
            </Link>
          </nav>
        </div>
      </div>

      {/* Three Column Layout */}
      <ThreeColumnLayout
        leftColumn={
          <AvatarReferencesColumn
            onAvatarSelect={handleAvatarSelect}
            onReferencesSelect={handleReferencesSelect}
          />
        }
        centerColumn={
          <ConfigurationColumn
            selectedAvatarId={selectedAvatarId}
            selectedAvatarPhotoIndex={selectedAvatarPhotoIndex}
            selectedReferenceIds={selectedReferenceIds}
            onGenerationSuccess={handleGenerationSuccess}
          />
        }
        rightColumn={
          <HistoryGridColumn newThumbnail={newThumbnail} />
        }
      />
    </div>
  );
}
