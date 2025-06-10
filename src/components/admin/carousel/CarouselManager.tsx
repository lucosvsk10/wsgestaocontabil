
import { useState } from "react";
import CarouselNavbar from "./CarouselNavbar";
import LogoUploadPanel from "./components/LogoUploadPanel";
import CarouselItemForm from "./components/CarouselItemForm";
import CarouselItemsList from "./components/CarouselItemsList";
import EditCarouselItemDialog from "./components/EditCarouselItemDialog";
import { useCarouselDatabase } from "./hooks/useCarouselDatabase";
import { CarouselItem } from "./types";

const CarouselManager = () => {
  const { items, loading, addItem, updateItem, deleteItem } = useCarouselDatabase();
  const [editingItem, setEditingItem] = useState<CarouselItem | null>(null);

  const handleEdit = (item: CarouselItem) => {
    setEditingItem(item);
  };

  const handleCloseEdit = () => {
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este item do carrossel? (A logo no storage não será removida)')) {
      await deleteItem(id);
    }
  };

  return (
    <div className="min-h-screen">
      <CarouselNavbar title="Gerenciar Carousel" />
      
      <div className="pt-20 p-6 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extralight text-[#020817] dark:text-[#efc349] mb-4">
            Gerenciar Carousel
          </h1>
          <p className="text-lg text-gray-600 dark:text-white/70 font-extralight max-w-3xl mx-auto">
            Gerencie as logos no storage, cadastre novos blocos e controle a exibição do carrossel na página inicial.
          </p>
        </div>

        {/* Painel de Upload de Logos */}
        <LogoUploadPanel />

        {/* Formulário de Cadastro */}
        <CarouselItemForm onSubmit={addItem} />

        {/* Lista de Itens */}
        <CarouselItemsList
          items={items}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        {/* Dialog de Edição */}
        <EditCarouselItemDialog
          item={editingItem}
          isOpen={!!editingItem}
          onClose={handleCloseEdit}
          onUpdate={updateItem}
        />
      </div>
    </div>
  );
};

export default CarouselManager;
