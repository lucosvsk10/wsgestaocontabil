
import { useState } from "react";
import CarouselNavbar from "./CarouselNavbar";
import { useSimpleCarousel } from "./hooks/useSimpleCarousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Plus, Edit2, Trash2, Instagram, MessageCircle, Search, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SimpleCarouselManager = () => {
  const { 
    items, 
    loading, 
    uploading, 
    addItem, 
    updateItem, 
    deleteItem, 
    uploadLogo 
  } = useSimpleCarousel();
  
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    instagram: "",
    whatsapp: "",
    status: "active" as "active" | "inactive"
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Selecione apenas arquivos de imagem",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro", 
        description: "A imagem deve ter no máximo 2MB",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da empresa é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!selectedFile && !editingId) {
      toast({
        title: "Erro", 
        description: "Selecione uma logo",
        variant: "destructive"
      });
      return;
    }

    try {
      let logoUrl = "";
      
      if (selectedFile) {
        logoUrl = await uploadLogo(selectedFile, formData.name);
        if (!logoUrl) return;
      } else if (editingId) {
        const currentItem = items.find(item => item.id === editingId);
        logoUrl = currentItem?.logo_url || "";
      }

      const itemData = {
        name: formData.name.trim(),
        logo_url: logoUrl,
        instagram: formData.instagram.trim() || undefined,
        whatsapp: formData.whatsapp.trim() || undefined,
        status: formData.status
      };

      if (editingId) {
        await updateItem(editingId, itemData);
      } else {
        await addItem(itemData);
      }

      // Reset form
      setFormData({ name: "", instagram: "", whatsapp: "", status: "active" });
      setLogoPreview(null);
      setSelectedFile(null);
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar item:", error);
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      instagram: item.instagram || "",
      whatsapp: item.whatsapp || "",
      status: item.status
    });
    setLogoPreview(item.logo_url);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: "", instagram: "", whatsapp: "", status: "active" });
    setLogoPreview(null);
    setSelectedFile(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      await deleteItem(id);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020817]">
      <CarouselNavbar title="Gerenciar Carrossel" />
      
      <div className="pt-20 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extralight text-[#020817] dark:text-[#efc349] mb-4">
            Gerenciar Carrossel
          </h1>
          <p className="text-lg text-gray-600 dark:text-white/70 font-extralight">
            Gerencie os clientes que aparecem no carrossel da página inicial
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Painel de Formulário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349]">
                {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingId ? "Editar Item" : "Adicionar Novo Item"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Upload de Logo */}
                <div>
                  <Label>Logo da Empresa *</Label>
                  <div className="mt-2">
                    <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-[#efc349] transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      
                      {logoPreview ? (
                        <div className="space-y-2">
                          <img
                            src={logoPreview}
                            alt="Preview"
                            className="max-w-full max-h-24 mx-auto object-contain"
                          />
                          <p className="text-sm text-gray-500">Clique para alterar</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-8 h-8 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-500">
                            Clique ou arraste uma imagem aqui
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nome da Empresa */}
                <div>
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Digite o nome da empresa"
                    required
                  />
                </div>

                {/* Instagram */}
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="https://instagram.com/empresa"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="https://wa.me/5511999999999"
                  />
                </div>

                {/* Status */}
                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={formData.status === "active" ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, status: "active" })}
                      className="flex-1"
                    >
                      Ativo
                    </Button>
                    <Button
                      type="button"
                      variant={formData.status === "inactive" ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, status: "inactive" })}
                      className="flex-1"
                    >
                      Inativo
                    </Button>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex gap-2">
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={uploading || !formData.name.trim()}
                    className="flex-1 bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                  >
                    {uploading ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Painel de Lista */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349]">
                  <Image className="w-5 h-5" />
                  Itens do Carrossel ({items.length})
                </CardTitle>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349] mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Carregando...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <Image className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm ? 'Nenhum item encontrado' : 'Nenhum item cadastrado'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                        editingId === item.id 
                          ? 'border-[#efc349] bg-[#efc349]/5' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-[#efc349]/50'
                      }`}
                    >
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <img
                          src={item.logo_url}
                          alt={item.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[#020817] dark:text-white truncate">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                            {item.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                          
                          {item.instagram && (
                            <Instagram className="w-3 h-3 text-gray-400" />
                          )}
                          
                          {item.whatsapp && (
                            <MessageCircle className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(item)}
                          className="text-[#efc349] hover:bg-[#efc349]/10"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SimpleCarouselManager;
