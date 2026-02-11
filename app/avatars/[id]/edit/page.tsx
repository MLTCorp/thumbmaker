"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeftIcon, ArrowRightIcon, CameraIcon, UserIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { AvatarUpload, UploadedAvatarPhoto } from '@/components/avatars/avatar-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AvatarPhoto {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface Avatar {
  id: string;
  userId: string;
  name: string;
  photos: AvatarPhoto[];
  createdAt: Date;
  updatedAt: Date;
}

export default function EditAvatarPage() {
  const router = useRouter();
  const params = useParams();
  const avatarId = params.id as string;

  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedAvatarPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');

  // Carousel state
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    fetchAvatar();
  }, [avatarId]);

  const fetchAvatar = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/avatars/${avatarId}`);

      if (!response.ok) {
        throw new Error('Erro ao buscar avatar');
      }

      const data = await response.json();
      setAvatar(data);
      setName(data.name);
    } catch (error) {
      console.error('Fetch avatar error:', error);
      toast.error('Erro ao carregar avatar');
      router.push('/avatars');
    } finally {
      setLoading(false);
    }
  };

  const handleValidationError = (error: string) => {
    toast.error(error);
  };

  const handleUploadComplete = (photos: UploadedAvatarPhoto[]) => {
    setUploadedPhotos(photos);
  };

  const validateForm = (): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError('Nome do avatar é obrigatório');
      isValid = false;
    } else {
      setNameError('');
    }

    // Calculate total photos after edit
    const existingPhotos = avatar?.photos || [];
    const totalPhotos = existingPhotos.length + uploadedPhotos.length;

    if (totalPhotos < 3) {
      toast.error('Mínimo de 3 fotos');
      isValid = false;
    }

    if (totalPhotos > 10) {
      toast.error('Máximo de 10 fotos');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      if (name.trim()) {
        formData.append('name', name.trim());
      }

      // Append new photo files
      uploadedPhotos.forEach((photo) => {
        formData.append('newPhotos', photo.file);
      });

      const response = await fetch(`/api/avatars/${avatarId}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar avatar');
      }

      toast.success('Avatar atualizado com sucesso!');
      router.push('/avatars');
    } catch (error) {
      console.error('Avatar update error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar avatar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    const existingPhotos = avatar?.photos || [];

    // EDGE CASES: Editar avatar para remover fotos deixa <3 mostra erro "Mínimo de 3 fotos"
    const newTotal = existingPhotos.length - 1 + uploadedPhotos.length;
    if (newTotal < 3) {
      toast.error('Mínimo de 3 fotos');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('deletePhotos', photoId);

      const response = await fetch(`/api/avatars/${avatarId}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao remover foto');
      }

      toast.success('Foto removida');
      await fetchAvatar();
    } catch (error) {
      console.error('Remove photo error:', error);
      toast.error('Erro ao remover foto');
    }
  };

  const openCarousel = (index: number) => {
    setCurrentPhotoIndex(index);
    setCarouselOpen(true);
  };

  const nextPhoto = () => {
    if (!avatar) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % avatar.photos.length);
  };

  const prevPhoto = () => {
    if (!avatar) return;
    setCurrentPhotoIndex((prev) => (prev - 1 + avatar.photos.length) % avatar.photos.length);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Carregando avatar...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!avatar) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/avatars">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Editar Avatar</h1>
          <p className="text-gray-600">
            Edite o nome do avatar e gerencie as fotos
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CameraIcon className="h-5 w-5" />
              Editar {avatar.name}
            </CardTitle>
            <CardDescription>
              Altere o nome ou adicione/remova fotos (mantenha entre 3-10)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar name input */}
              <div className="space-y-2">
                <Label htmlFor="avatarName">Nome do Avatar *</Label>
                <Input
                  id="avatarName"
                  type="text"
                  placeholder="Ex: Meu Rosto Principal"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) {
                      setNameError('');
                    }
                  }}
                  className={nameError ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                  maxLength={100}
                />
                {nameError && (
                  <p className="text-sm text-red-500">{nameError}</p>
                )}
              </div>

              {/* Existing photos */}
              {avatar.photos.length > 0 && (
                <div className="space-y-2">
                  <Label>Fotos Atuais ({avatar.photos.length}/10)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {avatar.photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="relative group rounded-lg shadow-sm overflow-hidden bg-gray-100 cursor-pointer"
                        onClick={() => openCarousel(index)}
                      >
                        <AspectRatio ratio={1}>
                          <img
                            src={photo.url}
                            alt={photo.fileName}
                            className="w-full h-full object-cover"
                          />
                        </AspectRatio>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(photo.id);
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors"
                          disabled={isSubmitting}
                        >
                          <XIcon className="h-4 w-4" />
                        </button>

                        {/* Photo info overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-white text-xs truncate">{photo.fileName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new photos */}
              <div className="space-y-2">
                <Label>Adicionar Novas Fotos</Label>
                <AvatarUpload
                  onUploadComplete={handleUploadComplete}
                  onValidationError={handleValidationError}
                />
              </div>

              {/* Submit buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* VISUAL: Modal de edição mostra carousel das 3-10 fotos com navigation buttons (prev/next) */}
      <Dialog open={carouselOpen} onOpenChange={setCarouselOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Visualizar Foto</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={prevPhoto}
              disabled={avatar.photos.length <= 1}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </Button>

            <div className="flex-1">
              <AspectRatio ratio={1} className="bg-gray-100 rounded-lg overflow-hidden">
                {avatar.photos.length > 0 && (
                  <img
                    src={avatar.photos[currentPhotoIndex].url}
                    alt={`Foto ${currentPhotoIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                )}
              </AspectRatio>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={nextPhoto}
              disabled={avatar.photos.length <= 1}
            >
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
          {avatar.photos.length > 0 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              {currentPhotoIndex + 1} de {avatar.photos.length}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
