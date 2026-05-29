// Supabase data layer for the lead bot: leads (form submissions) + conversations
// (per-chat AI dialog state). Returns null/no-ops gracefully if env is not set,
// so the rest of the app keeps working without a configured DB.

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_client) {
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

export type LeadRecord = {
  token: string;
  name?: string;
  phone?: string;
  business?: string;
  niche?: string;
  service?: string;
  message?: string;
  referrer?: string;
};

export async function saveLead(rec: LeadRecord): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('inbound_leads').insert(rec);
  if (error) {
    console.error('[supabase] saveLead', error.message);
    return false;
  }
  return true;
}

export async function getLeadByToken(token: string): Promise<LeadRecord | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('inbound_leads')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error) {
    console.error('[supabase] getLeadByToken', error.message);
    return null;
  }
  return (data as LeadRecord) ?? null;
}

export type Brief = {
  niche?: string;
  problem?: string;
  current_channels?: string[];
  authority?: string;
  timeline?: string;
  budget_signal?: string;
};

// ConvMessage stores raw Anthropic message objects (role + content blocks/string).
export type ConvMessage = { role: 'user' | 'assistant'; content: unknown };

export type Conversation = {
  chat_id: number;
  lead_token: string | null;
  messages: ConvMessage[];
  brief: Brief;
  done: boolean;
};

export async function getConversation(chatId: number): Promise<Conversation | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('conversations')
    .select('*')
    .eq('chat_id', chatId)
    .maybeSingle();
  if (error) {
    console.error('[supabase] getConversation', error.message);
    return null;
  }
  if (!data) return null;
  return {
    chat_id: chatId,
    lead_token: (data.lead_token as string) ?? null,
    messages: (data.messages as ConvMessage[]) ?? [],
    brief: (data.brief as Brief) ?? {},
    done: !!data.done,
  };
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('conversations').upsert({
    chat_id: conv.chat_id,
    lead_token: conv.lead_token,
    messages: conv.messages,
    brief: conv.brief,
    done: conv.done,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('[supabase] saveConversation', error.message);
}
