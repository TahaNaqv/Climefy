import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// User Management
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return { ...user, profile };
}

// Credit Types
export async function getCreditTypes() {
  const { data, error } = await supabase
    .from('credit_types')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Orders
export async function createOrder(order: {
  credit_type_id: string;
  order_type: 'buy' | 'sell';
  amount: number;
  price_per_credit: number;
}) {
  const { data, error } = await supabase
    .from('orders')
    .insert([{
      ...order,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      status: 'open'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOrders(creditTypeId?: string) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      credit_types (*),
      users (full_name)
    `)
    .eq('status', 'open');

  if (creditTypeId) {
    query = query.eq('credit_type_id', creditTypeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Trades
export async function getTrades(userId: string) {
  const { data, error } = await supabase
    .from('trades')
    .select(`
      *,
      credit_types (*),
      buyer:buyer_id (full_name),
      seller:seller_id (full_name)
    `)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Portfolio
export async function getPortfolio(userId: string) {
  const { data, error } = await supabase
    .from('portfolios')
    .select(`
      *,
      credit_types (*)
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}