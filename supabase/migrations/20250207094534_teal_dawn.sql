/*
  # Carbon Trading Platform Schema

  1. New Tables
    - `users`
      - Extended user profile data beyond auth.users
      - Stores KYC status and user preferences
    - `credit_types`
      - Represents different types of carbon credits
      - Stores project details and verification status
    - `trades`
      - Records all carbon credit trades
      - Tracks price, amount, and participants
    - `orders`
      - Active buy/sell orders in the marketplace
      - Includes price, amount, and order type
    - `portfolios`
      - User's carbon credit holdings
      - Tracks balance per credit type

  2. Security
    - Enable RLS on all tables
    - Policies for user data access
    - Policies for trade visibility
    - Policies for order management
*/

-- Users table for extended profile data
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  company_name text,
  kyc_status text DEFAULT 'pending',
  kyc_verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Credit types table
CREATE TABLE IF NOT EXISTS credit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text,
  verification_standard text,
  total_credits numeric NOT NULL DEFAULT 0,
  available_credits numeric NOT NULL DEFAULT 0,
  price_per_credit numeric NOT NULL,
  contract_credit_type_id text NOT NULL,
  metadata jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_type_id uuid REFERENCES credit_types(id),
  buyer_id uuid REFERENCES users(id),
  seller_id uuid REFERENCES users(id),
  amount numeric NOT NULL,
  price_per_credit numeric NOT NULL,
  total_price numeric NOT NULL,
  transaction_hash text,
  status text DEFAULT 'pending',
  executed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_type_id uuid REFERENCES credit_types(id),
  user_id uuid REFERENCES users(id),
  order_type text NOT NULL CHECK (order_type IN ('buy', 'sell')),
  amount numeric NOT NULL,
  price_per_credit numeric NOT NULL,
  filled_amount numeric DEFAULT 0,
  status text DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  credit_type_id uuid REFERENCES credit_types(id),
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, credit_type_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Credit types policies
CREATE POLICY "Anyone can view active credit types"
  ON credit_types FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Trades policies
CREATE POLICY "Users can view trades they're involved in"
  ON trades FOR SELECT
  TO authenticated
  USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id
  );

-- Orders policies
CREATE POLICY "Users can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (status = 'open');

CREATE POLICY "Users can manage their own orders"
  ON orders FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Portfolios policies
CREATE POLICY "Users can view their own portfolio"
  ON portfolios FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create functions for order matching
CREATE OR REPLACE FUNCTION match_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- Match buy orders with sell orders
  WITH matched_orders AS (
    SELECT 
      o1.id AS buy_order_id,
      o2.id AS sell_order_id,
      LEAST(o1.amount - o1.filled_amount, o2.amount - o2.filled_amount) AS match_amount,
      o2.price_per_credit
    FROM orders o1
    JOIN orders o2 ON o1.credit_type_id = o2.credit_type_id
    WHERE o1.id = NEW.id
    AND o1.order_type = 'buy'
    AND o2.order_type = 'sell'
    AND o1.price_per_credit >= o2.price_per_credit
    AND o1.status = 'open'
    AND o2.status = 'open'
    ORDER BY o2.price_per_credit ASC, o2.created_at ASC
    LIMIT 1
  )
  INSERT INTO trades (
    credit_type_id,
    buyer_id,
    seller_id,
    amount,
    price_per_credit,
    total_price,
    status
  )
  SELECT 
    NEW.credit_type_id,
    CASE WHEN NEW.order_type = 'buy' THEN NEW.user_id ELSE o.user_id END,
    CASE WHEN NEW.order_type = 'sell' THEN NEW.user_id ELSE o.user_id END,
    mo.match_amount,
    mo.price_per_credit,
    mo.match_amount * mo.price_per_credit,
    'pending'
  FROM matched_orders mo
  JOIN orders o ON o.id = 
    CASE WHEN NEW.order_type = 'buy' THEN mo.sell_order_id
    ELSE mo.buy_order_id END
  WHERE mo.match_amount > 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_matching_trigger
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'open')
EXECUTE FUNCTION match_orders();