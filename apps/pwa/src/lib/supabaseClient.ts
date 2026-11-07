import { createClient } from "@supabase/supabase-js";

// trim + remocao de BOM: valores colados na Vercel podem vir com espacos ou caracteres invisiveis
const limpar = (v: unknown) => String(v ?? "").replace(/^﻿/, "").trim();

const supabaseUrl = limpar(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = limpar(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
