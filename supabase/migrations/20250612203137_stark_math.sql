/*
  # Create form builder database schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `password` (text)
      - `role` (user_role enum)
      - `created_at` (timestamp)
    - `forms`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `questions` (jsonb)
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `version` (integer)
    - `responses`
      - `id` (uuid, primary key)
      - `form_id` (uuid, foreign key)
      - `form_version` (integer)
      - `responses` (jsonb)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamp)
      - `updated_offline` (boolean)

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control based on user roles

  3. Changes
    - Create enum type safely (only if it doesn't exist)
    - Create all tables with proper constraints
    - Add indexes for performance
*/

-- Create user_role enum type only if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now()
);

-- Create forms table
CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  questions jsonb NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  form_version integer NOT NULL,
  responses jsonb NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_offline boolean DEFAULT false
);

-- Enable RLS on all tables
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