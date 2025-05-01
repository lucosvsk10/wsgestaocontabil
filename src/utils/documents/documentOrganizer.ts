
import { Document } from "@/types/admin";

// Function to prioritize "Imposto de Renda" documents within "Impostos" category
export const organizeDocuments = (documents: Document[], categories: string[]): Record<string, Document[]> => {
  const organized: Record<string, Document[]> = {};
  
  // Initialize categories with empty arrays
  categories.forEach(category => {
    organized[category] = [];
  });
  
  // Group documents by category
  documents.forEach(doc => {
    // Handle category format "Category/Subcategory" by extracting the main category
    let category = doc.category || "Documentações";
    
    // If the category contains a slash, extract the main category
    if (category.includes('/')) {
      const parts = category.split('/');
      category = parts[0];
      
      // If it's Impostos/imposto de renda, set the subcategory for proper sorting
      if (category === "Impostos" && parts[1].toLowerCase().includes("imposto de renda")) {
        doc.subcategory = "Imposto de Renda";
      }
    }
    
    if (!organized[category]) {
      organized[category] = [];
    }
    organized[category].push(doc);
  });
  
  // Special sorting for "Impostos" category - prioritize "Imposto de Renda"
  if (organized["Impostos"]) {
    organized["Impostos"].sort((a, b) => {
      // If a is "Imposto de Renda" document, it should come first
      if (a.name.toLowerCase().includes("imposto de renda")) return -1;
      // If b is "Imposto de Renda" document, it should come first
      if (b.name.toLowerCase().includes("imposto de renda")) return 1;
      // If subcategory is used, check subcategory
      if (a.subcategory === "Imposto de Renda" && b.subcategory !== "Imposto de Renda") return -1;
      if (b.subcategory === "Imposto de Renda" && a.subcategory !== "Imposto de Renda") return 1;
      // Otherwise sort by uploaded_at (newest first)
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    });
  }
  
  // Sort other categories by date (newest first)
  categories.forEach(category => {
    if (category !== "Impostos" && organized[category]) {
      organized[category].sort((a, b) => 
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      );
    }
  });
  
  return organized;
};
