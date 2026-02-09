"use client";

import { useState, useCallback } from 'react';
import { UploadIcon, XIcon } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface UploadedReference {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface ReferenceUploadProps {
  onUploadComplete?: (references: UploadedReference[]) => void;
  className?: string;
}

export function ReferenceUpload({ onUploadComplete, className }: ReferenceUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedReference[]>([]);

  // Validate file type
  const isFileTypeValid = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
  };

  // Validate file size (max 5MB)
  const isFileSizeValid = (file: File): boolean => {
    return file.size <= 5 * 1024 * 1024; // 5MB
  };

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // EDGE CASES: Upload de 0 arquivos (clicar sem selecionar) não faz nada, não mostra erro
    if (acceptedFiles.length === 0) {
      return;
    }

    // Validate file types
    const invalidTypeFiles = acceptedFiles.filter(f => !isFileTypeValid(f));
    if (invalidTypeFiles.length > 0) {
      toast.error('Tipo de arquivo não suportado');
      return;
    }

    // Validate file sizes
    const invalidSizeFiles = acceptedFiles.filter(f => !isFileSizeValid(f));
    if (invalidSizeFiles.length > 0) {
      toast.error('Arquivo muito grande (máximo 5MB)');
      return;
    }

    // Upload files
    setUploading(true);
    setUploadProgress(0);

    const uploadPromises = acceptedFiles.map(async (file, index) => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const newProgress = prev + (100 / acceptedFiles.length) * 0.1;
            return Math.min(newProgress, 100);
          });
        }, 50);

        const response = await fetch('/api/references', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erro no upload');
        }

        const data = await response.json();
        setUploadProgress(100);

        return {
          id: data.id,
          url: data.fileUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
        };
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Erro no upload: ${file.name}`);
        throw error;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);

      // COMPORTAMENTO: Sistema mostra toast notification "Upload concluído" (Sonner success) após sucesso
      toast.success('Upload concluído');

      setUploadedFiles(prev => [...prev, ...results]);
      onUploadComplete?.(results);
    } catch (error) {
      // COMPORTAMENTO: Sistema mostra toast notification "Erro no upload" (Sonner error) com detalhes se falhar
      toast.error('Erro no upload');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadComplete]);

  // Remove uploaded file
  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
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
    disabled: uploading,
  });

  return (
    <div className={cn("w-full", className)}>
      {/* VISUAL: Dropzone com borda dashed-2px border-gray-300, hover:border-blue-500, padding-8 */}
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
            <UploadIcon className="h-6 w-6 text-gray-500" />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              {isDragActive ? 'Solte os arquivos aqui' : 'Arraste e solte suas referências aqui'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ou clique para selecionar
            </p>
          </div>

          <p className="text-xs text-gray-400">
            JPG, PNG, WEBP (máximo 5MB)
          </p>
        </div>

        {/* VISUAL: Progress bar (0-100%) durante upload, cor green-500, altura 4px, rounded-full */}
        {uploading && uploadProgress > 0 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden" style={{ height: '4px' }}>
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-center">
              {Math.round(uploadProgress)}%
            </p>
          </div>
        )}
      </div>

      {/* VISUAL: Preview da imagem exibida após upload em grid de cards 200x200px, rounded-lg, shadow-sm */}
      {uploadedFiles.length > 0 && (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {uploadedFiles.map((file) => (
            <div
              key={file.id}
              className="relative group rounded-lg shadow-sm overflow-hidden"
              style={{ width: '200px', height: '200px' }}
            >
              <img
                src={file.url}
                alt={file.fileName}
                className="w-full h-full object-cover"
              />

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.id);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={uploading}
              >
                <XIcon className="h-4 w-4" />
              </button>

              {/* File info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs truncate">{file.fileName}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
