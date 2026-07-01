
DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user
();



-- Trigger
-- This auto-creates a profile the moment a new Discord user authenticates:

CREATE OR REPLACE FUNCTION public.handle_new_user
()                                                                                                         
  RETURNS trigger AS $$                                                                                                                                         
BEGIN
    INSERT INTO public.profiles
        (id, name, discord_id, avatar_url, discord_username)
    VALUES
        (
            NEW.id,
            COALESCE(                                                                                                                                                 
        NEW.raw_user_meta_data->>'preferred_username',                                                                                                        
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',                                                                                                                        
        'user_' || substring(NEW.id::text, 1, 8)
      ),
            NEW.raw_user_meta_data->>'provider_id',
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
            COALESCE(NEW.raw_user_meta_data->>'preferred_username', NEW.raw_user_meta_data->>'name')                                                                  
    )
    ON CONFLICT
    (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;
CREATE TRIGGER on_auth_user_created                                                                                                                         
    AFTER
INSERT ON
auth.users
FOR EACH ROW
EXECUTE
FUNCTION public.handle_new_user
();