
import LoadingScreen from "@/components/common/LoadingScreen";

interface PollResultsLoaderProps {
  message?: string;
}

export const PollResultsLoader = ({ 
  message = "Carregando resultados..." 
}: PollResultsLoaderProps) => {
  return <LoadingScreen message={message} />;
};
