import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hcjhmwrslvxuccnisrps.supabase.co";
const supabaseAnonKey = "sb_publishable_PL4g3W-VWBFb_Qll1zcp7g_MIBG1f7Y";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);