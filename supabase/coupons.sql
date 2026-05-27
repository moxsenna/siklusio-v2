-- Buat tabel coupons
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('nominal', 'percentage')),
    discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Hanya admin yang bisa membaca, menambah, mengubah, dan menghapus (dibypass via Service Role Key di backend)
-- Walaupun backend menggunakan Service Role Key yang mem-bypass RLS, kita definisikan policy public read
-- untuk amannya jika suatu saat diakses dari client.
CREATE POLICY "Public read access for coupons" 
ON coupons FOR SELECT 
USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
