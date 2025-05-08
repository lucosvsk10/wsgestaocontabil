
import { useState } from "react";
import { FormQuestion } from "@/types/polls";

export interface ResponseState {
  questionId: string;
  response: string | string[] | number | null;
}

interface UseFormResponsesResult {
  responses: ResponseState[];
  userName: string;
  comment: string;
  setUserName: (name: string) => void;
  setComment: (comment: string) => void;
  handleResponseChange: (questionId: string, value: string | string[] | number | null) => void;
  handleCheckboxChange: (questionId: string, value: string, checked: boolean) => void;
}

export const useFormResponses = (questions: FormQuestion[]): UseFormResponsesResult => {
  const [userName, setUserName] = useState("");
  const [comment, setComment] = useState("");
  const [responses, setResponses] = useState<ResponseState[]>(() => {
    // Initialize responses array based on questions
    return questions.map((question: FormQuestion) => ({
      questionId: question.id,
      response: question.question_type === 'checkbox' ? [] : null
    }));
  });

  // Update responses when questions change
  if (questions.length > 0 && responses.length === 0) {
    setResponses(questions.map((question: FormQuestion) => ({
      questionId: question.id,
      response: question.question_type === 'checkbox' ? [] : null
    })));
  }

  const handleResponseChange = (questionId: string, value: string | string[] | number | null) => {
    setResponses(prev => 
      prev.map(response => 
        response.questionId === questionId 
          ? { ...response, response: value } 
          : response
      )
    );
  };
  
  const handleCheckboxChange = (questionId: string, value: string, checked: boolean) => {
    setResponses(prev => 
      prev.map(response => {
        if (response.questionId !== questionId) return response;
        
        const currentValues = Array.isArray(response.response) ? response.response : [];
        let newValues: string[];
        
        if (checked) {
          newValues = [...currentValues, value];
        } else {
          newValues = currentValues.filter(v => v !== value);
        }
        
        return { ...response, response: newValues };
      })
    );
  };

  return {
    responses,
    userName,
    comment,
    setUserName,
    setComment,
    handleResponseChange,
    handleCheckboxChange
  };
};
