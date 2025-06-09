
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AdminFormData {
  client_status: string;
  internal_responsible: string;
  internal_tags: string;
  internal_observations: string;
}

interface CompanyAdminFieldsProps {
  formData: AdminFormData;
  onInputChange: (field: string, value: string) => void;
}

export const CompanyAdminFields = ({ 
  formData, 
  onInputChange 
}: CompanyAdminFieldsProps) => {
  return (
    <div className="border-t pt-6 space-y-6">
      <h3 className="text-[#020817] dark:text-[#efc349] font-medium">Informações Administrativas</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="client_status" className="text-[#020817] dark:text-white font-extralight">
            Status do Cliente
          </Label>
          <Input
            id="client_status"
            value={formData.client_status}
            onChange={(e) => onInputChange('client_status', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="internal_responsible" className="text-[#020817] dark:text-white font-extralight">
            Responsável Interno
          </Label>
          <Input
            id="internal_responsible"
            value={formData.internal_responsible}
            onChange={(e) => onInputChange('internal_responsible', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="internal_tags" className="text-[#020817] dark:text-white font-extralight">
            Tags Internas (separadas por vírgula)
          </Label>
          <Input
            id="internal_tags"
            value={formData.internal_tags}
            onChange={(e) => onInputChange('internal_tags', e.target.value)}
            className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
            placeholder="tag1, tag2, tag3"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="internal_observations" className="text-[#020817] dark:text-white font-extralight">
          Observações Internas
        </Label>
        <Textarea
          id="internal_observations"
          value={formData.internal_observations}
          onChange={(e) => onInputChange('internal_observations', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          rows={4}
        />
      </div>
    </div>
  );
};
