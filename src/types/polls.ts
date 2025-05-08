
export interface Poll {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  expires_at: string | null;
  allow_comments: boolean;
  created_at: string;
  created_by: string;
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
