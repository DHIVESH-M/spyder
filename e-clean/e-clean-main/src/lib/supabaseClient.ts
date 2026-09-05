import { createClient } from '@supabase/supabase-js';
import type { ScanRecord } from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

export async function listScans(): Promise<ScanRecord[]> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ScanRecord[];
}

export async function getScan(id: string): Promise<ScanRecord | null> {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as ScanRecord | null;
}

export async function saveScan(record: Omit<ScanRecord, 'id' | 'created_at'>): Promise<ScanRecord | null> {
  const { data, error } = await supabase
    .from('scans')
    .insert(record)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as ScanRecord | null;
}

export async function deleteScan(id: string): Promise<void> {
  const { error } = await supabase.from('scans').delete().eq('id', id);
  if (error) throw error;
}
