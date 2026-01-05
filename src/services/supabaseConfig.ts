const fnBase = import.meta.env.VITE_SUPABASE_FUNCTION_URL?.replace(/\/$/, '') ?? '';

if (!fnBase) {
  console.warn('VITE_SUPABASE_FUNCTION_URL is not set. Edge function calls will fail.');
}

export const SUPABASE_FUNCTION_BASE = fnBase;
export const AUTH_START_URL = `${fnBase}/auth-start`;
export const PHOTOS_TOKEN_URL = `${fnBase}/photos-token`;
