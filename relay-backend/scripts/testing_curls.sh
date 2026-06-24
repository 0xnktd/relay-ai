curl -X POST "https://your-project.supabase.co/auth/v1/token?grant_type=password" -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"email": "EMAIL", "password": "PASSWORD"}'
