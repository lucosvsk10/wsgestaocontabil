
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FormattedPollResults } from "@/types/polls";
import { PollResultsHeader } from "./PollResultsHeader";
import { OptionDistributionChart } from "./OptionDistributionChart";
import { PieDistributionChart } from "./PieDistributionChart";
import { CommentsList } from "./CommentsList";

interface StandardPollResultsProps {
  results: FormattedPollResults;
}

export const StandardPollResults = ({ results }: StandardPollResultsProps) => {
  const [visibleTab, setVisibleTab] = useState<string>("summary");
  
  // Format data for charts
  const chartData = results.options.map(option => ({
    name: option.option_text,
    value: option.response_count,
    percentage: results.totalVotes > 0 
      ? `${Math.round((option.response_count / results.totalVotes) * 100)}%` 
      : "0%"
  }));
  
  return (
    <Card>
      <PollResultsHeader poll={results.poll} />
      <CardContent>
        <Tabs value={visibleTab} onValueChange={setVisibleTab}>
          <TabsList>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
            {results.responses.length > 0 && (
              <TabsTrigger value="comments">
                Comentários ({results.responses.length})
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="summary">
            {results.totalVotes > 0 ? (
              <div className="space-y-8">
                <OptionDistributionChart data={chartData} />
                <PieDistributionChart data={chartData} />
              </div>
            ) : (
              <p className="text-center py-4">Esta enquete ainda não recebeu votos.</p>
            )}
          </TabsContent>
          
          <TabsContent value="comments">
            <CommentsList responses={results.responses} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
