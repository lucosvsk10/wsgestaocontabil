
-- Add the missing columns to the company_data table for admin-only fields
ALTER TABLE public.company_data 
ADD COLUMN registration_status text,
ADD COLUMN last_federal_update timestamp with time zone,
ADD COLUMN last_query_date timestamp with time zone,
ADD COLUMN internal_tags text[],
ADD COLUMN client_status text,
ADD COLUMN internal_observations text,
ADD COLUMN internal_responsible text;
