import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ExternalLink, Film, FileText, Link2, Music, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { setSEO } from "@/lib/seo";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: "video" | "document" | "link" | "audio" | "image";
  url: string;
  category: string | null;
  tags: string[] | null;
  created_at: string;
}

const typeIcons = {
  video: Film,
  document: FileText,
  link: Link2,
  audio: Music,
  image: ImageIcon,
};

const typeColors = {
  video: "bg-red-500/10 text-red-500 border-red-500/20",
  document: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  link: "bg-green-500/10 text-green-500 border-green-500/20",
  audio: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  image: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
};

export default function Resources() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "link" as Resource["type"],
    url: "",
    category: "",
    tags: "",
  });

  useEffect(() => {
    setSEO(
      "Biblioteca de Recursos | Cuidar+",
      "Acesse materiais de estudo, vídeos e recursos para crescimento espiritual"
    );
    checkPermissions();
    loadResources();
  }, []);

  const checkPermissions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasPastorOrDiscipulador = roles?.some(
      (r) => r.role === "pastor" || r.role === "discipulador"
    );
    setCanCreate(hasPastorOrDiscipulador || false);
  };

  const loadResources = async () => {
    try {
      const { data, error } = await supabase
        .from("recursos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResources((data as Resource[]) || []);
    } catch (error: any) {
      toast.error("Erro ao carregar recursos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const { error } = await supabase.from("recursos").insert({
        title: formData.title,
        description: formData.description || null,
        type: formData.type,
        url: formData.url,
        category: formData.category || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Recurso adicionado com sucesso!");
      setIsDialogOpen(false);
      setFormData({
        title: "",
        description: "",
        type: "link",
        url: "",
        category: "",
        tags: "",
      });
      loadResources();
    } catch (error: any) {
      toast.error("Erro ao adicionar recurso: " + error.message);
    }
  };

  const filteredResources = resources.filter((resource) => {
    if (filterCategory !== "all" && resource.category !== filterCategory) return false;
    if (filterType !== "all" && resource.type !== filterType) return false;
    return true;
  });

  const categories = Array.from(new Set(resources.map((r) => r.category).filter(Boolean)));

  if (loading) {
    return (
      <div className="container py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca de Recursos</h1>
          <p className="text-muted-foreground">
            Materiais de estudo e crescimento espiritual
          </p>
        </div>
        {canCreate && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Recurso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Recurso</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: Resource["type"]) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Vídeo</SelectItem>
                      <SelectItem value="document">Documento</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="audio">Áudio</SelectItem>
                      <SelectItem value="image">Imagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="discipulado, estudo, oração"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Adicionar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat!}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="video">Vídeos</SelectItem>
            <SelectItem value="document">Documentos</SelectItem>
            <SelectItem value="link">Links</SelectItem>
            <SelectItem value="audio">Áudios</SelectItem>
            <SelectItem value="image">Imagens</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredResources.map((resource) => {
          const Icon = typeIcons[resource.type];
          return (
            <Card key={resource.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg border ${typeColors[resource.type]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-2 truncate">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {resource.description}
                    </p>
                  )}
                  {resource.category && (
                    <Badge variant="outline" className="mb-2">
                      {resource.category}
                    </Badge>
                  )}
                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {resource.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(resource.url, "_blank")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Acessar
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum recurso encontrado</p>
        </div>
      )}
    </div>
  );
}
