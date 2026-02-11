"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2Icon, EditIcon, PlusIcon, UploadIcon, ArrowLeftIcon, Loader2Icon } from 'lucide-react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

interface CreateFormData {
  file: File | null;
  type: string;
  description: string;
}

interface EditFormData {
  file: File | null;
  type: string;
  description: string;
}

export default function ReferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'thumbnail' | 'logo' | 'icon' | 'background'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormData>({
    file: null,
    type: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editReference, setEditReference] = useState<Reference | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    file: null,
    type: '',
    description: ''
  });
  const [editing, setEditing] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [referenceToDelete, setReferenceToDelete] = useState<Reference | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load references
  const loadReferences = async () => {
    try {
      const response = await fetch(`/api/references?type=${filter}`);
      if (!response.ok) throw new Error('Failed to load references');
      const data = await response.json();
      setReferences(data);
    } catch (error) {
      console.error('Error loading references:', error);
      toast.error('Erro ao carregar referências');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      loadReferences();
    }
  }, [status, router, filter]);

  // Handle create reference
  const handleCreate = async () => {
    // EDGE CASES: Criar referência sem arquivo mostra erro "Selecione uma imagem"
    if (!createForm.file) {
      toast.error('Selecione uma imagem');
      return;
    }

    // EDGE CASES: Criar referência sem selecionar tipo mostra erro "Selecione um tipo"
    if (!createForm.type || !['thumbnail', 'logo', 'icon', 'background'].includes(createForm.type)) {
      toast.error('Selecione um tipo');
      return;
    }

    setCreating(true);

    try {
      const formData = new FormData();
      formData.append('file', createForm.file);
      formData.append('type', createForm.type);
      if (createForm.description) {
        formData.append('description', createForm.description);
      }

      const response = await fetch('/api/references', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar referência');
      }

      toast.success('Referência criada com sucesso');
      setCreateDialogOpen(false);
      setCreateForm({ file: null, type: '', description: '' });
      loadReferences();
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Erro ao criar referência');
    } finally {
      setCreating(false);
    }
  };

  // Handle edit reference
  const handleEdit = async () => {
    if (!editReference) return;

    setEditing(true);

    try {
      const formData = new FormData();
      if (editForm.file) {
        formData.append('file', editForm.file);
      }
      if (editForm.type) {
        formData.append('type', editForm.type);
      }
      formData.append('description', editForm.description);

      const response = await fetch(`/api/references/${editReference.id}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar referência');
      }

      toast.success('Referência atualizada com sucesso');
      setEditDialogOpen(false);
      setEditReference(null);
      setEditForm({ file: null, type: '', description: '' });
      loadReferences();
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Erro ao atualizar referência');
    } finally {
      setEditing(false);
    }
  };

  // Handle delete reference
  const handleDelete = async () => {
    if (!referenceToDelete) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/references/${referenceToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete reference');

      toast.success('Referência deletada com sucesso');
      setDeleteDialogOpen(false);
      setReferenceToDelete(null);
      loadReferences();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao deletar referência');
    } finally {
      setDeleting(false);
    }
  };

  // Handle open edit dialog
  const openEditDialog = (reference: Reference) => {
    setEditReference(reference);
    setEditForm({
      file: null,
      type: reference.type,
      description: reference.description || ''
    });
    setEditDialogOpen(true);
  };

  // Handle open delete dialog
  const openDeleteDialog = (reference: Reference) => {
    setReferenceToDelete(reference);
    setDeleteDialogOpen(true);
  };

  // Handle checkbox selection
  const handleCheckboxChange = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  // Handle use selected
  const handleUseSelected = () => {
    if (selectedIds.size === 0) return;

    const selectedReferences = references.filter(r => selectedIds.has(r.id));
    toast.success(`${selectedIds.size} referências selecionadas`);

    // TODO: Navigate to generate page with selected references
    // router.push('/generate?references=' + Array.from(selectedIds).join(','));
  };

  // Get display text for type
  const getTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      thumbnail: 'Thumbnail',
      logo: 'Logo',
      icon: 'Ícone',
      background: 'Fundo'
    };
    return typeMap[type] || type;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4">
            <Breadcrumb
              items={[
                { label: 'Gerar', href: '/generate' },
                { label: 'Referências' },
              ]}
            />
          </div>
          <div className="mb-8">
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <Skeleton key={i} className="w-full aspect-square rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <Breadcrumb
            items={[
              { label: 'Gerar', href: '/generate' },
              { label: 'Referências' },
            ]}
          />
        </div>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Referências</h1>
            <p className="text-gray-600 mt-2">
              Gerencie sua biblioteca de inspiração e elementos
            </p>
          </div>
          <div className="flex gap-2">
            {/* COMPORTAMENTO: Seleção múltipla habilita botão "Usar selecionadas" para geração de thumbnail */}
            {selectedIds.size > 0 && (
              <Button onClick={handleUseSelected}>
                Usar selecionadas ({selectedIds.size})
              </Button>
            )}
            <Button onClick={() => setCreateDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Criar referência
            </Button>
          </div>
        </div>

        {/* VISUAL: Filtros por tipo em dropdown (Select) no topo da página: "Todos os tipos", "Thumbnail", "Logo", "Ícone", "Fundo" */}
        {/* COMPORTAMENTO: Filtro por tipo atualiza grid instantaneamente sem recarregar página */}
        <div className="mb-6">
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="thumbnail">Thumbnail</SelectItem>
              <SelectItem value="logo">Logo</SelectItem>
              <SelectItem value="icon">Ícone</SelectItem>
              <SelectItem value="background">Fundo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empty state */}
        {references.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UploadIcon className="h-8 w-8" />
              </EmptyMedia>
              <EmptyTitle className="text-lg">Nenhuma referência encontrada</EmptyTitle>
              <EmptyDescription>
                Comece fazendo upload das suas referências visuais
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Criar minha primeira referência
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          /* VISUAL: Grid de referências em cards 250x250px, aspect-ratio 1:1, rounded-lg, shadow-sm com ScrollArea para melhor UX */
          <ScrollArea className="h-[600px] pr-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {references.map((reference) => (
                <Card
                  key={reference.id}
                  className="relative group overflow-hidden"
                  style={{ width: '250px', height: '250px' }}
                >
                  {/* Image preview */}
                  <div className="aspect-square">
                    <img
                      src={reference.fileUrl}
                      alt={reference.fileName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* VISUAL: Checkbox em cada card para seleção múltipla (blue-500 quando selecionado) */}
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={selectedIds.has(reference.id)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(reference.id, checked as boolean)
                      }
                      className="bg-white/90 border-gray-300 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                  </div>

                  {/* VISUAL: Badge de tipo: thumbnail (blue-500), logo (green-500), ícone (yellow-500), fundo (purple-500) */}
                  <Badge
                    className={cn(
                      "absolute top-2 right-2",
                      reference.type === 'thumbnail' && "bg-blue-500",
                      reference.type === 'logo' && "bg-green-500",
                      reference.type === 'icon' && "bg-yellow-500",
                      reference.type === 'background' && "bg-purple-500"
                    )}
                  >
                    {getTypeDisplay(reference.type)}
                  </Badge>

                  {/* VISUAL: Card mostra: preview da imagem, tipo (badge), descrição (truncada em 2 linhas), botões de ação */}
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                    {/* VISUAL: Botões: "Editar" (blue-500, rounded, px-3 py-1) e "Deletar" (red-500, rounded, px-3 py-1) */}
                    <Button
                      size="sm"
                      className="rounded px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={() => openEditDialog(reference)}
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      className="rounded px-3 py-1 bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => openDeleteDialog(reference)}
                    >
                      <Trash2Icon className="h-4 w-4 mr-1" />
                      Deletar
                    </Button>
                  </div>

                  {/* Description overlay */}
                  {reference.description && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-white text-xs truncate" title={reference.description}>
                        {reference.description}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* COMPORTAMENTO: Clicar em "Criar referência" abre sheet lateral com formulário (file input, tipo dropdown, descrição textarea) */}
        {/* Create Sheet */}
        <Sheet open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Criar Referência</SheetTitle>
              <SheetDescription>
                Faça upload de uma imagem e adicione as informações da referência
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-180px)] pr-4">
              <div className="space-y-4 mt-4">
                {/* File Input */}
                <div className="space-y-2">
                  <Label htmlFor="file">Imagem *</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) =>
                      setCreateForm(prev => ({
                        ...prev,
                        file: e.target.files?.[0] || null
                      }))
                    }
                  />
                  {createForm.file && (
                    <div className="mt-2">
                      <img
                        src={URL.createObjectURL(createForm.file)}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>

                {/* Type Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={createForm.type}
                    onValueChange={(value) =>
                      setCreateForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thumbnail">Thumbnail</SelectItem>
                      <SelectItem value="logo">Logo</SelectItem>
                      <SelectItem value="icon">Ícone</SelectItem>
                      <SelectItem value="background">Fundo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Description Textarea */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Adicione uma descrição..."
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm(prev => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            </ScrollArea>

            <SheetFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating || !createForm.file || !createForm.type}
                className="flex-1"
              >
                {creating ? (
                  <>
                    <Spinner className="mr-2">
                      <Loader2Icon className="h-4 w-4" />
                    </Spinner>
                    Criando...
                  </>
                ) : (
                  'Criar'
                )}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* COMPORTAMENTO: Clicar em "Editar" abre sheet lateral preenchido, usuário modifica campos e salva */}
        {/* Edit Sheet */}
        <Sheet open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Editar Referência</SheetTitle>
              <SheetDescription>
                Edite as informações da referência
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="h-[calc(100vh-180px)] pr-4">
              {editReference && (
                <div className="space-y-4 mt-4">
                  {/* Current image */}
                  <div className="space-y-2">
                    <Label>Imagem atual</Label>
                    <img
                      src={editReference.fileUrl}
                      alt={editReference.fileName}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>

                  {/* File Input (optional replacement) */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-file">Substituir imagem (opcional)</Label>
                    <Input
                      id="edit-file"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) =>
                        setEditForm(prev => ({
                          ...prev,
                          file: e.target.files?.[0] || null
                        }))
                      }
                    />
                    {editForm.file && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 mb-1">Nova imagem:</p>
                        <img
                          src={URL.createObjectURL(editForm.file)}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Type Dropdown */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-type">Tipo</Label>
                    <Select
                      value={editForm.type}
                      onValueChange={(value) =>
                        setEditForm(prev => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="thumbnail">Thumbnail</SelectItem>
                        <SelectItem value="logo">Logo</SelectItem>
                        <SelectItem value="icon">Ícone</SelectItem>
                        <SelectItem value="background">Fundo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description Textarea */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Descrição (opcional)</Label>
                    <Textarea
                      id="edit-description"
                      placeholder="Adicione uma descrição..."
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm(prev => ({ ...prev, description: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </ScrollArea>

            <SheetFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditReference(null);
                  setEditForm({ file: null, type: '', description: '' });
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEdit}
                disabled={editing}
                className="flex-1"
              >
                {editing ? (
                  <>
                    <Spinner className="mr-2">
                      <Loader2Icon className="h-4 w-4" />
                    </Spinner>
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* COMPORTAMENTO: Clicar em "Deletar" abre alertDialog: "Tem certeza que deseja deletar [Descrição da referência]?" */}
        {/* Delete Alert Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deletar referência</AlertDialogTitle>
              <AlertDialogDescription>
                {referenceToDelete && (
                  <>
                    Tem certeza que deseja deletar{' '}
                    {referenceToDelete.description
                      ? referenceToDelete.description
                      : referenceToDelete.fileName
                    }?
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={deleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleting ? 'Deletando...' : 'Confirmar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
