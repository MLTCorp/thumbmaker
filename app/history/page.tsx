"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { DownloadIcon, EyeIcon, CalendarIcon, UserIcon, ImageIcon, ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface Thumbnail {
  id: string;
  userId: string;
  avatarId: string;
  avatarName: string;
  prompt: string;
  textIdea: string;
  thumbnailUrl: string;
  references: string[];
  createdAt: Date;
}

interface Avatar {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 20;

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredThumbnails, setFilteredThumbnails] = useState<Thumbnail[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedThumbnail, setSelectedThumbnail] = useState<Thumbnail | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Load thumbnails
  const loadThumbnails = async () => {
    try {
      setLoading(true);
      let url = '/api/thumbnails';

      const params = new URLSearchParams();
      if (selectedAvatar !== 'all') {
        params.append('avatarId', selectedAvatar);
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Erro ao buscar histórico');
      }

      const data = await response.json();
      setThumbnails(data);
      setFilteredThumbnails(data);
      setCurrentPage(1); // Reset to first page when filtering
    } catch (error) {
      console.error('Load thumbnails error:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  // Load avatars for filter
  const loadAvatars = async () => {
    try {
      const response = await fetch('/api/avatars');

      if (!response.ok) {
        throw new Error('Erro ao buscar avatars');
      }

      const data = await response.json();
      setAvatars(data);
    } catch (error) {
      console.error('Load avatars error:', error);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      loadThumbnails();
      loadAvatars();
    }
  }, [status, router]); // Only reload on status change, not filters

  useEffect(() => {
    if (status === 'authenticated') {
      loadThumbnails();
    }
  }, [selectedAvatar, dateFrom, dateTo, status]); // Reload when filters change

  // Format date to DD/MM/YYYY
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  };

  // Handle download
  const handleDownload = async (thumbnail: Thumbnail) => {
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
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar thumbnail');
    }
  };

  // Handle view details
  const handleViewDetails = (thumbnail: Thumbnail) => {
    setSelectedThumbnail(thumbnail);
    setImageError(null);
    setDetailsDialogOpen(true);
  };

  // Handle image load error
  const handleImageError = () => {
    // EDGE CASES: Thumbnail foi deletada do Storage mas existe no banco mostra erro "Imagem não encontrada"
    setImageError('Imagem não encontrada');
  };

  // Get paginated thumbnails
  const getPaginatedThumbnails = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredThumbnails.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredThumbnails.length / ITEMS_PER_PAGE);
  const paginatedThumbnails = getPaginatedThumbnails();

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico de Thumbnails</h1>
            <p className="text-gray-600">Visualize todos os thumbnails que você gerou</p>
          </div>

          {/* Filters skeleton */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <Skeleton className="h-7 w-full" />
            </div>
            <div className="flex-1">
              <Skeleton className="h-7 w-full" />
            </div>
          </div>

          {/* COMPORTAMENTO: Carregamento inicial mostra skeleton (3 linhas) enquanto busca histórico */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thumbnail</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Avatar</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="w-[200px] h-[112px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="w-[100px] h-5" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="w-[150px] h-5" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="w-[100px] h-7" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/generate">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico de Thumbnails</h1>
          <p className="text-gray-600">Visualize todos os thumbnails que você gerou</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          {/* Avatar filter */}
          <div className="flex-1">
            <Label htmlFor="avatar-filter" className="sr-only">Filtrar por Avatar</Label>
            <Select value={selectedAvatar} onValueChange={setSelectedAvatar}>
              <SelectTrigger id="avatar-filter" className="w-full">
                <SelectValue placeholder="Todos os avatars" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os avatars</SelectItem>
                {avatars.map((avatar) => (
                  <SelectItem key={avatar.id} value={avatar.id}>
                    {avatar.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date from filter */}
          <div className="flex-1">
            <Label htmlFor="date-from" className="sr-only">Data Inicial</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Data inicial"
            />
          </div>

          {/* Date to filter */}
          <div className="flex-1">
            <Label htmlFor="date-to" className="sr-only">Data Final</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Data final"
            />
          </div>
        </div>

        {/* Content */}
        {filteredThumbnails.length === 0 ? (
          // EDGE CASES: Histórico vazio mostra empty state "Nenhum thumbnail gerado ainda" + CTA "Gerar meu primeiro thumbnail"
          <Card>
            <CardContent className="py-12 text-center">
              <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum thumbnail gerado ainda
              </h3>
              <p className="text-gray-600 mb-6">
                Comece gerando seu primeiro thumbnail
              </p>
              <Button onClick={() => router.push('/generate')}>
                <ImageIcon className="h-4 w-4 mr-2" />
                Gerar meu primeiro thumbnail
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thumbnail</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Avatar</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedThumbnails.map((thumbnail) => (
                      <TableRow key={thumbnail.id}>
                        {/* VISUAL: Linha da table tem hover:bg-gray-100, border-b border-gray-200 */}
                        <TableCell className="border-b border-gray-200 hover:bg-gray-100">
                          {/* VISUAL: Thumbnail (preview 200x112px) */}
                          <div className="w-[200px]">
                            {/* VISUAL: Thumbnail preview em card com aspect-ratio 21:9, rounded-lg, shadow-sm, hover:shadow-md */}
                            <AspectRatio ratio={21 / 9}>
                              <img
                                src={thumbnail.thumbnailUrl}
                                alt={thumbnail.textIdea}
                                className="object-cover w-full h-full rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                                onClick={() => handleViewDetails(thumbnail)}
                                onError={handleImageError}
                              />
                            </AspectRatio>
                          </div>
                        </TableCell>

                        {/* VISUAL: Data (formato DD/MM/YYYY) */}
                        <TableCell className="border-b border-gray-200 hover:bg-gray-100">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span>{formatDate(thumbnail.createdAt)}</span>
                          </div>
                        </TableCell>

                        {/* VISUAL: Avatar (nome) */}
                        <TableCell className="border-b border-gray-200 hover:bg-gray-100">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span>{thumbnail.avatarName}</span>
                          </div>
                        </TableCell>

                        {/* VISUAL: Ações */}
                        <TableCell className="border-b border-gray-200 hover:bg-gray-100">
                          <div className="flex gap-2">
                            {/* VISUAL: Botão "Ver Detalhes" (gray-500) */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(thumbnail)}
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              Ver Detalhes
                            </Button>

                            {/* VISUAL: Botão "Download" (blue-500, hover blue-600, rounded, px-3 py-1) */}
                            <Button
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 rounded px-3 py-1"
                              onClick={() => handleDownload(thumbnail)}
                            >
                              <DownloadIcon className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* COMPORTAMENTO: Pagination (20 itens por página) para histórico longo */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>

                <span className="flex items-center px-4">
                  Página {currentPage} de {totalPages}
                </span>

                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}

        {/* Details Dialog */}
        {/* FUNCIONAL: Usuário clica em thumbnail e vê detalhes: prompt usado, avatar usado, referências usadas, data de criação */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
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
                    <Label className="text-sm font-semibold">Ideia de Texto</Label>
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
                    <p className="text-sm text-gray-700 mt-1 line-clamp-4">{selectedThumbnail.prompt}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Data de Criação</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {formatDate(selectedThumbnail.createdAt)}
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
    </div>
  );
}
