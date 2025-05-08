
export interface Poll {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  expires_at: string | null;
  allow_comments: boolean;
  created_at: string;
  created_by: string;
  poll_type: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  created_at: string;
}

export interface PollResponse {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string | null;
  comment: string | null;
  created_at: string;
  user_name?: string; // Campo adicional para armazenar o nome de usuários não logados
}

export interface PollOptionWithVoteCount extends PollOption {
  response_count: number;
}

export interface PollResponseWithUserInfo extends PollResponse {
  user_name?: string;
  user_email?: string;
  option_text?: string;
}

export interface FormattedPollResults {
  poll: Poll;
  options: PollOptionWithVoteCount[];
  responses: PollResponseWithUserInfo[];
  totalVotes: number;
}

// New types for numerical questions polls
export interface NumericalQuestion {
  id: string;
  poll_id: string;
  question_text: string;
  min_value: number;
  max_value: number;
  created_at: string;
}

export interface NumericalResponse {
  id: string;
  question_id: string;
  poll_id: string;
  user_id: string | null;
  user_name: string | null;
  value: number;
  created_at: string;
}

// New types for form questions polls
export interface FormQuestion {
  id: string;
  poll_id: string;
  question_text: string;
  question_type: 'short_text' | 'paragraph' | 'multiple_choice' | 'checkbox' | 'scale';
  options: any | null;
  required: boolean;
  order_position: number;
  created_at: string;
}

export interface FormResponse {
  id: string;
  question_id: string;
  poll_id: string;
  user_id: string | null;
  user_name: string | null;
  response_value: string | null;
  created_at: string;
}

export interface FormattedNumericalResults {
  poll: Poll;
  questions: NumericalQuestion[];
  responses: NumericalResponse[];
  stats: {
    questionId: string;
    questionText: string;
    averageValue: number;
    minValue: number;
    maxValue: number;
    responseCount: number;
    valueDistribution: Record<number, number>;
  }[];
}

export interface FormattedFormResults {
  poll: Poll;
  questions: FormQuestion[];
  responses: FormResponse[];
  stats: {
    questionId: string;
    questionText: string;
    responseCount: number;
    responseDistribution: Record<string, number>;
  }[];
}

export type PollType = 'standard_options' | 'numerical' | 'form';
