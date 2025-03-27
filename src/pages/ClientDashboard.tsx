
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Document {
  id: string;
  title: string;
  description: string;
  date: string;
  fileUrl: string;
}

// Sample documents data (in a real app, this would come from an API/database)
const sampleDocuments: Document[] = [
  {
    id: "1",
    title: "Relatório Financeiro Q1",
    description: "Relatório financeiro do primeiro trimestre de 2023",
    date: "15/03/2023",
    fileUrl: "#"
  },
  {
    id: "2",
    title: "Declaração de Imposto de Renda",
    description: "Documento para declaração do IR 2023",
    date: "20/04/2023",
    fileUrl: "#"
  },
  {
    id: "3",
    title: "Balanço Patrimonial",
    description: "Balanço patrimonial anual atualizado",
    date: "10/01/2023",
    fileUrl: "#"
  }
];

const ClientDashboard = () => {
  const [documents, setDocuments] = useState<Document[]>(sampleDocuments);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem("userAuth");
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("userAuth");
    localStorage.removeItem("userEmail");
    navigate("/login");
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
        
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6">Documentos Disponíveis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <Card key={doc.id} className="bg-gray-900 border-gray-800 hover:border-gold/30 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl text-gold">{doc.title}</CardTitle>
                  <CardDescription className="text-gray-400 text-xs">{doc.date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300">{doc.description}</p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full flex items-center justify-center gap-2 border-gold/30 text-gold hover:bg-gold hover:text-navy"
                    onClick={() => window.open(doc.fileUrl, "_blank")}
                  >
                    <Download size={16} />
                    Baixar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ClientDashboard;
