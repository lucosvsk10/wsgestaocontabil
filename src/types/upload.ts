
export interface FileWithPreview extends File {
  preview?: string;
  id: string;
  name: string;
  documentName?: string;
  documentCategory?: string;
  documentObservations?: string;
  expirationDate?: Date | null;
}

export interface DocumentUploadProps {
  userId: string;
  userName: string;
  documentCategories: string[];
  multipleFiles?: boolean;
}

export interface FileItemProps {
  file: FileWithPreview;
  updateFileField: (id: string, field: 'documentName' | 'documentCategory' | 'documentObservations', value: string) => void;
  updateFileExpirationDate: (id: string, date: Date | null) => void;
  removeFile: (id: string) => void;
  documentCategories: string[];
  useGlobalSettings: boolean;
}

export interface GlobalSettingsProps {
  globalCategory: string;
  setGlobalCategory: (category: string) => void;
  globalObservations: string;
  setGlobalObservations: (observations: string) => void;
  globalExpirationDate: Date | null;
  setGlobalExpirationDate: (date: Date | null) => void;
  noExpiration: boolean;
  setNoExpiration: (noExpiration: boolean) => void;
  useGlobalSettings: boolean;
  setUseGlobalSettings: (useGlobalSettings: boolean) => void;
  applyGlobalSettingsToAll: () => void;
  documentCategories: string[];
  filesCount: number;
}

export interface DropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  multipleFiles: boolean;
}
