
import { LoadingSpinner } from "./LoadingSpinner";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = ({ message }: LoadingScreenProps) => {
  return (
    <div className="flex-grow flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        {message && <p className="mt-4 text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
};

export default LoadingScreen;
