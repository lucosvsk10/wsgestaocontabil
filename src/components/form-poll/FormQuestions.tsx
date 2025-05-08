
import { useState } from "react";
import { FormQuestion, FormResponse } from "@/types/polls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface FormQuestionsProps {
  questions: FormQuestion[];
  responses: FormResponse[];
  onResponseChange: (questionId: string, value: string | string[] | number | null) => void;
  onCheckboxChange: (questionId: string, value: string, checked: boolean) => void;
}

const FormQuestions = ({ 
  questions, 
  responses, 
  onResponseChange, 
  onCheckboxChange 
}: FormQuestionsProps) => {
  
  const renderQuestionInput = (question: FormQuestion, index: number) => {
    const response = responses.find(r => r.question_id === question.id);
    
    switch(question.question_type) {
      case 'short_text':
        return (
          <Input 
            id={question.id} 
            value={(response?.response_value as string) || ''} 
            onChange={(e) => onResponseChange(question.id, e.target.value)}
            placeholder="Sua resposta"
          />
        );
        
      case 'paragraph':
        return (
          <Textarea 
            id={question.id} 
            value={(response?.response_value as string) || ''} 
            onChange={(e) => onResponseChange(question.id, e.target.value)}
            placeholder="Sua resposta"
          />
        );
        
      case 'multiple_choice':
        return (
          <RadioGroup 
            value={(response?.response_value as string) || ''}
            onValueChange={(value) => onResponseChange(question.id, value)}
          >
            <div className="space-y-2">
              {question.options?.options?.map((option: string) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                  <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );
        
      case 'checkbox':
        return (
          <div className="space-y-2">
            {question.options?.options?.map((option: string) => {
              const selectedOptions = (response?.response_value ? JSON.parse(response.response_value as string) : []) as string[];
              return (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`${question.id}-${option}`} 
                    checked={selectedOptions.includes(option)}
                    onCheckedChange={(checked) => onCheckboxChange(question.id, option, !!checked)}
                  />
                  <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                </div>
              );
            })}
          </div>
        );
        
      case 'scale':
        const min = question.options?.min || 1;
        const max = question.options?.max || 5;
        const currentValue = response?.response_value ? 
          parseInt(response.response_value as string) : 
          Math.round((min + max) / 2);
          
        return (
          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center text-sm">
              <span>{min}</span>
              <span>{max}</span>
            </div>
            <Slider
              id={question.id}
              value={[currentValue]}
              min={min}
              max={max}
              step={1}
              onValueChange={(value) => onResponseChange(question.id, value[0])}
              className="my-4"
            />
            <div className="text-center font-bold text-xl mt-2">
              {currentValue}
            </div>
          </div>
        );
        
      default:
        return <p>Tipo de questão não suportado</p>;
    }
  };
  
  return (
    <div className="space-y-8">
      {questions.map((question, index) => (
        <div key={question.id} className="space-y-4 p-4 border rounded-lg bg-orange-50/30 dark:bg-navy-light/20">
          <Label className="text-lg font-medium" htmlFor={question.id}>
            {index + 1}. {question.question_text}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <div className="pt-2">
            {renderQuestionInput(question, index)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FormQuestions;
