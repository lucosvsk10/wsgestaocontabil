
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DocumentCategory } from "@/types/admin";

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: DocumentCategory[];
  isLoading: boolean;
  onAdd: (name: string, color?: string) => Promise<boolean>;
  onUpdate: (id: string, name: string, color?: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  categories,
  isLoading,
  onAdd,
  onUpdate,
  onDelete
}) => {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#F5C441"); // Amarelo padrão
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsProcessing(true);
    const success = await onAdd(newCategoryName.trim(), newCategoryColor);
    setIsProcessing(false);
    
    if (success) {
      setNewCategoryName("");
    }
  };

  const startEditing = (category: DocumentCategory) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditColor(category.color || "#F5C441");
  };

  const cancelEditing = () => {
    setEditingCategory(null);
    setEditName("");
    setEditColor("");
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editName.trim()) return;
    
    setIsProcessing(true);
    const success = await onUpdate(editingCategory.id, editName.trim(), editColor);
    setIsProcessing(false);
    
    if (success) {
      cancelEditing();
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta categoria?")) return;
    
    setIsProcessing(true);
    await onDelete(categoryId);
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-navy-dark">
        <DialogHeader>
          <DialogTitle className="text-navy dark:text-gold text-xl font-medium">
            Gerenciar Categorias de Documentos
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {/* Formulário para adicionar nova categoria */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-navy-deeper rounded-lg">
            <h3 className="font-medium mb-2 text-navy dark:text-gold">Nova Categoria</h3>
            <div className="flex flex-col md:flex-row gap-3">
              <Input
                placeholder="Nome da categoria"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 border-gray-300 dark:border-navy-lighter/50 bg-white dark:bg-navy-light/20 dark:text-white"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-16 h-9 p-1 cursor-pointer"
                />
                <Button 
                  onClick={handleAddCategory} 
                  disabled={!newCategoryName.trim() || isProcessing}
                  className="bg-gold hover:bg-gold/80 text-navy dark:text-navy-dark"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>

          {/* Lista de categorias existentes */}
          <div className="overflow-y-auto max-h-[400px] pr-1">
            <h3 className="font-medium mb-3 text-navy dark:text-gold">
              Categorias Existentes
            </h3>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : categories.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                Nenhuma categoria cadastrada.
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div 
                    key={category.id}
                    className={`p-3 rounded-lg border ${
                      editingCategory?.id === category.id
                        ? "border-gold bg-navy/5 dark:bg-gold/10"
                        : "border-gray-200 dark:border-navy-lighter/30"
                    }`}
                  >
                    {editingCategory?.id === category.id ? (
                      // Modo de edição
                      <div className="flex flex-col md:flex-row gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 border-gray-300 dark:border-navy-lighter/50 bg-white dark:bg-navy-light/20 dark:text-white"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="w-16 h-9 p-1 cursor-pointer"
                          />
                          <Button 
                            onClick={handleUpdateCategory} 
                            disabled={!editName.trim() || isProcessing}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            Salvar
                          </Button>
                          <Button 
                            onClick={cancelEditing} 
                            variant="outline"
                            size="sm"
                            className="border-gray-300 dark:border-navy-lighter/40"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Modo de visualização
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-5 h-5 rounded-full"
                            style={{ backgroundColor: category.color || '#F5C441' }}
                          />
                          <span className="font-medium text-navy-dark dark:text-white">
                            {category.name}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Button 
                            onClick={() => startEditing(category)} 
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-navy dark:hover:text-gold"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => handleDeleteCategory(category.id)} 
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={onClose}
            variant="outline" 
            className="border-gray-300 dark:border-navy-lighter/40"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
