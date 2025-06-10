
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
}

const ImageUpload = ({ currentImageUrl, onImageUploaded, onImageRemoved }: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive"
      });
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 2MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Gerar nome único para a imagem usando timestamp e random
      const fileExt = file.name.split('.').pop();
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `carrossel/logos/${uniqueFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('carousel-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública da imagem
      const { data } = supabase.storage
        .from('carousel-logos')
        .getPublicUrl(filePath);

      onImageUploaded(data.publicUrl);
      
      toast({
        title: "Sucesso",
        description: "Logo enviada com sucesso"
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Falha ao enviar a imagem",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    try {
      // Extrair o caminho do arquivo da URL pública
      const url = new URL(currentImageUrl);
      const pathSegments = url.pathname.split('/');
      // Pegar as últimas 3 partes: /storage/v1/object/public/carousel-logos/carrossel/logos/filename
      const bucketIndex = pathSegments.indexOf('carousel-logos');
      if (bucketIndex !== -1) {
        const filePath = pathSegments.slice(bucketIndex + 1).join('/');
        
        const { error } = await supabase.storage
          .from('carousel-logos')
          .remove([filePath]);

        if (error) throw error;
      }

      onImageRemoved();
      
      toast({
        title: "Sucesso",
        description: "Logo removida com sucesso"
      });
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover a imagem",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[#020817] dark:text-white">
          Logo da Empresa
        </label>
        {currentImageUrl && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRemoveImage}
            className="text-red-500 hover:bg-red-50 border-red-200"
          >
            <X className="w-3 h-3 mr-1" />
            Remover
          </Button>
        )}
      </div>

      {currentImageUrl ? (
        <div className="relative">
          <img
            src={currentImageUrl}
            alt="Logo atual"
            className="w-full h-24 object-contain border border-gray-200 dark:border-[#efc349]/30 rounded-lg bg-white dark:bg-[#020817]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/logo-padrao.png";
            }}
          />
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-[#efc349]/30 rounded-lg p-4 text-center">
          <Image className="w-8 h-8 mx-auto text-gray-400 dark:text-[#efc349]/50 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhuma logo carregada
          </p>
        </div>
      )}

      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="hidden"
          id="logo-upload"
        />
        <label htmlFor="logo-upload">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isUploading}
            className="w-full border-[#efc349]/30 text-[#efc349] hover:bg-[#efc349]/10"
            asChild
          >
            <span className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Enviando..." : "Selecionar Logo"}
            </span>
          </Button>
        </label>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Formatos aceitos: PNG, JPG, GIF. Máximo: 2MB
      </p>
    </div>
  );
};

export default ImageUpload;
