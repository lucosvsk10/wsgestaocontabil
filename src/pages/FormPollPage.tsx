
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FormContainer from "@/components/form-poll/FormContainer";
import FormQuestions from "@/components/form-poll/FormQuestions";
import UserNameField from "@/components/form-poll/UserNameField";
import CommentField from "@/components/form-poll/CommentField";
import SuccessMessage from "@/components/form-poll/SuccessMessage";
import FormFooter from "@/components/form-poll/FormFooter";
import LoadingScreen from "@/components/common/LoadingScreen";
import NotFoundMessage from "@/components/form-poll/NotFoundMessage";
import { useFormPoll } from "@/hooks/polls/useFormPoll";

const FormPollPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    poll,
    questions,
    loading,
    isSubmitting,
    hasVoted,
    userName,
    setUserName,
    comment,
    setComment,
    responses,
    handleResponseChange,
    handleCheckboxChange,
    handleSubmit
  } = useFormPoll(id, user);
  
  const handleGoHome = () => navigate("/");

  return (
    <div className="min-h-screen flex flex-col bg-orange-100 dark:bg-navy-dark">
      <Navbar />
      <div className="container mx-auto p-4 max-w-4xl flex-grow">
        {loading ? (
          <LoadingScreen />
        ) : !poll ? (
          <FormContainer 
            poll={null} 
            footer={<FormFooter hasVoted={true} isSubmitting={false} onGoHome={handleGoHome} onSubmit={() => {}} />}
          >
            <NotFoundMessage onGoHome={handleGoHome} />
          </FormContainer>
        ) : (
          <FormContainer 
            poll={poll} 
            footer={
              <FormFooter 
                hasVoted={hasVoted} 
                isSubmitting={isSubmitting} 
                onGoHome={handleGoHome} 
                onSubmit={handleSubmit}
              />
            }
          >
            {!hasVoted ? (
              <div className="space-y-8">
                {/* Nome para usuários não logados */}
                {!user && <UserNameField userName={userName} setUserName={setUserName} />}
                
                {/* Perguntas */}
                <FormQuestions 
                  questions={questions} 
                  responses={responses}
                  onResponseChange={handleResponseChange}
                  onCheckboxChange={handleCheckboxChange}
                />
                
                {/* Campo de comentários opcional */}
                {poll.allow_comments && (
                  <CommentField comment={comment} setComment={setComment} />
                )}
              </div>
            ) : (
              <SuccessMessage />
            )}
          </FormContainer>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default FormPollPage;
