
import { supabase } from "@/integrations/supabase/client";

/**
 * Gets the current session's access token
 * @returns Promise with the access token or undefined
 */
export const getAccessToken = async (): Promise<string | undefined> => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token;
};

/**
 * Call a Supabase Edge Function
 * @param functionName Name of the edge function to call
 * @param payload Data to send in the request body
 * @returns Promise with the response data
 */
export const callEdgeFunction = async <T = any>(
  functionName: string,
  payload: any
): Promise<T> => {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error calling function ${functionName}: ${response.statusText}`);
  }
  
  return await response.json();
};
