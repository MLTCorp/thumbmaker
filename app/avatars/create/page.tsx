"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AvatarUpload, UploadedAvatarPhoto } from '@/components/avatars/avatar-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { UserIcon } from 'lucide-react';

export default function CreateAvatarPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedAvatarPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');

  // Handle validation error from upload component
  const handleValidationError = (error: string) => {
    toast.error(error);
  };

  // Handle upload complete
  const handleUploadComplete = (photos: UploadedAvatarPhoto[]) => {
    setUploadedPhotos(photos);
  };

  // Validate form
  const validateForm = (): boolean => {
    let isValid = true;

    // EDGE CASES: Tentar criar avatar sem nome mostra erro "Nome do avatar é obrigatório"
    if (!name.trim()) {
      setNameError('Nome do avatar é obrigatório');
      isValid = false;
    } else {
      setNameError('');
    }

    // COMPORTAMENTO: Sistema mostra erro "Mínimo de 3 fotos obrigatório" se tentar criar com <3
    if (uploadedPhotos.length < 3) {
      toast.error('Mínimo de 3 fotos obrigatório');
      isValid = false;
    }

    return isValid;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('name', name.trim());

      // Append all photo files
      uploadedPhotos.forEach((photo) => {
        formData.append('photos', photo.file);
      });

      // Send to API
      const response = await fetch('/api/avatars', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar avatar');
      }

      const avatar = await response.json();

      toast.success('Avatar criado com sucesso!');

      // Redirect to avatars list or dashboard
      router.push('/avatars');
    } catch (error) {
      console.error('Avatar creation error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar avatar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Novo Avatar</h1>
          <p className="text-gray-600">
            Carregue 3-10 fotos da sua face para criar um avatar que será usado nas thumbnails
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Informações do Avatar
            </CardTitle>
            <CardDescription>
              Dê um nome para o seu avatar e carregue as fotos
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

              {/* Avatar photo upload */}
              <div className="space-y-2">
                <Label>Fotos da Face *</Label>
                <AvatarUpload
                  onUploadComplete={handleUploadComplete}
                  onValidationError={handleValidationError}
                />
              </div>

              {/* Submit button */}
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
                  disabled={isSubmitting || uploadedPhotos.length < 3}
                >
                  {isSubmitting ? 'Criando Avatar...' : 'Criar Avatar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
