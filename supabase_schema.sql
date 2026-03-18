-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Create Customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    website TEXT,
    region TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Prospect',
    notes TEXT,
    is_key_customer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Interactions table
CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    attendee TEXT,
    sales_topic TEXT,
    fae_topic TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Meeting Notes table
CREATE TABLE IF NOT EXISTS meeting_notes (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    attendees TEXT,
    agenda TEXT,
    notes TEXT,
    follow_up TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Backlog Orders table
CREATE TABLE IF NOT EXISTS backlog_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer TEXT,
    product TEXT,
    fg_code TEXT,
    order_no TEXT,
    price DECIMAL(15,2),
    qty INTEGER,
    amount DECIMAL(15,2),
    req_date TEXT,
    category TEXT,
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Revenue Data table (for Excel sync)
CREATE TABLE IF NOT EXISTS revenue_data (
    id SERIAL PRIMARY KEY,
    generic TEXT,
    fg_code TEXT,
    cust_name TEXT,
    ship_amt DECIMAL(15,2),
    ship_qty INTEGER,
    shipdate DATE,
    shipdate2 DATE,
    invoice_no TEXT,
    order_no TEXT,
    category_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Backlog Excel Data table (for Excel sync)
CREATE TABLE IF NOT EXISTS backlog_excel_data (
    id SERIAL PRIMARY KEY,
    cust_name TEXT,
    fg_code TEXT,
    generic TEXT,
    order_no TEXT,
    price DECIMAL(15,2),
    qty INTEGER,
    req_date TEXT,
    category_name TEXT,
    remark TEXT,
    amt DECIMAL(15,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Forecast Entries table
CREATE TABLE IF NOT EXISTS forecast_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_id TEXT NOT NULL,
    model TEXT NOT NULL,
    customer TEXT NOT NULL,
    standard TEXT NOT NULL,
    application TEXT NOT NULL,
    location TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (forecast_id, model, customer, standard, application, location)
);

-- 8. Create Forecast Month Values table
CREATE TABLE IF NOT EXISTS forecast_month_values (
    id BIGSERIAL PRIMARY KEY,
    forecast_id TEXT NOT NULL,
    entry_id UUID NOT NULL REFERENCES forecast_entries(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL,
    fcst_qty NUMERIC DEFAULT 0,
    fcst_asp NUMERIC DEFAULT 0,
    fcst_amt NUMERIC DEFAULT 0,
    plan_qty NUMERIC DEFAULT 0,
    plan_asp NUMERIC DEFAULT 0,
    plan_amt NUMERIC DEFAULT 0,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (entry_id, month_key)
);

CREATE INDEX IF NOT EXISTS forecast_entries_forecast_id_idx ON forecast_entries(forecast_id);
CREATE INDEX IF NOT EXISTS forecast_month_values_forecast_id_idx ON forecast_month_values(forecast_id);
CREATE INDEX IF NOT EXISTS forecast_month_values_entry_id_idx ON forecast_month_values(entry_id);

ALTER TABLE forecast_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_month_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forecast_entries_authenticated_read" ON forecast_entries;
CREATE POLICY "forecast_entries_authenticated_read"
ON forecast_entries FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "forecast_entries_authenticated_write" ON forecast_entries;
CREATE POLICY "forecast_entries_authenticated_write"
ON forecast_entries FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "forecast_month_values_authenticated_read" ON forecast_month_values;
CREATE POLICY "forecast_month_values_authenticated_read"
ON forecast_month_values FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "forecast_month_values_authenticated_write" ON forecast_month_values;
CREATE POLICY "forecast_month_values_authenticated_write"
ON forecast_month_values FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE forecast_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE forecast_month_values;

-- 9. Disable RLS for initial migration (You can re-enable later)
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE backlog_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE backlog_excel_data DISABLE ROW LEVEL SECURITY;
