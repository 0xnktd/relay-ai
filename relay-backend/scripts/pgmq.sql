-- Enable pgmq                                                                                     
CREATE EXTENSION IF NOT EXISTS pgmq;                                                               
                                                                                                    
-- Create queues (ignore if already exists)                                                        
DO $$                                                                                              
BEGIN                                                                                              
    PERFORM pgmq.create('call_queue');                                                             
EXCEPTION WHEN OTHERS THEN                                                                         
    RAISE NOTICE 'call_queue already exists';                                                      
END $$;                                                                                            
                                                                                                    
DO $$                                                                                              
BEGIN                                                                                              
    PERFORM pgmq.create('extraction_queue');                                                       
EXCEPTION WHEN OTHERS THEN                                                                         
    RAISE NOTICE 'extraction_queue already exists';                                                
END $$;                                                                                            
                                                                                                    
DO $$                                                                                              
BEGIN                                                                                              
    PERFORM pgmq.create('notification_queue');                                                     
EXCEPTION WHEN OTHERS THEN                                                                         
    RAISE NOTICE 'notification_queue already exists';                                              
END $$;                                                                                            
                                                                                                    
-- RPC wrapper functions                                                                           
CREATE OR REPLACE FUNCTION pgmq_send(queue_name text, message jsonb)                               
RETURNS bigint AS $$                                                                               
    SELECT pgmq.send(queue_name, message);                                                         
$$ LANGUAGE sql SECURITY DEFINER;                                                                  
                                                                                                    
-- FIX: RETURNS not RETURN                                                                         
CREATE OR REPLACE FUNCTION pgmq_send_delay(queue_name text, message jsonb, delay_seconds int)      
RETURNS bigint AS $$                                                                               
    SELECT pgmq.send(queue_name, message, delay_seconds);                                          
$$ LANGUAGE sql SECURITY DEFINER;                                                                  
                                                                                                    
CREATE OR REPLACE FUNCTION pgmq_read(queue_name text, vt int, qty int)                             
RETURNS TABLE (                                                                                    
    msg_id bigint,                                                                                 
    read_ct int,                                                                                   
    enqueued_at timestamptz,                                                                       
    vt timestamptz,                                                                                
    message jsonb                                                                                  
) AS $$                                                                                            
    SELECT msg_id, read_ct, enqueued_at, vt, message                                               
    FROM pgmq.read(queue_name, vt, qty);                                                           
$$ LANGUAGE sql SECURITY DEFINER;                                                                  
                                                                                                    
-- FIX: pgmq not pqmq                                                                              
CREATE OR REPLACE FUNCTION pgmq_delete(queue_name text, msg_id bigint)                             
RETURNS boolean AS $$                                                                              
    SELECT pgmq.delete(queue_name, msg_id);                                                        
$$ LANGUAGE sql SECURITY DEFINER;                                                                  
                                                                                                    
CREATE OR REPLACE FUNCTION pgmq_archive(queue_name text, msg_id bigint)                            
RETURNS boolean AS $$                                                                              
    SELECT pgmq.archive(queue_name, msg_id);                                                       
$$ LANGUAGE sql SECURITY DEFINER;