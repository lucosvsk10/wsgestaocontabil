
import React from "react";

interface DocumentProgressBarProps {
  uploadProgress: number;
}

export const DocumentProgressBar: React.FC<DocumentProgressBarProps> = ({ uploadProgress }) => {
  return (
    <div className="w-full bg-gray-200 dark:bg-navy-light/30 rounded-full h-2 mt-4">
      <div 
        className="bg-[#efc349] dark:bg-gold h-2 rounded-full" 
        style={{width: `${uploadProgress}%`}}
      />
    </div>
  );
};
