import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://uqyeevhwhjlfvljrgfym.supabase.co/rest/v1/";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxeWVldmh3aGpsZnZsanJnZnltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4ODA5ODIsImV4cCI6MjA5MzQ1Njk4Mn0.staHFNVBkXNnPDn3cw-tSAs067e305nwWSITxIeIvFE";

export const supabase = createClient(supabaseUrl, supabaseKey);
