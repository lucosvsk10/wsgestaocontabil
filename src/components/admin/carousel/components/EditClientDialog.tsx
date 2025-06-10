
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ImageUpload from "../ImageUpload";
import { ClientItem } from "../hooks/useCarouselClients";

interface EditClientDialogProps {
  client: ClientItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateClient: (clientId: string, clientData: Partial<ClientItem>) => boolean;
}

const EditClientDialog = ({ client, isOpen, onClose, onUpdateClient }: EditClientDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    instagram_url: "",
    whatsapp_url: ""
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        logo_url: client.logo_url,
        instagram_url: client.instagram_url || "",
        whatsapp_url: client.whatsapp_url || ""
      });
    }
  }, [client]);

  const handleSubmit = () => {
    if (!client) return;
    
    const success = onUpdateClient(client.id, {
      name: formData.name,
      logo_url: formData.logo_url || "/logo-padrao.png",
      instagram_url: formData.instagram_url,
      whatsapp_url: formData.whatsapp_url
    });
    
    if (success) {
      onClose();
    }
  };

  const handleImageUpload = (url: string) => {
    setFormData({ ...formData, logo_url: url });
  };

  const handleImageRemoval = () => {
    setFormData({ ...formData, logo_url: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <Button onClick={handleSubmit} className="w-full">
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditClientDialog;
