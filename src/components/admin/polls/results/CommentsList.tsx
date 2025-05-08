
import { format } from "date-fns";
import { PollResponseWithUserInfo } from "@/types/polls";

interface CommentsListProps {
  responses: PollResponseWithUserInfo[];
}

export const CommentsList = ({ responses }: CommentsListProps) => {
  return (
    <div className="space-y-4">
      {responses.map((response) => (
        <div 
          key={response.id} 
          className="p-4 border rounded-lg bg-orange-50/50 dark:bg-navy-light/20"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">
                {response.user_name || "Anônimo"}
                {response.user_email && ` (${response.user_email})`}
              </p>
              <p className="text-sm text-muted-foreground">
                Votou em: {response.option_text}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {format(new Date(response.created_at), "dd/MM/yyyy HH:mm")}
            </span>
          </div>
          <p className="mt-2">{response.comment}</p>
        </div>
      ))}
    </div>
  );
};
