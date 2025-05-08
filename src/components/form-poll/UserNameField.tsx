
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserNameFieldProps {
  userName: string;
  setUserName: (name: string) => void;
}

const UserNameField = ({ userName, setUserName }: UserNameFieldProps) => {
  return (
    <div className="space-y-2 mb-6">
      <Label htmlFor="user-name" className="font-medium">
        Seu Nome <span className="text-red-500">*</span>
      </Label>
      <Input
        id="user-name"
        placeholder="Digite seu nome"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        required
      />
    </div>
  );
};

export default UserNameField;
