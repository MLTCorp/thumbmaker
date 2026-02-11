"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { UserIcon, PlusIcon, Edit, Trash2, ArrowLeftIcon, Loader2Icon } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { toast } from 'sonner';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';

interface Avatar {
  id: string;
  userId: string;
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

export default function AvatarsPage() {
  const router = useRouter();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<Avatar | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAvatars();
  }, []);

  const fetchAvatars = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/avatars');

      if (!response.ok) {
        throw new Error('Erro ao buscar avatars');
      }

      const data = await response.json();
      setAvatars(data);
    } catch (error) {
      console.error('Fetch avatars error:', error);
      toast.error('Erro ao carregar avatars');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (avatar: Avatar) => {
    // EDGE CASES: Tentar deletar último avatar mostra warning "Você não tem nenhum avatar"
    if (avatars.length === 1) {
      toast.warning('Você não tem nenhum avatar');
      return;
    }
    setAvatarToDelete(avatar);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!avatarToDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/avatars/${avatarToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar avatar');
      }

      toast.success('Avatar deletado com sucesso');
      setDeleteDialogOpen(false);
      setAvatarToDelete(null);
      fetchAvatars();
    } catch (error) {
      console.error('Delete avatar error:', error);
      toast.error('Erro ao deletar avatar');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <Breadcrumb
            items={[
              { label: 'Gerar', href: '/generate' },
              { label: 'Avatars' },
            ]}
          />
        </div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Meus Avatars</h1>
            <p className="text-gray-600">
              Gerencie seus avatars para usar nas thumbnails
            </p>
          </div>
          <Button onClick={() => router.push('/avatars/create')}>
            <PlusIcon className="h-4 w-4 mr-2" />
            Criar Novo Avatar
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <Skeleton className="w-full aspect-square" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2 mt-4">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : avatars.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserIcon className="h-8 w-8" />
              </EmptyMedia>
              <EmptyTitle className="text-lg">Nenhum avatar criado ainda</EmptyTitle>
              <EmptyDescription>
                Crie seu primeiro avatar carregando 3-10 fotos da sua face
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => router.push('/avatars/create')}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Criar Meu Primeiro Avatar
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {avatars.map((avatar) => (
              <Card key={avatar.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* VISUAL: Card de avatar mostra nome (h3, text-lg, font-bold), foto principal (aspect-ratio 1:1) */}
                  {/* Main photo with 1:1 aspect ratio */}
                  {avatar.photos.length > 0 ? (
                    <AspectRatio ratio={1} className="bg-gray-100">
                      <img
                        src={avatar.photos[0].url}
                        alt={avatar.name}
                        className="object-cover w-full h-full"
                      />
                    </AspectRatio>
                  ) : (
                    <AspectRatio ratio={1} className="bg-gray-100 flex items-center justify-center">
                      <UserIcon className="h-12 w-12 text-gray-400" />
                    </AspectRatio>
                  )}

                  <div className="p-4">
                    {/* Avatar name and photo count */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900">
                        {avatar.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {avatar.photos.length} {avatar.photos.length === 1 ? 'foto' : 'fotos'}
                      </p>
                    </div>

                    {/* VISUAL: Botões de ação: "Editar" (blue-500), "Deletar" (red-500), rounded-lg, px-3 py-1 */}
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="rounded-lg px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => router.push(`/avatars/${avatar.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-lg px-3 py-1 bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => handleDeleteClick(avatar)}
                        disabled={avatarToDelete?.id === avatar.id && isDeleting}
                      >
                        {avatarToDelete?.id === avatar.id && isDeleting ? (
                          <Spinner className="mr-1">
                            <Loader2Icon className="h-4 w-4" />
                          </Spinner>
                        ) : (
                          <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        {avatarToDelete?.id === avatar.id && isDeleting ? 'Deletando...' : 'Deletar'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* VISUAL: Dialog de confirmação de deleção: "Tem certeza que deseja deletar [Nome do Avatar]?" */}
        {/* COMPORTAMENTO: Clicar em "Deletar" abre alertDialog com botões "Cancelar" e "Confirmar" */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Deleção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja deletar "{avatarToDelete?.name}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteConfirm();
                }}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? 'Deletando...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
