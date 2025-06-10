
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useStorageManager } from '../hooks/useStorageManager';

const StorageManager = () => {
  const { logos, loading, uploadLogo, deleteLogo } = useStorageManager();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);
    await uploadLogo(file);
    setUploading(false);

    // Reset input
    event.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349]">
          <ImageIcon className="w-5 h-5" />
          Gerenciar Logos no Storage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="logo-upload-storage"
            />
            <label htmlFor="logo-upload-storage">
              <Button
                type="button"
                disabled={uploading}
                className="bg-[#efc349] hover:bg-[#efc349]/90 text-[#020817]"
                asChild
              >
                <span className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Enviando..." : "Upload Nova Logo"}
                </span>
              </Button>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349] mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Carregando logos...</p>
          </div>
        ) : logos.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Nenhuma logo encontrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {logos.map((logo) => (
              <div key={logo.name} className="relative group">
                <div className="aspect-square bg-white dark:bg-[#020817] border border-gray-200 dark:border-[#efc349]/30 rounded-lg p-2 flex items-center justify-center">
                  <img
                    src={logo.url}
                    alt={logo.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteLogo(logo.name)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate" title={logo.name}>
                  {logo.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StorageManager;
