
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Poll } from "@/types/polls";

interface FormContainerProps {
  poll: Poll | null;
  children: React.ReactNode;
  footer: React.ReactNode;
}

const FormContainer = ({ poll, children, footer }: FormContainerProps) => {
  return (
    <Card className="bg-white dark:bg-navy-dark border border-gold/20">
      <CardHeader>
        <CardTitle className="text-2xl text-navy dark:text-gold">{poll?.title}</CardTitle>
        {poll?.description && (
          <CardDescription className="mt-2">
            {poll.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent>
        {children}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {footer}
      </CardFooter>
    </Card>
  );
};

export default FormContainer;
