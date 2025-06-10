
import { useState } from "react";
import CarouselNavbar from "./CarouselNavbar";
import CarouselHeader from "./components/CarouselHeader";
import ClientCard from "./components/ClientCard";
import EditClientDialog from "./components/EditClientDialog";
import { useCarouselClients, ClientItem } from "./hooks/useCarouselClients";

const CarouselManager = () => {
  const {
    clients,
    addClient,
    updateClient,
    deleteClient,
    toggleClientStatus,
    handleImageUpload,
    handleImageRemoval
  } = useCarouselClients();

  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);

  const openEditDialog = (client: ClientItem) => {
    setEditingClient(client);
  };

  const closeEditDialog = () => {
    setEditingClient(null);
  };

  return (
    <div className="min-h-screen">
      <CarouselNavbar title="Gerenciar Carousel" />
      
      <div className="pt-20 p-6 space-y-6">
        <CarouselHeader 
          clientsCount={clients.length}
          onAddClient={addClient}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={openEditDialog}
              onDelete={deleteClient}
              onToggleStatus={toggleClientStatus}
              onImageUpload={handleImageUpload}
              onImageRemoval={handleImageRemoval}
            />
          ))}
        </div>

        <EditClientDialog
          client={editingClient}
          isOpen={!!editingClient}
          onClose={closeEditDialog}
          onUpdateClient={updateClient}
        />
      </div>
    </div>
  );
};

export default CarouselManager;
