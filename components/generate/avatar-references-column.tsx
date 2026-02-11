"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeftIcon, ChevronRightIcon, UserIcon, FolderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Reference {
  id: string;
  type: 'thumbnail' | 'logo' | 'icon' | 'background';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  createdAt: Date;
}

interface Avatar {
  id: string;
  name: string;
  photos: Array<{
    id: string;
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface AvatarReferencesColumnProps {
  onAvatarSelect?: (avatarId: string | null, photoIndex: number) => void;
  onReferencesSelect?: (referenceIds: string[]) => void;
}

export function AvatarReferencesColumn({
  onAvatarSelect,
  onReferencesSelect
}: AvatarReferencesColumnProps) {
  const router = useRouter();

  // Avatar state
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // References state
  const [references, setReferences] = useState<Reference[]>([]);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([]);

  // Loading state
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [loadingReferences, setLoadingReferences] = useState(true);

  // Load avatars and references on mount
  useEffect(() => {
    loadAvatars();
    loadReferences();
  }, []);

  // Update selected avatar when avatar ID changes
  useEffect(() => {
    if (selectedAvatarId) {
      const avatar = avatars.find(a => a.id === selectedAvatarId);
      setSelectedAvatar(avatar || null);
    } else {
      setSelectedAvatar(null);
    }
  }, [selectedAvatarId, avatars]);

  // Load avatars from API
  const loadAvatars = async () => {
    try {
      const response = await fetch('/api/avatars');
      if (!response.ok) throw new Error('Failed to load avatars');
      const data = await response.json();
      setAvatars(data);
    } catch (error) {
      console.error('Error loading avatars:', error);
      toast.error('Erro ao carregar avatars');
    } finally {
      setLoadingAvatars(false);
    }
  };

  // Load references from API
  const loadReferences = async () => {
    try {
      const response = await fetch('/api/references');
      if (!response.ok) throw new Error('Failed to load references');
      const data = await response.json();
      setReferences(data);
    } catch (error) {
      console.error('Error loading references:', error);
      toast.error('Erro ao carregar referências');
    } finally {
      setLoadingReferences(false);
    }
  };

  // Handle avatar selection - notify parent directly
  const handleAvatarChange = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
    setSelectedPhotoIndex(0);
    onAvatarSelect?.(avatarId, 0);
  };

  // Handle reference selection - notify parent directly
  const handleReferenceToggle = (referenceId: string) => {
    const next = selectedReferenceIds.includes(referenceId)
      ? selectedReferenceIds.filter(id => id !== referenceId)
      : [...selectedReferenceIds, referenceId];
    setSelectedReferenceIds(next);
    onReferencesSelect?.(next);
  };

  // Handle photo navigation - notify parent directly
  const handlePrevPhoto = () => {
    if (!selectedAvatar || selectedAvatar.photos.length === 0) return;
    const newIndex = selectedPhotoIndex > 0
      ? selectedPhotoIndex - 1
      : selectedAvatar.photos.length - 1;
    setSelectedPhotoIndex(newIndex);
    onAvatarSelect?.(selectedAvatarId, newIndex);
  };

  const handleNextPhoto = () => {
    if (!selectedAvatar || selectedAvatar.photos.length === 0) return;
    const newIndex = selectedPhotoIndex < selectedAvatar.photos.length - 1
      ? selectedPhotoIndex + 1
      : 0;
    setSelectedPhotoIndex(newIndex);
    onAvatarSelect?.(selectedAvatarId, newIndex);
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Avatar</h3>

        {loadingAvatars ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ) : avatars.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-4">
            <div className="rounded-full bg-gray-100 p-4">
              <UserIcon className="h-12 w-12 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Nenhum avatar disponível</p>
              <p className="text-sm text-gray-500">Crie um avatar para começar</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] lg:min-h-0 transition-all duration-300"
              onClick={() => router.push('/avatars/create')}
            >
              <UserIcon className="h-4 w-4 mr-2" />
              Criar Avatar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Avatar Dropdown */}
            <Select value={selectedAvatarId || ''} onValueChange={handleAvatarChange}>
              <SelectTrigger className="min-h-[44px] lg:min-h-0 transition-all duration-300">
                <SelectValue placeholder="Selecione um avatar" />
              </SelectTrigger>
              <SelectContent>
                {avatars.map((avatar) => {
                  const mainPhoto = avatar.photos[0];
                  return (
                    <SelectItem key={avatar.id} value={avatar.id}>
                      <div className="flex items-center gap-2">
                        {mainPhoto && (
                          <img
                            src={mainPhoto.url}
                            alt={avatar.name}
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <span>{avatar.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Photo Carousel */}
            {selectedAvatar && selectedAvatar.photos.length > 0 && (
              <div className="space-y-3">
                <div className="relative">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                    <img
                      src={selectedAvatar.photos[selectedPhotoIndex].url}
                      alt={`Foto ${selectedPhotoIndex + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Navigation Arrows */}
                  {selectedAvatar.photos.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevPhoto}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-colors"
                        aria-label="Foto anterior"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleNextPhoto}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-colors"
                        aria-label="Próxima foto"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Photo Indicator */}
                <p className="text-sm text-center text-gray-500">
                  Foto {selectedPhotoIndex + 1} de {selectedAvatar.photos.length}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* References Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 mt-6">
          Referências {selectedReferenceIds.length > 0 && `(${selectedReferenceIds.length} ${selectedReferenceIds.length === 1 ? 'selecionada' : 'selecionadas'})`}
        </h3>

        {loadingReferences ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : references.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-4">
            <div className="rounded-full bg-gray-100 p-4">
              <FolderIcon className="h-12 w-12 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Nenhuma referência disponível</p>
              <p className="text-sm text-gray-500">Adicione referências para personalizar</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] lg:min-h-0 transition-all duration-300"
              onClick={() => router.push('/references')}
            >
              <FolderIcon className="h-4 w-4 mr-2" />
              Adicionar Referências
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 gap-3 pr-4">
              {references.map((reference) => (
                <div
                  key={reference.id}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-300 hover:shadow-md",
                    selectedReferenceIds.includes(reference.id)
                      ? "ring-2 ring-blue-500 border-blue-500"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => handleReferenceToggle(reference.id)}
                >
                  <img
                    src={reference.fileUrl}
                    alt={reference.fileName}
                    className="w-full h-full object-cover"
                  />

                  {/* Checkbox */}
                  <div className="absolute top-2 right-2">
                    <div className="bg-white rounded shadow-sm p-0.5">
                      <Checkbox
                        checked={selectedReferenceIds.includes(reference.id)}
                        className="pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
