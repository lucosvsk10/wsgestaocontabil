
import { Plus } from "lucide-react";

export const QuickActionButton = () => {
  return (
    <button className="fixed bottom-8 right-8 w-14 h-14 bg-[#efc349] hover:bg-[#d6a932] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group z-50">
      <Plus className="w-6 h-6 text-[#020817] group-hover:rotate-90 transition-transform duration-300" />
    </button>
  );
};
