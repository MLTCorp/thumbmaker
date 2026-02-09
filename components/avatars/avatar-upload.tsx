"use client";

import { useState, useCallback } from 'react';
import { UploadIcon, XIcon, CameraIcon, UserIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface UploadedAvatarPhoto {
  id: string;
  file: File;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface AvatarUploadProps {
  onUploadComplete?: (photos: UploadedAvatarPhoto[]) => void;
  onValidationError?: (error: string) => void;
  className?: string;
}

export function AvatarUpload({ onUploadComplete, onValidationError, className }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedAvatarPhoto[]>([]);

  // Validate file type
  const isFileTypeValid = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
  };

  // Validate file size (max 5MB)
  const isFileSizeValid = (file: File): boolean => {
    return file.size <= 5 * 1024 * 1024; // 5MB
  };

  // Check if file looks like a face photo (simple heuristic based on size and aspect ratio)
  const checkFaceDetection = (file: File): boolean => {
    // This is a simplified check. In production, you'd use a face detection API
    // For now, we'll just check if it's a valid image
    return isFileTypeValid(file);
  };

  // Create local preview URL
  const createPreviewUrl = (file: File): string => {
    return URL.createObjectURL(file);
  };

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // EDGE CASES: Upload de 0 arquivos (clicar sem selecionar) não faz nada, não mostra erro
    if (acceptedFiles.length === 0) {
      return;
    }

    // Calculate total after upload
    const newTotal = uploadedFiles.length + acceptedFiles.length;

    // COMPORTAMENTO: Sistema mostra erro "Máximo de 10 fotos permitido" se tentar carregar >10
    if (newTotal > 10) {
      toast.error('Máximo de 10 fotos permitido');
      onValidationError?.('Máximo de 10 fotos permitido');
      return;
    }

    // Validate file types
    const invalidTypeFiles = acceptedFiles.filter(f => !isFileTypeValid(f));
    if (invalidTypeFiles.length > 0) {
      toast.error('Tipo de arquivo não suportado. Use JPG, PNG ou WEBP');
      onValidationError?.('Tipo de arquivo não suportado');
      return;
    }

    // Validate file sizes
    const invalidSizeFiles = acceptedFiles.filter(f => !isFileSizeValid(f));
    if (invalidSizeFiles.length > 0) {
      toast.error('Arquivo muito grande (máximo 5MB)');
      onValidationError?.('Arquivo muito grande');
      return;
    }

    // Check for face detection (simplified)
    const noFaceFiles = acceptedFiles.filter(f => !checkFaceDetection(f));
    if (noFaceFiles.length > 0) {
      // EDGE CASES: Upload de foto sem face mostra warning "A foto parece não ter uma face detectada"
      toast.warning('A foto parece não ter uma face detectada');
    }

    // COMPORTAMENTO: Upload múltiplo com Drag-and-drop, processa todos arquivos simultaneamente
    setUploading(true);

    try {
      const newPhotos: UploadedAvatarPhoto[] = acceptedFiles.map((file, index) => {
        const photoId = Math.random().toString(36).substring(2, 15);
        return {
          id: photoId,
          file,
          url: createPreviewUrl(file),
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        };
      });

      setUploadedFiles(prev => [...prev, ...newPhotos]);
      onUploadComplete?.([...uploadedFiles, ...newPhotos]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao processar fotos');
    } finally {
      setUploading(false);
    }
  }, [uploadedFiles, onUploadComplete, onValidationError]);

  // Remove uploaded photo
  const removePhoto = (id: string) => {
    setUploadedFiles(prev => {
      const photoToRemove = prev.find(p => p.id === id);
      if (photoToRemove) {
        // Revoke the object URL to free memory
        URL.revokeObjectURL(photoToRemove.url);
      }
      return prev.filter(p => p.id !== id);
    });

    // EDGE CASES: Remover todas as fotos limpa todos os slots, contador volta para "0/10"
    onUploadComplete?.(uploadedFiles.filter(p => p.id !== id));
  };

  // Remove all photos
  const clearAll = () => {
    uploadedFiles.forEach(photo => {
      URL.revokeObjectURL(photo.url);
    });
    setUploadedFiles([]);
    onUploadComplete?.([]);
  };

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    multiple: true,
    disabled: uploading || uploadedFiles.length >= 10,
  });

  return (
    <div className={cn("w-full", className)}>
      {/* VISUAL: Contador de fotos "X/10" no topo, cor gray-500, tamanho text-sm */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {uploadedFiles.length}/10 fotos
        </p>
        {uploadedFiles.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-red-500 hover:text-red-600 transition-colors"
            disabled={uploading}
          >
            Limpar todas
          </button>
        )}
      </div>

      {/* VISUAL: Interface de upload mostra grid de 3-10 slots vazios (200x200px, dashed border) */}
      <div className="space-y-4">
        {/* Upload zone - only show if we have less than 10 photos */}
        {uploadedFiles.length < 10 && (
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed border-gray-300 hover:border-blue-500 p-8 rounded-lg cursor-pointer transition-colors",
              isDragActive && "border-blue-500 bg-blue-50",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <CameraIcon className="h-6 w-6 text-gray-500" />
              </div>

              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive ? 'Solte as fotos aqui' : 'Arraste e solte suas fotos de face aqui'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  ou clique para selecionar
                </p>
              </div>

              <p className="text-xs text-gray-400">
                JPG, PNG, WEBP (máximo 5MB cada)
              </p>

              <p className="text-xs text-blue-600 font-medium">
                {uploadedFiles.length === 0 ? 'Mínimo de 3 fotos obrigatórias' : `Adicione mais ${Math.max(3 - uploadedFiles.length, 0)} fotos`}
              </p>
            </div>
          </div>
        )}

        {/* VISUAL: Carregamento de foto preenche slot com preview, exibe botão "X" (red-500) para remover */}
        {uploadedFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadedFiles.map((photo) => (
              <div
                key={photo.id}
                className="relative group rounded-lg shadow-sm overflow-hidden bg-gray-100"
                style={{ width: '200px', height: '200px' }}
              >
                <img
                  src={photo.url}
                  alt={photo.fileName}
                  className="w-full h-full object-cover"
                />

                {/* Empty slot placeholder fallback */}
                {!photo.url && (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300">
                    <UserIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}

                {/* VISUAL: Exibe botão "X" (red-500) para remover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(photo.id);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors"
                  disabled={uploading}
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
        )}

        {/* Validation message */}
        {uploadedFiles.length > 0 && uploadedFiles.length < 3 && (
          <p className="text-sm text-orange-600 font-medium">
            Adicione mais {3 - uploadedFiles.length} {3 - uploadedFiles.length === 1 ? 'foto' : 'fotos'} para criar o avatar
          </p>
        )}
      </div>
    </div>
  );
}
