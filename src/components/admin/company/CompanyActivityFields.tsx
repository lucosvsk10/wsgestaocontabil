
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ActivityFormData {
  main_activity: string;
  secondary_activities: string;
}

interface CompanyActivityFieldsProps {
  formData: ActivityFormData;
  isAdmin: boolean;
  onInputChange: (field: string, value: string) => void;
}

export const CompanyActivityFields = ({ 
  formData, 
  isAdmin, 
  onInputChange 
}: CompanyActivityFieldsProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="main_activity" className="text-[#020817] dark:text-white font-extralight">
          Atividade Principal
        </Label>
        <Input
          id="main_activity"
          value={formData.main_activity}
          onChange={(e) => onInputChange('main_activity', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          disabled={!isAdmin}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="secondary_activities" className="text-[#020817] dark:text-white font-extralight">
          Atividades Secundárias
        </Label>
        <Textarea
          id="secondary_activities"
          value={formData.secondary_activities}
          onChange={(e) => onInputChange('secondary_activities', e.target.value)}
          className="bg-white dark:bg-transparent border-gray-200 dark:border-[#efc349]/30"
          rows={3}
          disabled={!isAdmin}
        />
      </div>
    </div>
  );
};
