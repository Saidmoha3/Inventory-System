-- ==============================================================================
-- SUPABASE SCHEMA & COMPLETE DATA MIGRATION SCRIPT
-- Inventory & Sales Management System (Garowe Supermarket)
-- Ku shubo koodhkan: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Staff' CHECK (role IN ('Admin', 'Manager', 'Staff')),
    password TEXT NOT NULL,
    address TEXT,
    location_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Locations Table
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    debt_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT 'Uncategorized',
    supplier TEXT,
    unit TEXT DEFAULT 'pcs',
    price NUMERIC DEFAULT 0 CHECK (price >= 0),
    cost_price NUMERIC DEFAULT 0 CHECK (cost_price >= 0),
    min_stock_level INTEGER DEFAULT 0 CHECK (min_stock_level >= 0),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Inventory Table (Stock per Location)
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY, -- format: "product_id_location_id"
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_id, location_id)
);

-- 8. Stock Movements Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('incoming', 'outgoing', 'adjustment')),
    quantity NUMERIC NOT NULL,
    note TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 9. Sales Table
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    total_price NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    amount_paid NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending', 'Cancelled', 'Returned')),
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 10. Purchases Table
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name TEXT,
    location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT,
    supplier_id TEXT,
    supplier_name TEXT,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    cost_price NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    invoice_number TEXT,
    payment_status TEXT DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Pending', 'Credit')),
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 11. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    address TEXT,
    product_name TEXT NOT NULL,
    category TEXT,
    quantity NUMERIC DEFAULT 1 CHECK (quantity > 0),
    total_price NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    order_date TIMESTAMPTZ DEFAULT now()
);

-- 12. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    category TEXT DEFAULT 'General',
    date DATE DEFAULT CURRENT_DATE,
    created_by TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- 13. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'system' CHECK (type IN ('low_stock', 'sale', 'system')),
    read BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) WITH FULL PUBLIC (ANON) ACCESS
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "anon_full_access" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "anon_full_access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', t);
    END LOOP;
END $$;

-- Enable Realtime for live updates (safe idempotent check)
DO $$
DECLARE
    tbl text;
    tables_to_add text[] := ARRAY['products', 'inventory', 'sales', 'purchases', 'customers', 'notifications'];
BEGIN
    FOREACH tbl IN ARRAY tables_to_add LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = tbl AND schemaname = 'public'
        ) THEN
            BEGIN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
            EXCEPTION WHEN duplicate_object THEN
                NULL;
            END;
        END IF;
    END LOOP;
END $$;

-- ==============================================================================
-- MIGRATED DATA INSERTION (Users, Products, Categories, Stock, Sales)
-- ==============================================================================

-- 1. Default Users (admin, manager, staff)
INSERT INTO public.users (username, email, name, role, password)
VALUES
    ('admin', 'admin@garowesupermarket.com', 'Maamulaha Guud', 'Admin', 'admin123'),
    ('manager', 'manager@garowesupermarket.com', 'Maareeyaha Ganacsiga', 'Manager', 'manager123'),
    ('staff', 'staff@garowesupermarket.com', 'Shaqaalaha Iibka', 'Staff', 'staff123')
ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;

-- 2. Categories
INSERT INTO public.categories (name, description)
VALUES
    ('Food', 'Cuntooyinka kala duwan'),
    ('Drinks', 'Cabitaannada iyo Biyaha'),
    ('Clothes', 'Dharka iyo Agabka'),
    ('Medicine', 'Dawooyinka iyo Caafimaadka'),
    ('Electronics', 'Qalabka Korontada iyo Taleefannada')
ON CONFLICT (name) DO NOTHING;

-- 3. Locations
INSERT INTO public.locations (id, name, address)
VALUES
    ('551b03e9-a3bd-4546-9160-dbd5e8d0a516', 'Main Store', 'Suuqa Waaweyn, Garowe'),
    ('2cf967cf-9b97-4997-bd1d-08257e0fb9f7', 'Branch 2', 'Wadada Makka, Garowe')
ON CONFLICT (id) DO NOTHING;

-- 4. Suppliers
INSERT INTO public.suppliers (name, phone, email, address)
VALUES
    ('Towfiiq Company', '0612345678', 'info@towfiiq.com', 'Bakaaraha'),
    ('Golis Telecom', '0901234567', 'sales@golis.so', 'Garowe')
