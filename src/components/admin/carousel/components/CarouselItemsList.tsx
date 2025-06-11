
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Search, Instagram, MessageCircle, List } from 'lucide-react';
import { CarouselItem } from '../types';

interface CarouselItemsListProps {
  items: CarouselItem[];
  loading: boolean;
  onEdit: (item: CarouselItem) => void;
  onDelete: (id: string) => void;
}

const CarouselItemsList = ({ items, loading, onEdit, onDelete }: CarouselItemsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349]">
            <List className="w-5 h-5" />
            Lista de Blocos do Carrossel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#efc349] mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Carregando itens...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#020817] dark:text-[#efc349]">
          <List className="w-5 h-5" />
          Lista de Blocos do Carrossel ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nome da empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'Nenhum item encontrado' : 'Nenhum bloco cadastrado ainda'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 border border-gray-200 dark:border-[#efc349]/30 rounded-lg bg-white dark:bg-[#020817] hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src={item.logo_url}
                    alt={item.name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[#020817] dark:text-white truncate text-lg">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant={item.status === 'active' ? 'default' : 'secondary'}
                      className={item.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }
                    >
                      {item.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    
                    {item.instagram && (
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <Instagram className="w-3 h-3 mr-1" />
                        Instagram
                      </div>
                    )}
                    
                    {item.whatsapp && (
                      <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        WhatsApp
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(item)}
                    className="border-[#efc349]/50 text-[#efc349] hover:bg-[#efc349]/10 hover:border-[#efc349] transition-all duration-200"
                    title="Editar item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(item.id)}
                    className="border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-red-500 transition-all duration-200"
                    title="Excluir item"
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
  );
};

export default CarouselItemsList;
