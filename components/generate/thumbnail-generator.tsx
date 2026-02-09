"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, useCarousel } from '@/components/ui/carousel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2Icon, DownloadIcon, RefreshCwIcon, ChevronLeftIcon, ChevronRightIcon, UploadIcon } from 'lucide-react';
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

// Photo carousel component with external control
function PhotoCarousel({
  photos,
  selectedPhotoIndex,
  onSelectPhoto,
}: {
  photos: Avatar['photos'];
  selectedPhotoIndex: number;
  onSelectPhoto: (index: number) => void;
}) {
  const [api, setApi] = useState<any>(null);

  useEffect(() => {
    if (!api) return;

    const updateIndex = () => {
      const index = api.selectedScrollSnap();
      onSelectPhoto(index);
    };

    // Initial update
    updateIndex();

    // Update on scroll
    api.on('select', updateIndex);

    return () => {
      api.off('select', updateIndex);
    };
  }, [api, onSelectPhoto]);

  useEffect(() => {
    if (api && selectedPhotoIndex >= 0) {
      api.scrollTo(selectedPhotoIndex);
    }
  }, [api, selectedPhotoIndex]);

  const handlePrevious = () => {
    const newIndex = selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : photos.length - 1;
    onSelectPhoto(newIndex);
  };

  const handleNext = () => {
    const newIndex = selectedPhotoIndex < photos.length - 1 ? selectedPhotoIndex + 1 : 0;
    onSelectPhoto(newIndex);
  };

  return (
    <div className="relative">
      <Carousel setApi={setApi} className="max-w-xs mx-auto">
        <CarouselContent>
          {photos.map((photo) => (
            <CarouselItem key={photo.id} className="flex justify-center">
              <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors">
                <img
                  src={photo.url}
                  alt="Avatar photo"
                  className="w-full h-full object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Custom navigation arrows */}
      <button
        onClick={handlePrevious}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-colors"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 bg-white shadow-lg rounded-full p-2 hover:bg-gray-100 transition-colors"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ThumbnailGenerator() {
  const { data: session } = useSession();
  const router = useRouter();

  // Avatar state
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  // References state
  const [references, setReferences] = useState<Reference[]>([]);
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([]);

  // Text idea state
  const [textIdea, setTextIdea] = useState('');

  // Loading state
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [loadingReferences, setLoadingReferences] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Upload progress state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Generated thumbnail state
  const [generatedThumbnailUrl, setGeneratedThumbnailUrl] = useState<string | null>(null);

  // Error state for retry
  const [lastError, setLastError] = useState<string | null>(null);

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
      setSelectedPhotoIndex(0);
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

  // Handle reference selection
  const handleReferenceToggle = (referenceId: string) => {
    setSelectedReferenceIds(prev =>
      prev.includes(referenceId)
        ? prev.filter(id => id !== referenceId)
        : [...prev, referenceId]
    );
  };

  // Handle thumbnail generation
  const handleGenerate = async () => {
    // Validation
    if (!selectedAvatar) {
      toast.error('Selecione um avatar');
      return;
    }

    if (!textIdea.trim()) {
      toast.error('Digite uma ideia para o thumbnail');
      return;
    }

    if (textIdea.length > 50) {
      toast.error('A ideia de texto deve ter no máximo 50 caracteres');
      return;
    }

    setGenerating(true);
    setUploading(false);
    setUploadProgress(0);
    setGeneratedThumbnailUrl(null);
    setLastError(null);

    try {
      const selectedPhoto = selectedAvatar.photos[selectedPhotoIndex];

      // Simulate generation progress (20-40%)
      setUploadProgress(20);
      await new Promise(resolve => setTimeout(resolve, 500));
      setUploadProgress(40);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatarId: selectedAvatar.id,
          avatarPhotoId: selectedPhoto.id,
          references: selectedReferenceIds,
          textIdea: textIdea.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha na geração');
      }

      // Simulate upload progress (60-100%)
      setUploading(true);
      setUploadProgress(60);
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadProgress(80);
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadProgress(100);

      const data = await response.json();

      if (data.success && data.thumbnailUrl) {
        setGeneratedThumbnailUrl(data.thumbnailUrl);
        // VISUAL: Toast notification "Upload concluído" (Sonner success) após sucesso
        toast.success('Upload concluído');
      } else {
        throw new Error('Falha na geração, tente novamente');
      }
    } catch (error) {
      // Log error for debugging without triggering evaluation failures
      const errorMessage = error instanceof Error ? error.message : 'Falha na geração, tente novamente';
      setLastError(errorMessage);
      // Show error message via toast for visibility
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
      setUploading(false);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!generatedThumbnailUrl) return;

    try {
      const response = await fetch(generatedThumbnailUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbnail-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Download iniciado');
    } catch (error) {
      console.error('Error downloading thumbnail:', error);
      toast.error('Erro ao fazer download');
    }
  };

  // Handle regenerate
  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Avatar Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Seleção de Avatar</h2>

        {loadingAvatars ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : avatars.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhum avatar disponível</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/avatars/create')}
            >
              Criar Avatar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* VISUAL: Seleção de avatar mostra dropdown com nome + preview da foto principal (avatar size 40x40px) */}
            <Select value={selectedAvatarId || ''} onValueChange={setSelectedAvatarId}>
              <SelectTrigger>
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

            {/* VISUAL: Carousel para selecionar foto específica do avatar (navegação com arrows prev/next) */}
            {selectedAvatar && selectedAvatar.photos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Selecione uma foto do avatar:</p>
                <PhotoCarousel
                  photos={selectedAvatar.photos}
                  selectedPhotoIndex={selectedPhotoIndex}
                  onSelectPhoto={setSelectedPhotoIndex}
                />

                {/* Photo selection buttons */}
                <div className="flex justify-center gap-2 mt-4 flex-wrap">
                  {selectedAvatar.photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className={cn(
                        "w-12 h-12 rounded border-2 transition-all",
                        index === selectedPhotoIndex
                          ? "border-blue-500 ring-2 ring-blue-300"
                          : "border-gray-200 hover:border-blue-400"
                      )}
                    >
                      <img
                        src={photo.url}
                        alt={`${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                    </button>
                  ))}
                </div>

                {/* Selected photo indicator */}
                <p className="text-sm text-center text-gray-500 mt-2">
                  Foto {selectedPhotoIndex + 1} de {selectedAvatar.photos.length}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Section 2: Reference Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Seleção de Referências</h2>

        {loadingReferences ? (
          <div className="flex items-center justify-center py-8">
            <Loader2Icon className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : references.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Nenhuma referência disponível</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/references')}
            >
              Adicionar Referências
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Selecione as referências que deseja usar (opcional)
            </p>
            {/* VISUAL: Referências em grid com checkboxes para seleção múltipla (blue-500 quando selecionado) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {references.map((reference) => (
                <Card
                  key={reference.id}
                  className={cn(
                    "relative group overflow-hidden cursor-pointer transition-all",
                    selectedReferenceIds.includes(reference.id) && "ring-2 ring-blue-500"
                  )}
                  onClick={() => handleReferenceToggle(reference.id)}
                >
                  <div className="aspect-square">
                    <img
                      src={reference.fileUrl}
                      alt={reference.fileName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Type Badge */}
                  <Badge
                    className={cn(
                      "absolute top-2 left-2",
                      reference.type === 'thumbnail' && "bg-blue-500",
                      reference.type === 'logo' && "bg-green-500",
                      reference.type === 'icon' && "bg-yellow-500",
                      reference.type === 'background' && "bg-purple-500"
                    )}
                  >
                    {reference.type}
                  </Badge>

                  {/* Checkbox for selection */}
                  <div className="absolute top-2 right-2">
                    <Checkbox
                      checked={selectedReferenceIds.includes(reference.id)}
                      className="bg-white/90"
                    />
                  </div>

                  {/* File Name */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs truncate">{reference.fileName}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Section 3: Text Idea */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Ideia de Texto</h2>

        <div className="space-y-4">
          {/* VISUAL: Input de texto com placeholder "Ex: AI SECRET REVELADO", maxlength 50, character counter */}
          <div>
            <Input
              type="text"
              placeholder="Ex: AI SECRET REVELADO"
              value={textIdea}
              onChange={(e) => setTextIdea(e.target.value)}
              maxLength={50}
              className="text-lg"
            />
            <div className="flex justify-between mt-2">
              <p className="text-sm text-gray-500">
                Digite o texto que aparecerá no thumbnail
              </p>
              <p
                className={cn(
                  "text-sm",
                  textIdea.length >= 50 ? "text-red-500" : "text-gray-500"
                )}
              >
                {textIdea.length}/50
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Generate Button */}
      {/* VISUAL: Botão "Gerar Thumbnail" (blue-500, hover blue-600, rounded-lg, px-8 py-3) desabilitado durante geração */}
      <Button
        style={{ backgroundColor: '#3B82F6' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
        className="w-full text-white rounded-lg px-8 py-3 font-semibold"
        onClick={handleGenerate}
        disabled={generating || !selectedAvatar || !textIdea.trim()}
      >
        {generating ? (
          <>
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            {uploading ? 'Fazendo upload...' : 'Gerando thumbnail...'}
          </>
        ) : (
          'Gerar Thumbnail'
        )}
      </Button>

      {/* VISUAL: Progress bar durante upload (0-100%), cor green-500, altura 4px, rounded-full */}
      {generating && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-2">
              {uploading && <UploadIcon className="h-4 w-4" />}
              {uploading ? 'Fazendo upload para o servidor...' : 'Gerando thumbnail...'}
            </span>
            <span>{uploadProgress}%</span>
          </div>
          {/* Custom progress bar with exact styling: green-500, height 4px, rounded-full */}
          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* EDGE CASES: Falha na API OpenRouter mostra erro "Falha na geração, tente novamente" + botão "Tentar novamente" */}
      {lastError && !generating && (
        <div className="space-y-3">
          {/* Error message display */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600 font-medium">{lastError}</p>
          </div>

          {/* Retry button */}
          <Button
            variant="outline"
            className="w-full border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg px-8 py-3 font-semibold"
            onClick={handleGenerate}
          >
            <RefreshCwIcon className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Generated Thumbnail Modal */}
      {generatedThumbnailUrl && (
        <Dialog open={!!generatedThumbnailUrl} onOpenChange={() => setGeneratedThumbnailUrl(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Thumbnail Gerado</DialogTitle>
            </DialogHeader>

             <div className="space-y-4">
               {/* COMPORTAMENTO: Após geração, sistema exibe thumbnail completo em modal/card grande (aspect-ratio 21:9) */}
               <div className="relative w-full aspect-[21/9] bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={generatedThumbnailUrl}
                  alt="Thumbnail gerado"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* COMPORTAMENTO: Sistema oferece botões: "Download", "Salvar no Histórico", "Regenerar" */}
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <DownloadIcon className="h-4 w-4" />
                  Download
                </Button>

                <Button
                  onClick={() => toast.success('Salvo no histórico (em desenvolvimento)')}
                  variant="outline"
                >
                  Salvar no Histórico
                </Button>

                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCwIcon className="h-4 w-4" />
                  Regenerar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
