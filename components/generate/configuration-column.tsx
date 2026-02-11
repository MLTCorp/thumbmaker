"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { Loader2Icon, DownloadIcon, RefreshCwIcon, UploadIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ConfigurationColumnProps {
  selectedAvatarId: string | null;
  selectedAvatarPhotoIndex: number;
  selectedReferenceIds: string[];
  onGenerationSuccess?: (thumbnailUrl: string) => Promise<Thumbnail | null>;
}

export function ConfigurationColumn({
  selectedAvatarId,
  selectedAvatarPhotoIndex,
  selectedReferenceIds,
  onGenerationSuccess
}: ConfigurationColumnProps) {
  // Text idea state
  const [textIdea, setTextIdea] = useState('');

  // Additional prompt state
  const [additionalPrompt, setAdditionalPrompt] = useState('');

  // Loading state
  const [generating, setGenerating] = useState(false);

  // Upload progress state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Generated thumbnail state - now stores full thumbnail object for preview modal
  const [generatedThumbnail, setGeneratedThumbnail] = useState<Thumbnail | null>(null);

  // Error state for retry
  const [lastError, setLastError] = useState<string | null>(null);

  // Handle thumbnail generation
  const handleGenerate = async () => {
    if (!selectedAvatarId || !textIdea.trim()) return;

    setGenerating(true);
    setLastError(null);
    setUploadProgress(0);

    console.log('=== Iniciando geração ===');
    console.log('Avatar ID:', selectedAvatarId);
    console.log('Photo Index:', selectedAvatarPhotoIndex);
    console.log('References:', selectedReferenceIds);
    console.log('Text Idea:', textIdea);
    console.log('Additional Prompt:', additionalPrompt);

    try {
      // Simulate progress (0-40%)
      setUploadProgress(10);
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(20);
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadProgress(40);
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('Enviando requisição para API...');
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatarId: selectedAvatarId,
          avatarPhotoIndex: selectedAvatarPhotoIndex,
          references: selectedReferenceIds,
          textIdea: textIdea.trim(),
          additionalPrompt: additionalPrompt.trim() || undefined,
        }),
      });

      console.log('Status da resposta:', response.status);
      if (!response.ok) {
        let errorMessage = 'Falha na geração, tente novamente';
        const responseText = await response.text();
        try {
          const error = JSON.parse(responseText);
          console.error('API Error:', error);
          errorMessage = error.error || errorMessage;
        } catch {
          console.error('API Error (non-JSON):', response.status, responseText);
        }
        throw new Error(errorMessage);
      }

      // Simulate upload progress (40-100%)
      setUploading(true);
      setUploadProgress(60);
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadProgress(80);
      await new Promise(resolve => setTimeout(resolve, 300));
      setUploadProgress(100);

      const data = await response.json();
      console.log('=== API Response ===');
      console.log('Success:', data.success);
      console.log('Thumbnail URL:', data.thumbnailUrl);

      if (data.success && data.thumbnailUrl) {
        toast.success('Thumbnail gerado com sucesso!');

        // Notify parent component and get full thumbnail data for preview modal
        if (onGenerationSuccess) {
          const thumbnailData = await onGenerationSuccess(data.thumbnailUrl);
          if (thumbnailData) {
            setGeneratedThumbnail(thumbnailData);
          }
        }
      } else {
        throw new Error('Falha na geração, tente novamente');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Falha na geração, tente novamente';
      setLastError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
      setUploading(false);
    }
  };

  // Handle download - now with proper filename format
  const handleDownload = async () => {
    if (!generatedThumbnail) return;

    try {
      const response = await fetch(generatedThumbnail.thumbnailUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract extension from content type or data URL
      let extension = 'png';
      if (generatedThumbnail.thumbnailUrl.startsWith('data:image/')) {
        const match = generatedThumbnail.thumbnailUrl.match(/^data:image\/([a-z]+);/i);
        if (match) {
          extension = match[1];
        }
      } else if (blob.type) {
        const match = blob.type.match(/image\/([a-z]+)/i);
        if (match) {
          extension = match[1];
        }
      }

      // Format: thumbnail-{timestamp}.{ext}
      a.download = `thumbnail-${Date.now()}.${extension}`;
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

  // Handle regenerate - closes modal and calls handleGenerate with same parameters
  const handleRegenerate = () => {
    setGeneratedThumbnail(null);
    handleGenerate();
  };

  // Format date to DD/MM/YYYY HH:mm
  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Check if button should be disabled
  const isButtonDisabled = generating || !selectedAvatarId || !textIdea.trim();

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-6">Configuração da Thumbnail</h2>

        <div className="space-y-6">
          {/* Main Text Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Texto Principal
            </label>
            <Input
              type="text"
              placeholder="Ex: AI SECRET REVELADO"
              value={textIdea}
              onChange={(e) => setTextIdea(e.target.value)}
              maxLength={50}
              className="text-lg"
            />
            <div className="flex justify-end mt-2">
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

          {/* Additional Prompt Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt Adicional
            </label>
            <Textarea
              placeholder="Descreva elementos visuais específicos, cores, estilo..."
              value={additionalPrompt}
              onChange={(e) => setAdditionalPrompt(e.target.value)}
              maxLength={500}
              className="resize-y rounded-lg border-gray-300"
              style={{ minHeight: '120px' }}
            />
            <div className="flex justify-between items-start mt-2">
              <p className="text-sm text-gray-500">
                Adicione instruções específicas para personalizar ainda mais sua thumbnail
              </p>
              <p
                className={cn(
                  "text-sm ml-4 flex-shrink-0",
                  additionalPrompt.length >= 500 ? "text-red-500" : "text-gray-500"
                )}
              >
                {additionalPrompt.length}/500
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Generate Button - min-height 44px for mobile touch */}
      <Button
        className="w-full h-12 min-h-[44px] bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all duration-300"
        onClick={handleGenerate}
        disabled={isButtonDisabled}
      >
        {generating ? (
          <>
            <Spinner className="mr-2">
              <Loader2Icon className="h-4 w-4" />
            </Spinner>
            Gerando thumbnail...
          </>
        ) : (
          'Gerar Thumbnail'
        )}
      </Button>

      {/* Progress Bar */}
      {generating && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span className="flex items-center gap-2">
              {uploading && <UploadIcon className="h-4 w-4" />}
              {uploading ? 'Fazendo upload...' : 'Gerando...'}
            </span>
            <span>{uploadProgress}%</span>
          </div>
          {/* Green progress bar with exact styling: height 4px, rounded-full */}
          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message and Retry Button */}
      {lastError && !generating && (
        <div className="space-y-3">
          {/* Error message display */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-600 font-medium">{lastError}</p>
          </div>

          {/* Retry button - min-height 44px for mobile touch */}
          <Button
            variant="outline"
            className="w-full border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg h-12 min-h-[44px] font-semibold transition-all duration-300"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <Spinner className="mr-2">
                  <Loader2Icon className="h-4 w-4" />
                </Spinner>
                Tentando novamente...
              </>
            ) : (
              <>
                <RefreshCwIcon className="mr-2 h-4 w-4" />
                Tentar novamente
              </>
            )}
          </Button>
        </div>
      )}

      {/* Preview Modal - Opens after successful generation */}
      {generatedThumbnail && (
        <Dialog
          open={!!generatedThumbnail}
          onOpenChange={() => setGeneratedThumbnail(null)}
        >
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Preview da Thumbnail</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Thumbnail Image Card with gray-100 background, rounded-lg, padding 12px */}
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="relative w-full aspect-video overflow-hidden rounded-lg">
                  <img
                    src={generatedThumbnail.thumbnailUrl}
                    alt={generatedThumbnail.textIdea}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Details Section - 2-column grid with gap-4 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Texto Principal</p>
                    <p className="text-sm text-gray-600">{generatedThumbnail.textIdea}</p>
                  </div>

                  {generatedThumbnail.additionalPrompt && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Prompt Adicional</p>
                      <p className="text-sm text-gray-600">{generatedThumbnail.additionalPrompt}</p>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Avatar Usado</p>
                    <p className="text-sm text-gray-600">{generatedThumbnail.avatarName}</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Data de Criação</p>
                    <p className="text-sm text-gray-600">{formatDateTime(generatedThumbnail.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons - gap-3, height 40px, icons 16x16px */}
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  onClick={handleDownload}
                  className="h-10 bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </Button>

                <Button
                  onClick={() => toast.info('Thumbnail já salvo no histórico automaticamente')}
                  variant="outline"
                  className="h-10"
                >
                  Salvar no Histórico
                </Button>

                <Button
                  onClick={handleRegenerate}
                  variant="outline"
                  className="h-10"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
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
