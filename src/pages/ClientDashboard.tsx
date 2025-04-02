
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { Document, predefinedUsers } from "@/data/users";

const ClientDashboard = () => {
  // Example data using the first user in our predefined list
  const user = predefinedUsers[0];
  const [documents] = useState<Document[]>(user?.documents || []);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    navigate("/login");
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'numeric', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gold">Área do Cliente</h1>
          <Button 
            variant="outline" 
            className="border-gold text-gold hover:bg-gold hover:text-navy"
            onClick={handleLogout}
          >
            Sair
          </Button>
        </div>
        
        {user && (
          <div className="mb-6">
            <h2 className="text-xl font-medium text-white">Bem-vindo, {user.name}</h2>
          </div>
        )}
        
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Documentos Disponíveis</h2>
          
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Card key={doc.id} className="bg-gray-900 border-gray-800 hover:border-gold/30 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl text-gold">{doc.name}</CardTitle>
                    <CardDescription className="text-gray-400 text-xs">
                      {formatDate(doc.uploadedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300">
                      Documento disponibilizado pelo seu contador.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full flex items-center justify-center gap-2 border-gold/30 text-gold hover:bg-gold hover:text-navy"
                      onClick={() => window.open(doc.mockUrl, "_blank")}
                    >
                      <Download size={16} />
                      Baixar
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-900/50 rounded-lg border border-gray-800">
              <Download className="mx-auto h-12 w-12 text-gray-600 mb-3" />
              <h3 className="text-xl font-medium text-white mb-2">Nenhum documento disponível</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                No momento, não há documentos disponíveis para download. 
                Novos documentos aparecerão aqui quando forem compartilhados pelo seu contador.
              </p>
            </div>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ClientDashboard;
