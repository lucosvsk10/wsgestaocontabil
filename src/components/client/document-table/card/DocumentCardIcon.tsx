
import { File, FileText, FileImage } from "lucide-react";
import { Document } from "@/utils/auth/types";

interface DocumentCardIconProps {
  document: Document;
}

export const DocumentCardIcon = ({ document }: DocumentCardIconProps) => {
  const filename = document.filename || document.original_filename || "";
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (!extension) return <File className="h-8 w-8 text-navy dark:text-gold" />;
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
    return <FileImage className="h-8 w-8 text-blue-600 dark:text-blue-400" />;
  }
  
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(extension)) {
    return <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />;
  }
  
  return <File className="h-8 w-8 text-navy dark:text-gold" />;
};
