CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgmq";

-- enum types
CREATE TYPE call_status AS ENUM (
  'scheduled', 'queued', 'in_progress', 'completed', 'failed', 'cancelled'
);

CREATE TYPE call_outcome AS ENUM (
  'successful', 'no_answer', 'busy', 'voicemail', 'failed', 'human_hangup'
);

CREATE TYPE call_priority AS ENUM ('low', 'normal', 'high');

-- Contacts table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- call templates table
CREATE TABLE call_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  voice_id TEXT NOT NULL,
  initial_message TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  closing_message TEXT,
  extraction_schema JSONB DEFAULT '{}',
  max_duration_seconds INTEGER DEFAULT 300,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_ad TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Calls table
CREATE TABLE scheduled_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES call_templates(id) ON DELETE CASCADE,
  status call_status NOT NULL DEFAULT 'scheduled',
  priority call_priority NOT NULL DEFAULT 'normal',
  scheduled_at TIMESTAMPTZ NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call Records
CREATE TABLE call_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheduled_call_id UUID NOT NULL REFERENCES scheduled_calls(id) ON DELETE CASCADE,
  provider_call_id TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  outcome call_outcome,
  recording_url TEXT,
  transcript JSONB DEFAULT '[]',
  raw_provider_data JSONB DEFAULT '{}',
  cost_telephony DECIMAL(10, 4) DEFAULT 0,
  cost_ai DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- extracted data from call
CREATE TABLE extracted_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_record_id UUID NOT NULL UNIQUE REFERENCES call_records(id) ON DELETE CASCADE,
  structured_data JSONB NOT NULL,
  confidence_score DECIMAL(3, 2),
  extraction_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes                                                                  
CREATE INDEX idx_contacts_user_id ON contacts(user_id);                     
CREATE INDEX idx_call_templates_user_id ON call_templates(user_id);         
CREATE INDEX idx_scheduled_calls_user_id ON scheduled_calls(user_id);       
CREATE INDEX idx_scheduled_calls_status ON scheduled_calls(status);         
CREATE INDEX idx_scheduled_calls_scheduled_at ON                            
scheduled_calls(scheduled_at) WHERE status IN ('scheduled', 'queued');      
                                                                            
-- Create pgmq queues                                                       
SELECT pgmq.create('call_queue');                                           
SELECT pgmq.create('extraction_queue');                                     
SELECT pgmq.create('notification_queue');