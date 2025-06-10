/*
  # Update database schema for form builder

  1. New Tables
    - Ensure `users` table has proper structure with user_role enum
    - Ensure `forms` table has proper structure with JSONB questions
    - Ensure `responses` table has proper structure with JSONB responses
  
  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control based on user roles
    
  3. Changes
    - Update any missing columns or constraints
    - Ensure proper foreign key relationships
*/

-- Create user_role enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update users table structure if needed
DO $$
BEGIN
  -- Add any missing columns to users table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE users ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Update forms table structure if needed
DO $$
BEGIN
  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forms' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE forms ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forms' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE forms ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  
  -- Add version column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forms' AND column_name = 'version'
  ) THEN
    ALTER TABLE forms ADD COLUMN version integer DEFAULT 1;
  END IF;
END $$;

-- Update responses table structure if needed
DO $$
BEGIN
  -- Add form_version column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'responses' AND column_name = 'form_version'
  ) THEN
    ALTER TABLE responses ADD COLUMN form_version integer DEFAULT 1;
  END IF;
  
  -- Add created_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'responses' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE responses ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  
  -- Add updated_offline column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'responses' AND column_name = 'updated_offline'
  ) THEN
    ALTER TABLE responses ADD COLUMN updated_offline boolean DEFAULT false;
  END IF;
END $$;

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Forms are viewable by everyone" ON forms;
DROP POLICY IF EXISTS "Forms can be created by admin users" ON forms;
DROP POLICY IF EXISTS "Forms can be updated by admin users" ON forms;
DROP POLICY IF EXISTS "Forms can be deleted by admin users" ON forms;
DROP POLICY IF EXISTS "Users can create responses" ON responses;
DROP POLICY IF EXISTS "Users can view their own responses" ON responses;
DROP POLICY IF EXISTS "Users can update their own responses" ON responses;
DROP POLICY IF EXISTS "Users can delete their own responses" ON responses;

-- Create policies for users table
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policies for forms table
CREATE POLICY "Forms are viewable by everyone"
  ON forms
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Forms can be created by admin users"
  ON forms
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Forms can be updated by admin users"
  ON forms
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Forms can be deleted by admin users"
  ON forms
  FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin');

-- Create policies for responses table
CREATE POLICY "Users can create responses"
  ON responses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own responses"
  ON responses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Users can update their own responses"
  ON responses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "Users can delete their own responses"
  ON responses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') = 'admin');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_updated_at ON forms(updated_at);
CREATE INDEX IF NOT EXISTS idx_responses_form_id ON responses(form_id);
CREATE INDEX IF NOT EXISTS idx_responses_user_id ON responses(user_id);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);