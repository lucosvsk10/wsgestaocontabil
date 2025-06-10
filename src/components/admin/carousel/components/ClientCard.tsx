
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2, Instagram, MessageCircle } from "lucide-react";
import ImageUpload from "../ImageUpload";
import { ClientItem } from "../hooks/useCarouselClients";

interface ClientCardProps {
  client: ClientItem;
  onEdit: (client: ClientItem) => void;
  onDelete: (clientId: string) => void;
  onToggleStatus: (clientId: string) => void;
  onImageUpload: (url: string, clientId: string) => void;
  onImageRemoval: (clientId: string) => void;
}

const ClientCard = ({ 
  client, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  onImageUpload, 
  onImageRemoval 
}: ClientCardProps) => {
  return (
    <Card className="bg-white dark:bg-[#020817] border-[#efc349]/20">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-[#020817] dark:text-white">
            {client.name}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(client)}
              className="border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(client.id)}
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
            onImageUploaded={(url) => onImageUpload(url, client.id)}
            onImageRemoved={() => onImageRemoval(client.id)}
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
            onClick={() => onToggleStatus(client.id)}
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
  );
};

export default ClientCard;
