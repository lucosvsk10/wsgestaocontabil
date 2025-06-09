
-- Add new columns to company_data table for Receita Federal data
ALTER TABLE public.company_data 
ADD COLUMN fantasy_name text,
ADD COLUMN cadastral_situation text,
ADD COLUMN social_capital text,
ADD COLUMN main_activity text,
ADD COLUMN secondary_activities text,
ADD COLUMN number text,
ADD COLUMN neighborhood text,
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN postal_code text;