ON CONFLICT DO NOTHING;

-- 5. Customers
INSERT INTO public.customers (id, name, phone, debt_balance)
VALUES
    ('163e4745-82ae-4fa7-8c03-e562d305e14d', 'Cali Nuur', '0615112233', 0),
    ('360d359e-f258-48d5-b6f4-79aac66bb89d', 'Faadumo Jaamac', '0615998877', 50)
ON CONFLICT (id) DO NOTHING;

-- 6. Products
INSERT INTO public.products (id, name, sku, category, supplier, unit, min_stock_level, price, cost_price)
VALUES
    ('86e8aa3e-5c33-446e-8fe9-2665fdffa342', 'Bariis Baasto (25kg)', 'BAR-01', 'Food', 'Towfiiq Company', 'bag', 20, 25, 20),
    ('18147247-b14a-4614-b1d1-3f8d070fec5b', 'Sokor (50kg)', 'SOK-01', 'Food', 'Towfiiq Company', 'bag', 20, 35, 30),
    ('f0741db8-fff7-432e-8e3f-e817178bde21', 'Saliid Macsar (5 Ltr)', 'SAL-05', 'Food', 'Towfiiq Company', 'ltr', 20, 15, 12),
    ('2b373e33-899a-47be-a23e-209cf3b9f375', 'Caano Boore (Nido)', 'CAA-02', 'Drinks', 'Golis Telecom', 'pcs', 20, 18, 14),
    ('92100a15-aa99-4a92-a263-04af2e2fa649', 'Shaambo (Clear)', 'SHA-01', 'Medicine', 'Golis Telecom', 'pcs', 20, 5, 3.5)
ON CONFLICT (sku) DO NOTHING;

-- 7. Inventory Stock
INSERT INTO public.inventory (id, product_id, location_id, quantity)
VALUES
    ('86e8aa3e-5c33-446e-8fe9-2665fdffa342_551b03e9-a3bd-4546-9160-dbd5e8d0a516', '86e8aa3e-5c33-446e-8fe9-2665fdffa342', '551b03e9-a3bd-4546-9160-dbd5e8d0a516', 98),
    ('18147247-b14a-4614-b1d1-3f8d070fec5b_551b03e9-a3bd-4546-9160-dbd5e8d0a516', '18147247-b14a-4614-b1d1-3f8d070fec5b', '551b03e9-a3bd-4546-9160-dbd5e8d0a516', 50),
    ('f0741db8-fff7-432e-8e3f-e817178bde21_551b03e9-a3bd-4546-9160-dbd5e8d0a516', 'f0741db8-fff7-432e-8e3f-e817178bde21', '551b03e9-a3bd-4546-9160-dbd5e8d0a516', 199),
    ('2b373e33-899a-47be-a23e-209cf3b9f375_551b03e9-a3bd-4546-9160-dbd5e8d0a516', '2b373e33-899a-47be-a23e-209cf3b9f375', '551b03e9-a3bd-4546-9160-dbd5e8d0a516', 120),
    ('92100a15-aa99-4a92-a263-04af2e2fa649_551b03e9-a3bd-4546-9160-dbd5e8d0a516', '92100a15-aa99-4a92-a263-04af2e2fa649', '551b03e9-a3bd-4546-9160-dbd5e8d0a516', 60)
ON CONFLICT (id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- 8. Sales Records
INSERT INTO public.sales (id, product_id, location_id, customer_id, customer_name, quantity, total_price, payment_method, amount_paid, status)
VALUES
    ('5c1b64dc-08bd-461b-b29e-2bd6cb6b0fb6', '86e8aa3e-5c33-446e-8fe9-2665fdffa342', '551b03e9-a3bd-4546-9160-dbd5e8d0a516', '163e4745-82ae-4fa7-8c03-e562d305e14d', 'Cali Nuur', 2, 50, 'Zaad', 50, 'Completed'),
    ('e35aa97a-f427-486f-8f58-3d17c68b31ff', 'f0741db8-fff7-432e-8e3f-e817178bde21', '551b03e9-a3bd-4546-9160-dbd5e8d0a516', '360d359e-f258-48d5-b6f4-79aac66bb89d', 'Faadumo Jaamac', 1, 15, 'Credit', 0, 'Completed')
ON CONFLICT (id) DO NOTHING;
