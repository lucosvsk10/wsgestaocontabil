
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CarouselItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  button_text?: string;
  button_url?: string;
  order_index: number;
  active: boolean;
}

const CarouselManager = () => {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    button_text: "",
    button_url: "",
    active: true
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulação de salvamento - será implementado quando a tabela existir
      const newItem: CarouselItem = {
        id: Date.now().toString(),
        ...formData,
        order_index: items.length
      };

      if (editingItem) {
        setItems(prev => prev.map(item => 
          item.id === editingItem.id ? { ...newItem, id: editingItem.id } : item
        ));
      } else {
        setItems(prev => [...prev, newItem]);
      }

      toast({
        title: "Sucesso",
        description: `Item ${editingItem ? 'atualizado' : 'criado'} com sucesso!`,
      });

      handleCloseDialog();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar item do carrossel.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setItems(prev => prev.filter(item => item.id !== id));

      toast({
        title: "Sucesso",
        description: "Item excluído com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir item.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (item: CarouselItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      image_url: item.image_url,
      button_text: item.button_text || "",
      button_url: item.button_url || "",
      active: item.active
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      title: "",
      description: "",
      image_url: "",
      button_text: "",
      button_url: "",
      active: true
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
          Gerenciar Carrossel
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar' : 'Novo'} Item do Carrossel
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do slide"
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do slide"
                />
              </div>
              <div>
                <Label htmlFor="image_url">URL da Imagem</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://exemplo.com/imagem.jpg"
                />
              </div>
              <div>
                <Label htmlFor="button_text">Texto do Botão (opcional)</Label>
                <Input
                  id="button_text"
                  value={formData.button_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                  placeholder="Saiba mais"
                />
              </div>
              <div>
                <Label htmlFor="button_url">URL do Botão (opcional)</Label>
                <Input
                  id="button_url"
                  value={formData.button_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, button_url: e.target.value }))}
                  placeholder="https://exemplo.com"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-300">
          Funcionalidade do carrossel será implementada após configuração do banco de dados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="bg-white dark:bg-transparent border-[#efc349]/20">
            <CardHeader>
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
                {item.image_url && (
                  <img 
                    src={item.image_url} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-medium text-[#020817] dark:text-[#efc349] mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {item.description}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(item)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CarouselManager;
