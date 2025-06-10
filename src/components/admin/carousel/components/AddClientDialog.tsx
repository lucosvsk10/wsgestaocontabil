
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ImageUpload from "../ImageUpload";

interface AddClientDialogProps {
  onAddClient: (clientData: {
    name: string;
    logo_url: string;
    instagram_url: string;
    whatsapp_url: string;
  }) => boolean;
}

const AddClientDialog = ({ onAddClient }: AddClientDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    instagram_url: "",
    whatsapp_url: ""
  });

  const handleSubmit = () => {
    const success = onAddClient(formData);
    if (success) {
      setFormData({ name: "", logo_url: "", instagram_url: "", whatsapp_url: "" });
      setIsOpen(false);
    }
  };

  const handleImageUpload = (url: string) => {
    setFormData({ ...formData, logo_url: url });
  };

  const handleImageRemoval = () => {
    setFormData({ ...formData, logo_url: "" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
          <Button onClick={handleSubmit} className="w-full">
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;
