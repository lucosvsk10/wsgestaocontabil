
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Instagram, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClientItem {
  id: string;
  name: string;
  logo_url: string;
  instagram_url?: string;
  order_index: number;
  active: boolean;
}

const CarouselManager = () => {
  const [clients, setClients] = useState<ClientItem[]>([
    {
      id: "1",
      name: "Empresa Exemplo 1",
      logo_url: "/lovable-uploads/cb878201-552e-4728-a814-1554857917b4.png",
      instagram_url: "https://instagram.com/empresa1",
      order_index: 0,
      active: true
    }
  ]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    instagram_url: "",
    active: true
  });

  // Carregar dados do localStorage
  useEffect(() => {
    const savedClients = localStorage.getItem('carousel_clients');
    if (savedClients) {
      setClients(JSON.parse(savedClients));
    }
  }, []);

  // Salvar no localStorage sempre que houver mudanças
  useEffect(() => {
    localStorage.setItem('carousel_clients', JSON.stringify(clients));
  }, [clients]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const newClient: ClientItem = {
        id: editingClient?.id || Date.now().toString(),
        ...formData,
        order_index: editingClient?.order_index || clients.length
      };

      if (editingClient) {
        setClients(prev => prev.map(client => 
          client.id === editingClient.id ? newClient : client
        ));
      } else {
        setClients(prev => [...prev, newClient]);
      }

      toast({
        title: "Sucesso",
        description: `Cliente ${editingClient ? 'atualizado' : 'adicionado'} com sucesso!`,
      });

      handleCloseDialog();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar cliente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setClients(prev => prev.filter(client => client.id !== id));

      toast({
        title: "Sucesso",
        description: "Cliente removido com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover cliente.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (client: ClientItem) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      logo_url: client.logo_url,
      instagram_url: client.instagram_url || "",
      active: client.active
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingClient(null);
    setFormData({
      name: "",
      logo_url: "",
      instagram_url: "",
      active: true
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, logo_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
          Gerenciar Carrossel de Clientes
        </h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar' : 'Novo'} Cliente
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Empresa</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>
              
              <div>
                <Label htmlFor="logo">Logo da Empresa</Label>
                <div className="space-y-2">
                  <Input
                    id="logo_file"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('logo_file')?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload da Logo
                  </Button>
                  <Input
                    id="logo_url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                    placeholder="Ou cole a URL da imagem"
                  />
                </div>
                {formData.logo_url && (
                  <div className="mt-2">
                    <img 
                      src={formData.logo_url} 
                      alt="Preview"
                      className="max-h-20 w-auto object-contain"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="instagram_url">Instagram (opcional)</Label>
                <Input
                  id="instagram_url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagram_url: e.target.value }))}
                  placeholder="https://instagram.com/empresa"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isLoading || !formData.name || !formData.logo_url}>
                  {isLoading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <Card key={client.id} className="bg-white dark:bg-transparent border-[#efc349]/20">
            <CardHeader>
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden flex items-center justify-center">
                {client.logo_url && (
                  <img 
                    src={client.logo_url} 
                    alt={client.name}
                    className="max-h-full max-w-full object-contain"
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-medium text-[#020817] dark:text-[#efc349] mb-2">
                {client.name}
              </h3>
              {client.instagram_url && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 mb-4">
                  <Instagram className="w-4 h-4 mr-1" />
                  Instagram
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(client)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(client.id)}
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
