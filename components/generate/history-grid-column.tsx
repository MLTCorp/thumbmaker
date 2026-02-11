"use client";

import { useEffect, useState, useRef, useLayoutEffect, memo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ImageIcon, DownloadIcon, CalendarIcon, UserIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
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

interface HistoryGridColumnProps {
  /** Callback to receive newly generated thumbnail for real-time update */
  onNewThumbnail?: (thumbnail: Thumbnail) => void;
  /** New thumbnail data to add to grid (passed from parent) */
  newThumbnail?: Thumbnail | null;
}

/**
 * Debounce utility function
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Get Supabase image transformation URL with width resize
 * Supabase Storage supports image transformation via URL params
 */
function getResizedImageUrl(url: string, width: number = 360): string {
  // Check if it's a Supabase URL
  if (url.includes('supabase.co') && url.includes('/storage/v1/object/public/')) {
    // Add transformation parameters
    // Supabase format: ?width=360&quality=80
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&quality=80`;
  }
  // Return original URL if not Supabase or already has params
  return url;
}

/**
 * Memoized Thumbnail Card Component
 * Prevents re-renders when parent updates but card data hasn't changed
 */
const ThumbnailCard = memo(({
  thumbnail,
  isNewlyAdded,
  onClick
}: {
  thumbnail: Thumbnail;
  isNewlyAdded: boolean;
  onClick: () => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatDateShort = (date: Date | string) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  return (
    <div
      data-thumbnail-id={thumbnail.id}
      className={cn(
        "group relative cursor-pointer",
        isNewlyAdded && "animate-in fade-in slide-in-from-top-2 duration-300"
      )}
      onClick={onClick}
    >
      <AspectRatio ratio={16 / 9}>
        <div
          className={cn(
            "w-full h-full rounded-lg shadow-sm hover:shadow-md overflow-hidden",
            isNewlyAdded
              ? "ring-2 ring-green-500 transition-all duration-500"
              : "transition-shadow"
          )}
        >
          {/* Blur placeholder background */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}

          {/* Lazy loaded image with resize transformation */}
          <img
            src={getResizedImageUrl(thumbnail.thumbnailUrl, 360)}
            alt={thumbnail.textIdea}
            className={cn(
              "w-full h-full object-cover rounded-lg transition-opacity duration-300",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
          />

          {/* Error state */}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <ImageIcon className="h-8 w-8 text-gray-300" />
            </div>
          )}

          {/* Hover Overlay with Date */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-3">
            <p className="text-white text-sm font-medium">
              {formatDateShort(thumbnail.createdAt)}
            </p>
          </div>
        </div>
      </AspectRatio>
    </div>
  );
});

ThumbnailCard.displayName = 'ThumbnailCard';

export const HistoryGridColumn = memo(function HistoryGridColumn({ newThumbnail }: HistoryGridColumnProps) {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedThumbnail, setSelectedThumbnail] = useState<Thumbnail | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Expandable text state for prompt and additional prompt
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [isAdditionalPromptExpanded, setIsAdditionalPromptExpanded] = useState(false);

  // Refs to measure text height
  const promptRef = useRef<HTMLParagraphElement>(null);
  const additionalPromptRef = useRef<HTMLParagraphElement>(null);

  // Track if text exceeds 4 lines
  const [promptNeedsExpand, setPromptNeedsExpand] = useState(false);
  const [additionalPromptNeedsExpand, setAdditionalPromptNeedsExpand] = useState(false);

  // Mobile collapsible state - collapsed by default on mobile
  const [isExpanded, setIsExpanded] = useState(false);

  // Track newly added thumbnail ID for highlight animation
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  // Scroll preservation refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollTopRef = useRef<number>(0);

  // Load thumbnails on mount (memoized)
  // US-010: Use API fields optimization to reduce payload size
  // The API will return cached data with Cache-Control headers
  const loadThumbnails = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch only grid fields (id, thumbnailUrl, textIdea, createdAt) for performance
      // Cache-Control is set by the server (10 minutes)
      const response = await fetch('/api/thumbnails?fields=grid');

      if (!response.ok) {
        throw new Error('Erro ao buscar histórico');
      }

      const data = await response.json();
      // Limit to 20 most recent
      const limitedData = data.slice(0, 20);
      setThumbnails(limitedData);
    } catch (error) {
      console.error('Load thumbnails error:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadThumbnails();
  }, [loadThumbnails]);

  // Debounced thumbnail update (500ms debounce)
  const debouncedAddThumbnail = useCallback(
    debounce((thumbnail: Thumbnail) => {
      // Capture scroll position BEFORE state update
      if (scrollContainerRef.current) {
        previousScrollTopRef.current = scrollContainerRef.current.scrollTop;
      }

      setThumbnails((prev) => {
        // Add to beginning, limit to 20
        const updated = [thumbnail, ...prev];
        return updated.slice(0, 20);
      });

      // Mark this thumbnail as newly added for animation
      setNewlyAddedId(thumbnail.id);

      // Remove highlight after 3 seconds with fade-out transition (500ms)
      setTimeout(() => {
        setNewlyAddedId(null);
      }, 3000);
    }, 500),
    []
  );

  // Add new thumbnail when received from parent (with debounce)
  useEffect(() => {
    if (newThumbnail) {
      debouncedAddThumbnail(newThumbnail);
    }
  }, [newThumbnail, debouncedAddThumbnail]);

  // Restore scroll position after new thumbnail is added to DOM
  useLayoutEffect(() => {
    if (newlyAddedId && scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM has been painted
      requestAnimationFrame(() => {
        if (!scrollContainerRef.current) return;

        // Find the newly added item to get its actual height
        const newItem = scrollContainerRef.current.querySelector(
          `[data-thumbnail-id="${newlyAddedId}"]`
        );

        if (newItem) {
          const newItemHeight = newItem.getBoundingClientRect().height;
          // Restore scroll position + new item height to maintain visual position
          scrollContainerRef.current.scrollTop = previousScrollTopRef.current + newItemHeight;
        }
      });
    }
  }, [newlyAddedId]);

  // Format date to DD/MM/YYYY (memoized)
  const formatDateFull = useCallback((date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  }, []);

  // Handle thumbnail click (memoized)
  // US-010: Fetch full details when opening modal (grid data may be limited)
  const handleThumbnailClick = useCallback(async (thumbnail: Thumbnail) => {
    setImageError(null);
    setIsPromptExpanded(false);
    setIsAdditionalPromptExpanded(false);
    setPromptNeedsExpand(false);
    setAdditionalPromptNeedsExpand(false);
    setDetailsDialogOpen(true);

    // If thumbnail already has full data (prompt, avatarName), use it
    if (thumbnail.prompt && thumbnail.avatarName) {
      setSelectedThumbnail(thumbnail);
      return;
    }

    // Otherwise, fetch full details from API
    try {
      const response = await fetch(`/api/thumbnails/${thumbnail.id}`);
      if (!response.ok) {
        throw new Error('Erro ao buscar detalhes');
      }
      const fullThumbnail = await response.json();
      setSelectedThumbnail(fullThumbnail);
    } catch (error) {
      console.error('Error fetching thumbnail details:', error);
      toast.error('Erro ao carregar detalhes');
      setDetailsDialogOpen(false);
    }
  }, []);

  // Check if text needs expand button (exceeds 4 lines)
  useEffect(() => {
    if (!detailsDialogOpen || !selectedThumbnail) return;

    // Wait for next frame to ensure DOM is painted
    requestAnimationFrame(() => {
      if (promptRef.current) {
        const lineHeight = parseFloat(getComputedStyle(promptRef.current).lineHeight);
        const maxHeight = lineHeight * 4; // 4 lines
        const actualHeight = promptRef.current.scrollHeight;
        setPromptNeedsExpand(actualHeight > maxHeight);
      }

      if (additionalPromptRef.current) {
        const lineHeight = parseFloat(getComputedStyle(additionalPromptRef.current).lineHeight);
        const maxHeight = lineHeight * 4; // 4 lines
        const actualHeight = additionalPromptRef.current.scrollHeight;
        setAdditionalPromptNeedsExpand(actualHeight > maxHeight);
      }
    });
  }, [detailsDialogOpen, selectedThumbnail]);

  // Handle image error
  const handleImageError = () => {
    setImageError('Imagem não encontrada');
  };

  // Handle download (memoized)
  const handleDownload = useCallback(async (thumbnail: Thumbnail) => {
    try {
      const response = await fetch(thumbnail.thumbnailUrl);
      if (!response.ok) {
        throw new Error('Erro ao baixar imagem');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract extension from content type or data URL
      let extension = 'png';
      if (thumbnail.thumbnailUrl.startsWith('data:image/')) {
        const match = thumbnail.thumbnailUrl.match(/^data:image\/([a-z]+);/i);
        if (match) {
          extension = match[1];
        }
      } else if (blob.type) {
        const match = blob.type.match(/image\/([a-z]+)/i);
        if (match) {
          extension = match[1];
        }
      }

      a.download = `thumbnail-${thumbnail.id}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download iniciado');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar thumbnail');
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Desktop: Always show title */}
      {/* Mobile: Collapsible button with count */}
      <div className="lg:block">
        <div className="hidden lg:block">
          <h3 className="text-lg font-semibold mb-4">Histórico</h3>
        </div>

        {/* Mobile Toggle Button - min-height 44px for touch */}
        <div className="block lg:hidden">
          <Button
            variant="ghost"
            className="w-full justify-between h-auto min-h-[44px] py-3 px-4 hover:bg-gray-100 transition-all duration-300"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="text-lg font-semibold">
              Ver Histórico ({thumbnails.length})
            </span>
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Content - Always visible on desktop, collapsible on mobile */}
      <div
        className={cn(
          "transition-all duration-300 overflow-hidden",
          // Desktop: always visible
          "lg:block lg:opacity-100 lg:max-h-none",
          // Mobile: collapsible
          isExpanded
            ? "block opacity-100 max-h-[5000px]"
            : "hidden opacity-0 max-h-0 lg:block lg:opacity-100"
        )}
      >
        {/* Loading State: 4 skeleton cards - ONLY ON INITIAL LOAD */}
        {isInitialLoad && loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <AspectRatio ratio={16 / 9}>
                  <Skeleton className="w-full h-full rounded-lg" />
                </AspectRatio>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && thumbnails.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-sm">Nenhuma thumbnail gerada ainda</p>
          </div>
        )}

        {/* Grid of Thumbnails - 1 col mobile, 2 cols tablet/desktop */}
        {/* Smooth scroll behavior applied via CSS */}
        {/* US-010 Virtualization Note: Grid is limited to max 20 items. */}
        {/* For this small dataset, React.memo on ThumbnailCard + lazy loading */}
        {/* provides sufficient performance without need for react-window. */}
        {/* Virtualization (react-window) is typically only needed for 100+ items. */}
        {!loading && thumbnails.length > 0 && (
          <div
            ref={scrollContainerRef}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3"
            style={{ scrollBehavior: 'smooth' }}
          >
            {thumbnails.map((thumbnail) => (
              <ThumbnailCard
                key={thumbnail.id}
                thumbnail={thumbnail}
                isNewlyAdded={thumbnail.id === newlyAddedId}
                onClick={() => handleThumbnailClick(thumbnail)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Details Dialog - max-w-[95vw] on mobile, max-w-2xl on desktop */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Thumbnail</DialogTitle>
            <DialogDescription>
              Informações completas sobre o thumbnail gerado
            </DialogDescription>
          </DialogHeader>

          {selectedThumbnail && (
            <div className="space-y-4">
              {/* Thumbnail preview */}
              <div className="rounded-lg overflow-hidden border">
                {imageError ? (
                  <div className="aspect-video flex items-center justify-center bg-gray-100 text-red-500 p-4 text-center">
                    {imageError}
                  </div>
                ) : (
                  <img
                    src={selectedThumbnail.thumbnailUrl}
                    alt={selectedThumbnail.textIdea}
                    className="w-full object-cover"
                    onError={handleImageError}
                  />
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">Texto Principal</Label>
                  <p className="text-sm text-gray-700 mt-1">{selectedThumbnail.textIdea}</p>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Avatar Usado</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{selectedThumbnail.avatarName}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-semibold">Prompt Usado</Label>
                  <p
                    ref={promptRef}
                    className={cn(
                      "text-sm text-gray-700 mt-1",
                      !isPromptExpanded && "line-clamp-4"
                    )}
                  >
                    {selectedThumbnail.prompt}
                  </p>
                  {promptNeedsExpand && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-auto p-0 text-blue-500 hover:text-blue-600 hover:bg-transparent"
                      onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                    >
                      {isPromptExpanded ? 'Ver menos' : 'Ver mais'}
                    </Button>
                  )}
                </div>

                {selectedThumbnail.additionalPrompt && (
                  <div>
                    <Label className="text-sm font-semibold">Instruções Adicionais</Label>
                    <p
                      ref={additionalPromptRef}
                      className={cn(
                        "text-sm text-gray-700 mt-1",
                        !isAdditionalPromptExpanded && "line-clamp-4"
                      )}
                    >
                      {selectedThumbnail.additionalPrompt}
                    </p>
                    {additionalPromptNeedsExpand && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-auto p-0 text-blue-500 hover:text-blue-600 hover:bg-transparent"
                        onClick={() => setIsAdditionalPromptExpanded(!isAdditionalPromptExpanded)}
                      >
                        {isAdditionalPromptExpanded ? 'Ver menos' : 'Ver mais'}
                      </Button>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-sm font-semibold">Data de Criação</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {formatDateFull(selectedThumbnail.createdAt)}
                    </span>
                  </div>
                </div>

                {selectedThumbnail.references && selectedThumbnail.references.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold">Referências Usadas</Label>
                    <p className="text-sm text-gray-700 mt-1">
                      {selectedThumbnail.references.length} referência(s)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
            {selectedThumbnail && !imageError && (
              <Button
                className="bg-blue-500 hover:bg-blue-600"
                onClick={() => {
                  handleDownload(selectedThumbnail);
                  setDetailsDialogOpen(false);
                }}
              >
                <DownloadIcon className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
