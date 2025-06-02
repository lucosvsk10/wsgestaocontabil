
import { DocumentCategory } from "@/types/common";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CategoryTabsProps {
  categories: DocumentCategory[];
  documentsByCategory: Record<string, any[]>;
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export const CategoryTabs = ({
  categories,
  documentsByCategory,
  activeCategory,
  onCategoryChange
}: CategoryTabsProps) => {
  return (
    <div className="mb-6">
      <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2">
        {categories.map((category) => {
          const documentCount = documentsByCategory[category.id]?.length || 0;
          const isActive = activeCategory === category.id;
          
          return (
            <motion.button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "relative flex-shrink-0 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap",
                isActive
                  ? "bg-[#F5C441] text-black"
                  : "bg-[#1a1f2e] text-white hover:bg-[#2a3441] border border-[#2a3441]"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="flex items-center gap-2">
                {category.name}
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-bold",
                  isActive
                    ? "bg-black/20 text-black"
                    : "bg-[#F5C441] text-black"
                )}>
                  {documentCount}
                </span>
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#F5C441] rounded-lg -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
