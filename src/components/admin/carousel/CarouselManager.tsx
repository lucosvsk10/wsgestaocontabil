
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Edit2, Instagram, MessageCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ImageUpload from "./ImageUpload";

interface ClientItem {
  id: string;
  name: string;
  logo_url: string;
  instagram_url?: string;
  whatsapp_url?: string;
  order_index: number;
  active: boolean;
}

const CarouselManager = () => {
  const { toast } = useToast();
  
  // Estado local para clientes (sem banco de dados)
  const [clients, setClients] = useState<ClientItem[]>(() => {
    const stored = localStorage.getItem('carousel_clients');
    return stored ? JSON.parse(stored) : [
      {
        id: "1",
        name: "Empresa Exemplo 1",
        logo_url: "/logo-padrao.png",
        instagram_url: "https://instagram.com/empresa1",
        whatsapp_url: "https://wa.me/5511999999999",
        order_index: 0,
        active: true
      },
      {
        id: "2", 
        name: "Empresa Exemplo 2",
        logo_url: "/logo-padrao.png",
        instagram_url: "https://instagram.com/empresa2",
        order_index: 1,
        active: true
      },
      {
        id: "3",
        name: "Empresa Exemplo 3", 
        logo_url: "/logo-padrao.png",
        whatsapp_url: "https://wa.me/5511888888888",
        order_index: 2,
        active: true
      }
    ];
  });

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    instagram_url: "",
    whatsapp_url: ""
  });

  const saveToLocalStorage = (clientsData: ClientItem[]) => {
    localStorage.setItem('carousel_clients', JSON.stringify(clientsData));
    setClients(clientsData);
  };

  const handleAddClient = () => {
    if (!formData.name) {
      toast({
        title: "Erro",
        description: "Nome da empresa é obrigatório",
        variant: "destructive"
      });
      return;
    }

    const newClient: ClientItem = {
      id: Date.now().toString(),
      name: formData.name,
      logo_url: formData.logo_url || "/logo-padrao.png",
      instagram_url: formData.instagram_url,
      whatsapp_url: formData.whatsapp_url,
      order_index: clients.length,
      active: true
    };

    const updatedClients = [...clients, newClient];
    saveToLocalStorage(updatedClients);
    
    setFormData({ name: "", logo_url: "", instagram_url: "", whatsapp_url: "" });
    setIsAddDialogOpen(false);
    
    toast({
      title: "Sucesso",
      description: "Cliente adicionado ao carousel"
    });
  };

  const handleEditClient = () => {
    if (!editingClient || !formData.name) {
      toast({
        title: "Erro",
        description: "Nome da empresa é obrigatório",
        variant: "destructive"
      });
      return;
    }

    const updatedClients = clients.map(client =>
      client.id === editingClient.id
        ? { 
            ...client, 
            name: formData.name, 
            logo_url: formData.logo_url || "/logo-padrao.png", 
            instagram_url: formData.instagram_url,
            whatsapp_url: formData.whatsapp_url
          }
        : client
    );

    saveToLocalStorage(updatedClients);
    setEditingClient(null);
    setFormData({ name: "", logo_url: "", instagram_url: "", whatsapp_url: "" });
    
    toast({
      title: "Sucesso",
      description: "Cliente atualizado"
    });
  };

  const handleDeleteClient = (clientId: string) => {
    const updatedClients = clients.filter(client => client.id !== clientId);
    saveToLocalStorage(updatedClients);
    
    toast({
      title: "Sucesso",
      description: "Cliente removido do carousel"
    });
  };

  const toggleClientStatus = (clientId: string) => {
    const updatedClients = clients.map(client =>
      client.id === clientId ? { ...client, active: !client.active } : client
    );
    saveToLocalStorage(updatedClients);
  };

  const openEditDialog = (client: ClientItem) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      logo_url: client.logo_url,
      instagram_url: client.instagram_url || "",
      whatsapp_url: client.whatsapp_url || ""
    });
  };

  const handleImageUpload = (url: string) => {
    setFormData({ ...formData, logo_url: url });
  };

  const handleImageRemoval = () => {
    setFormData({ ...formData, logo_url: "" });
  };

  const handleEditImageUpload = (url: string, clientId: string) => {
    const updatedClients = clients.map(client =>
      client.id === clientId ? { ...client, logo_url: url } : client
    );
    saveToLocalStorage(updatedClients);
    
    if (editingClient?.id === clientId) {
      setFormData({ ...formData, logo_url: url });
    }
  };

  const handleEditImageRemoval = (clientId: string) => {
    const updatedClients = clients.map(client =>
      client.id === clientId ? { ...client, logo_url: "/logo-padrao.png" } : client
    );
    saveToLocalStorage(updatedClients);
    
    if (editingClient?.id === clientId) {
      setFormData({ ...formData, logo_url: "/logo-padrao.png" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section - Similar to IRPF Calculator */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-[#efc349] mr-3" />
          <h1 className="text-4xl font-extralight text-[#020817] dark:text-[#efc349]">
            Gerenciar Carousel
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-white/70 font-extralight max-w-2xl mx-auto">
          Adicione, edite ou remova clientes do carousel da página inicial. Gerencie as logos, links sociais e status de exibição de cada empresa parceira.
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-[#020817] dark:text-[#efc349] mb-2 font-thin">
            Lista de Clientes
          </h2>
          <p className="text-gray-600 dark:text-white/70">
            {clients.length} {clients.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da Empresa</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da empresa"
                />
              </div>
              
              <ImageUpload
                currentImageUrl={formData.logo_url !== "/logo-padrao.png" ? formData.logo_url : ""}
                onImageUploaded={handleImageUpload}
                onImageRemoved={handleImageRemoval}
              />
              
              <div>
                <Label htmlFor="instagram_url">URL do Instagram (opcional)</Label>
                <Input
                  id="instagram_url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  placeholder="https://instagram.com/empresa"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp_url">URL do WhatsApp (opcional)</Label>
                <Input
                  id="whatsapp_url"
                  value={formData.whatsapp_url}
                  onChange={(e) => setFormData({ ...formData, whatsapp_url: e.target.value })}
                  placeholder="https://wa.me/5511999999999"
                />
              </div>
              <Button onClick={handleAddClient} className="w-full">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <Card key={client.id} className="bg-white dark:bg-[#020817] border-[#efc349]/20">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-[#020817] dark:text-white">
                  {client.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(client)}
                    className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteClient(client.id)}
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={client.logo_url}
                  alt={client.name}
                  className="max-h-20 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo-padrao.png";
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <ImageUpload
                  currentImageUrl={client.logo_url !== "/logo-padrao.png" ? client.logo_url : ""}
                  onImageUploaded={(url) => handleEditImageUpload(url, client.id)}
                  onImageRemoved={() => handleEditImageRemoval(client.id)}
                />
              </div>
              
              <div className="flex justify-center gap-3">
                {client.instagram_url && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Instagram className="w-4 h-4 mr-1 text-[#efc349]" />
                    <a 
                      href={client.instagram_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-[#efc349] transition-colors"
                    >
                      Instagram
                    </a>
                  </div>
                )}
                
                {client.whatsapp_url && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <MessageCircle className="w-4 h-4 mr-1 text-[#efc349]" />
                    <a 
                      href={client.whatsapp_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-[#efc349] transition-colors"
                    >
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center">
                <Button
                  size="sm"
                  variant={client.active ? "default" : "outline"}
                  onClick={() => toggleClientStatus(client.id)}
                  className={client.active 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "border-gray-400 text-gray-600 hover:bg-gray-100"
                  }
                >
                  {client.active ? "Ativo" : "Inativo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Edição */}
      <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Nome da Empresa</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da empresa"
              />
            </div>
            
            <ImageUpload
              currentImageUrl={formData.logo_url !== "/logo-padrao.png" ? formData.logo_url : ""}
              onImageUploaded={handleImageUpload}
              onImageRemoved={handleImageRemoval}
            />
            
            <div>
              <Label htmlFor="edit_instagram_url">URL do Instagram (opcional)</Label>
              <Input
                id="edit_instagram_url"
                value={formData.instagram_url}
                onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                placeholder="https://instagram.com/empresa"
              />
            </div>
            <div>
              <Label htmlFor="edit_whatsapp_url">URL do WhatsApp (opcional)</Label>
              <Input
                id="edit_whatsapp_url"
                value={formData.whatsapp_url}
                onChange={(e) => setFormData({ ...formData, whatsapp_url: e.target.value })}
                placeholder="https://wa.me/5511999999999"
              />
            </div>
            <Button onClick={handleEditClient} className="w-full">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CarouselManager;
