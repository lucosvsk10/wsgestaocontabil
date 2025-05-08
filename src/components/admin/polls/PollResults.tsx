
import { useState } from "react";
import { Poll } from "@/types/polls";
import { 
  usePolls,
  useStandardPollResults, 
  useNumericalPollResults, 
  useFormPollResults 
} from "@/hooks/polls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NoPolls } from "./results/NoPolls";
import { PollResultsLoader } from "./results/PollResultsLoader";
import { StandardPollResults } from "./results/StandardPollResults";
import { NumericalPollResults } from "./results/NumericalPollResults";
import { FormPollResults } from "./results/FormPollResults";

interface PollResultsProps {
  selectedPoll: Poll | null;
}

export const PollResults = ({ selectedPoll }: PollResultsProps) => {
  // State for the selected poll
  const { polls, loading: pollsLoading, selectedPollId, setSelectedPollId } = usePolls(selectedPoll);
  
  // Get the current poll type to determine which hook to use
  const currentPoll = polls.find(p => p.id === selectedPollId);
  const currentPollType = currentPoll?.poll_type || 'standard_options';
  
  // Use the appropriate hook based on poll type
  const { loading: standardLoading, results: standardResults } = useStandardPollResults(
    currentPollType === 'standard_options' ? selectedPollId : null
  );
  
  const { loading: numericalLoading, results: numericalResults } = useNumericalPollResults(
    currentPollType === 'numerical' ? selectedPollId : null
  );
  
  const { loading: formLoading, results: formResults } = useFormPollResults(
    currentPollType === 'form' ? selectedPollId : null
  );
  
  // Determine if any data fetching is in progress
  const isLoading = pollsLoading || standardLoading || numericalLoading || formLoading;

  const handlePollChange = (pollId: string) => {
    setSelectedPollId(pollId);
  };

  if (pollsLoading) {
    return <PollResultsLoader />;
  }

  if (polls.length === 0) {
    return <NoPolls />;
  }

  return (
    <div className="space-y-6">
      <div className="max-w-sm">
        <Select 
          value={selectedPollId || ""} 
          onValueChange={handlePollChange}
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

      {isLoading && <PollResultsLoader />}
      
      {!isLoading && currentPollType === 'standard_options' && standardResults && (
        <StandardPollResults results={standardResults} />
      )}
      
      {!isLoading && currentPollType === 'numerical' && numericalResults && (
        <NumericalPollResults results={numericalResults} />
      )}
      
      {!isLoading && currentPollType === 'form' && formResults && (
        <FormPollResults results={formResults} />
      )}
    </div>
  );
};
