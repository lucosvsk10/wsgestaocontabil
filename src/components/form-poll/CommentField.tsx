
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CommentFieldProps {
  comment: string;
  setComment: (comment: string) => void;
}

const CommentField = ({ comment, setComment }: CommentFieldProps) => {
  return (
    <div className="space-y-2 mt-6">
      <Label htmlFor="comment">Comentário (opcional)</Label>
      <Textarea 
        id="comment"
        placeholder="Adicione um comentário adicional se desejar"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="resize-none h-24"
      />
    </div>
  );
};

export default CommentField;
