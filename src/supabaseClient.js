import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://stkgjqvvpqujnohmzzys.supabase.co";
const supabaseAnonKey = "sb_publishable_qQKucNi8NJ2O670naqohFQ_IkbhyBQG";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);