
import { Poll } from "@/types/polls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PollSelectorProps {
  polls: Poll[];
  selectedPollId: string | null;
  onPollChange: (pollId: string) => void;
}

export const PollSelector = ({ polls, selectedPollId, onPollChange }: PollSelectorProps) => {
  return (
    <div className="max-w-sm">
      <Select 
        value={selectedPollId || ""} 
        onValueChange={onPollChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione uma enquete" />
        </SelectTrigger>
        <SelectContent>
          {polls.map((poll) => (
            <SelectItem key={poll.id} value={poll.id}>
              {poll.title} - {
                poll.poll_type === 'standard_options' ? 'Enquete Padrão' :
                poll.poll_type === 'numerical' ? 'Formulário Numeral' :
                'Formulário Completo'
              }
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
