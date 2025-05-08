
import { Card, CardContent } from "@/components/ui/card";
import { FormattedNumericalResults } from "@/types/polls";
import { PollResultsHeader } from "./PollResultsHeader";
import { OptionDistributionChart, ChartDataItem } from "./OptionDistributionChart";

interface NumericalPollResultsProps {
  results: FormattedNumericalResults;
}

export const NumericalPollResults = ({ results }: NumericalPollResultsProps) => {
  return (
    <Card>
      <PollResultsHeader poll={results.poll} />
      <CardContent>
        {results.stats.length === 0 ? (
          <p className="text-center py-4">Este formulário não possui perguntas.</p>
        ) : (
          <div className="space-y-8">
            {results.stats.map((stat, index) => (
              <div key={stat.questionId} className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="font-medium text-lg">{index + 1}. {stat.questionText}</h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>Média: <strong>{stat.averageValue}</strong></span>
                    <span>Min: <strong>{stat.minValue}</strong></span>
                    <span>Max: <strong>{stat.maxValue}</strong></span>
                    <span>Respostas: <strong>{stat.responseCount}</strong></span>
                  </div>
                </div>
                
                {stat.responseCount > 0 ? (
                  <OptionDistributionChart 
                    data={Object.entries(stat.valueDistribution).map(([value, count]) => ({
                      name: value,
                      value: parseInt(value),
                      count
                    }))}
                    labelKey="name"
                    valueKey="count"
                    xAxisAngle={0}
                    xAxisHeight={40}
                    showPercentage={false}
                  />
                ) : (
                  <p className="text-center py-4">Esta pergunta ainda não recebeu respostas.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
