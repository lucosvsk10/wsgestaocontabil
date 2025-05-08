
import { format } from "date-fns";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Poll } from "@/types/polls";

interface PollResultsHeaderProps {
  poll: Poll;
}

export const PollResultsHeader = ({ poll }: PollResultsHeaderProps) => {
  return (
    <CardHeader>
      <CardTitle>{poll.title}</CardTitle>
      <CardDescription>
        {poll.description}
        <div className="mt-2 text-sm text-muted-foreground">
          <p>Criada em: {format(new Date(poll.created_at), "dd/MM/yyyy")}</p>
          {poll.expires_at && (
            <p>Expira em: {format(new Date(poll.expires_at), "dd/MM/yyyy")}</p>
          )}
        </div>
      </CardDescription>
    </CardHeader>
  );
};
