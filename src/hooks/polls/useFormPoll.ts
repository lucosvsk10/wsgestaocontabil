
import { useState } from "react";
import { useFormPollData } from "./useFormPollData";
import { useFormResponses, ResponseState } from "./useFormResponses";
import { useFormSubmission } from "./useFormSubmission";
import { Poll, FormQuestion } from "@/types/polls";

interface UseFormPollResult {
  poll: Poll | null;
  questions: FormQuestion[];
  loading: boolean;
  isSubmitting: boolean;
  hasVoted: boolean;
  userName: string;
  setUserName: (name: string) => void;
  comment: string;
  setComment: (comment: string) => void;
  responses: ResponseState[];
  handleResponseChange: (questionId: string, value: string | string[] | number | null) => void;
  handleCheckboxChange: (questionId: string, value: string, checked: boolean) => void;
  handleSubmit: () => Promise<void>;
}

export const useFormPoll = (pollId: string | undefined, user: any | null): UseFormPollResult => {
  const [hasVotedState, setHasVotedState] = useState(false);
  
  // Get poll data and questions
  const { 
    poll, 
    questions, 
    loading, 
    hasVoted: initialHasVoted 
  } = useFormPollData(pollId, user);
  
  // Handle form responses
  const {
    responses,
    userName,
    comment,
    setUserName,
    setComment,
    handleResponseChange,
    handleCheckboxChange
  } = useFormResponses(questions);
  
  // Handle form submission
  const {
    isSubmitting,
    handleSubmit
  } = useFormSubmission({
    pollId,
    user,
    poll,
    questions,
    responses,
    userName,
    comment,
    setHasVoted: setHasVotedState
  });
  
  // Combine the initial hasVoted state from the data fetch with the local state
  const hasVoted = initialHasVoted || hasVotedState;
  
  return {
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
  };
};
