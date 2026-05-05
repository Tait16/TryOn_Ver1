CREATE TABLE accounts (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
username VARCHAR(255) NOT NULL UNIQUE,
email VARCHAR(255) NOT NULL UNIQUE,
password_hash TEXT NOT NULL,
full_name VARCHAR(255),
role VARCHAR(50) NOT NULL DEFAULT 'admin',
created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shops (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name VARCHAR(255) NOT NULL,
domain VARCHAR(255),
status VARCHAR(50) NOT NULL DEFAULT 'active',
plan VARCHAR(50) NOT NULL DEFAULT 'pilot',
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shop_users (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
shop_id UUID NOT NULL REFERENCES shops(id),
email VARCHAR(255) NOT NULL UNIQUE,
password_hash TEXT NOT NULL,
full_name VARCHAR(255),
role VARCHAR(50) NOT NULL DEFAULT 'owner',
created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE api_keys (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
shop_id UUID NOT NULL REFERENCES shops(id),
key_prefix VARCHAR(20) NOT NULL,
key_hash TEXT NOT NULL,
status VARCHAR(50) NOT NULL DEFAULT 'active',
created_at TIMESTAMP DEFAULT NOW(),
last_used_at TIMESTAMP
);

CREATE TABLE products (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
shop_id UUID NOT NULL REFERENCES shops(id),
external_product_id VARCHAR(255), --external_product_id dùng để map với sản phẩm bên website shop
name VARCHAR(255) NOT NULL,
category VARCHAR(100) NOT NULL,
price NUMERIC(12,2),
currency VARCHAR(10) DEFAULT 'VND',
product_url TEXT,
status VARCHAR(50) NOT NULL DEFAULT 'draft',
metadata JSONB,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE product_assets (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
product_id UUID NOT NULL REFERENCES products(id),
original_image_url TEXT NOT NULL,
processed_image_url TEXT,
mask_image_url TEXT,
thumbnail_url TEXT,
status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
error_message TEXT,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tryon_jobs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
shop_id UUID NOT NULL REFERENCES shops(id),
product_id UUID NOT NULL REFERENCES products(id),
user_image_url TEXT,
result_image_url TEXT,
status VARCHAR(50) NOT NULL DEFAULT 'queued',
validation_status VARCHAR(50),
error_code VARCHAR(100),
error_message TEXT,
processing_time_ms INTEGER,
ai_cost_usd NUMERIC(10,4),
is_billable BOOLEAN DEFAULT FALSE,
visitor_id VARCHAR(255),
client_ip_hash TEXT,
user_agent TEXT,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE usage_events (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
shop_id UUID NOT NULL REFERENCES shops(id),
product_id UUID REFERENCES products(id),
tryon_job_id UUID REFERENCES tryon_jobs(id),
event_type VARCHAR(100) NOT NULL,
visitor_id VARCHAR(255),
metadata JSONB,
created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE plans (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
code VARCHAR(50) NOT NULL UNIQUE,
name VARCHAR(100) NOT NULL,
monthly_price NUMERIC(12,2) NOT NULL,
included_tryons INTEGER NOT NULL,
overage_price NUMERIC(12,2),
created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE shop_subscriptions (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
shop_id UUID NOT NULL REFERENCES shops(id),
plan_id UUID NOT NULL REFERENCES plans(id),
status VARCHAR(50) NOT NULL DEFAULT 'active',
current_period_start TIMESTAMP NOT NULL,
current_period_end TIMESTAMP NOT NULL,
created_at TIMESTAMP DEFAULT NOW()
);



CREATE TABLE monthly_usage (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
shop_id UUID NOT NULL REFERENCES shops(id),
year_month VARCHAR(7) NOT NULL,
billable_tryons INTEGER DEFAULT 0,
total_tryon_requests INTEGER DEFAULT 0,
failed_tryons INTEGER DEFAULT 0,
rejected_tryons INTEGER DEFAULT 0,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW(),
UNIQUE(shop_id, year_month)
);


-- =========================
-- 1. shops
-- =========================
INSERT INTO shops (id, name, domain, status, plan)
VALUES
('11111111-1111-1111-1111-111111111111', 'Luna Fashion', 'lunafashion.vn', 'active', 'pilot'),
('22222222-2222-2222-2222-222222222222', 'Mika Store', 'mikastore.vn', 'active', 'starter'),
('33333333-3333-3333-3333-333333333333', 'Hanoi Boutique', 'hanoiboutique.vn', 'active', 'growth'),
('44444444-4444-4444-4444-444444444444', 'Saigon Style', 'saigonstyle.vn', 'active', 'pilot'),
('55555555-5555-5555-5555-555555555555', 'Viet Trend', 'viettrend.vn', 'active', 'pro');


-- =========================
-- 2. shop_users
-- (bcrypt cho mật khẩu: Password123! — dùng cho đăng nhập client /api/v1/client/login)
-- =========================
INSERT INTO shop_users (id, shop_id, email, password_hash, full_name, role)
VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'owner@lunafashion.vn', '$2b$12$oPpX1Gf6kLufGcsQ0g8rYOzybvPP4MFlM3EAfzszKm8XLzfi/J1Jy', 'Nguyen Lan Anh', 'owner'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '22222222-2222-2222-2222-222222222222', 'owner@mikastore.vn', '$2b$12$oPpX1Gf6kLufGcsQ0g8rYOzybvPP4MFlM3EAfzszKm8XLzfi/J1Jy', 'Tran Minh Khoa', 'owner'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '33333333-3333-3333-3333-333333333333', 'admin@hanoiboutique.vn', '$2b$12$oPpX1Gf6kLufGcsQ0g8rYOzybvPP4MFlM3EAfzszKm8XLzfi/J1Jy', 'Pham Thu Ha', 'admin'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '44444444-4444-4444-4444-444444444444', 'owner@saigonstyle.vn', '$2b$12$oPpX1Gf6kLufGcsQ0g8rYOzybvPP4MFlM3EAfzszKm8XLzfi/J1Jy', 'Le Hoang Nam', 'owner'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '55555555-5555-5555-5555-555555555555', 'owner@viettrend.vn', '$2b$12$oPpX1Gf6kLufGcsQ0g8rYOzybvPP4MFlM3EAfzszKm8XLzfi/J1Jy', 'Do Mai Linh', 'owner');


-- =========================
-- 3. api_keys
-- =========================
INSERT INTO api_keys (id, shop_id, key_prefix, key_hash, status, last_used_at)
VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '11111111-1111-1111-1111-111111111111', 'vto_luna', 'hash_api_key_luna', 'active', NOW() - INTERVAL '1 day'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '22222222-2222-2222-2222-222222222222', 'vto_mika', 'hash_api_key_mika', 'active', NOW() - INTERVAL '2 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', '33333333-3333-3333-3333-333333333333', 'vto_hanoi', 'hash_api_key_hanoi', 'active', NOW() - INTERVAL '3 hours'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', '44444444-4444-4444-4444-444444444444', 'vto_saigon', 'hash_api_key_saigon', 'inactive', NULL),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5', '55555555-5555-5555-5555-555555555555', 'vto_viet', 'hash_api_key_viettrend', 'active', NOW() - INTERVAL '30 minutes');


-- =========================
-- 4. products
-- =========================
INSERT INTO products (
    id, shop_id, external_product_id, name, category, price, currency, product_url, status, metadata
)
VALUES
('cccccccc-cccc-cccc-cccc-ccccccccccc1', '11111111-1111-1111-1111-111111111111', 'LUNA-001', 'Đầm hoa dáng xòe', 'dress', 450000, 'VND', 'https://lunafashion.vn/products/luna-001', 'active', '{"color": "pink", "size": ["S", "M", "L"]}'),
('cccccccc-cccc-cccc-cccc-ccccccccccc2', '22222222-2222-2222-2222-222222222222', 'MIKA-001', 'Áo sơ mi trắng nữ', 'shirt', 320000, 'VND', 'https://mikastore.vn/products/mika-001', 'active', '{"color": "white", "material": "cotton"}'),
('cccccccc-cccc-cccc-cccc-ccccccccccc3', '33333333-3333-3333-3333-333333333333', 'HNBT-001', 'Chân váy midi be', 'skirt', 390000, 'VND', 'https://hanoiboutique.vn/products/hnbt-001', 'draft', '{"color": "beige", "length": "midi"}'),
('cccccccc-cccc-cccc-cccc-ccccccccccc4', '44444444-4444-4444-4444-444444444444', 'SGST-001', 'Áo khoác blazer đen', 'jacket', 790000, 'VND', 'https://saigonstyle.vn/products/sgst-001', 'inactive', '{"color": "black", "style": "office"}'),
('cccccccc-cccc-cccc-cccc-ccccccccccc5', '55555555-5555-5555-5555-555555555555', 'VT-001', 'Quần jeans xanh slimfit', 'pants', 520000, 'VND', 'https://viettrend.vn/products/vt-001', 'active', '{"color": "blue", "fit": "slim"}');


-- =========================
-- 5. product_assets
-- =========================
INSERT INTO product_assets (
    id, product_id, original_image_url, processed_image_url, mask_image_url, thumbnail_url, status, error_message
)
VALUES
('dddddddd-dddd-dddd-dddd-ddddddddddd1', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'https://cdn.example.com/luna-001-original.jpg', 'https://cdn.example.com/luna-001-processed.png', 'https://cdn.example.com/luna-001-mask.png', 'https://cdn.example.com/luna-001-thumb.jpg', 'processed', NULL),
('dddddddd-dddd-dddd-dddd-ddddddddddd2', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'https://cdn.example.com/mika-001-original.jpg', 'https://cdn.example.com/mika-001-processed.png', 'https://cdn.example.com/mika-001-mask.png', 'https://cdn.example.com/mika-001-thumb.jpg', 'processed', NULL),
('dddddddd-dddd-dddd-dddd-ddddddddddd3', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', 'https://cdn.example.com/hnbt-001-original.jpg', NULL, NULL, 'https://cdn.example.com/hnbt-001-thumb.jpg', 'uploaded', NULL),
('dddddddd-dddd-dddd-dddd-ddddddddddd4', 'cccccccc-cccc-cccc-cccc-ccccccccccc4', 'https://cdn.example.com/sgst-001-original.jpg', NULL, NULL, NULL, 'failed', 'Image background is too complex'),
('dddddddd-dddd-dddd-dddd-ddddddddddd5', 'cccccccc-cccc-cccc-cccc-ccccccccccc5', 'https://cdn.example.com/vt-001-original.jpg', 'https://cdn.example.com/vt-001-processed.png', 'https://cdn.example.com/vt-001-mask.png', 'https://cdn.example.com/vt-001-thumb.jpg', 'processed', NULL);


-- =========================
-- 6. tryon_jobs
-- =========================
INSERT INTO tryon_jobs (
    id, shop_id, product_id, user_image_url, result_image_url, status,
    validation_status, error_code, error_message, processing_time_ms,
    ai_cost_usd, is_billable, visitor_id, client_ip_hash, user_agent
)
VALUES
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'https://cdn.example.com/users/user-001.jpg', 'https://cdn.example.com/results/result-001.jpg', 'completed', 'valid', NULL, NULL, 8500, 0.1200, TRUE, 'visitor_001', 'ip_hash_001', 'Mozilla/5.0 Chrome'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'https://cdn.example.com/users/user-002.jpg', 'https://cdn.example.com/results/result-002.jpg', 'completed', 'valid', NULL, NULL, 9200, 0.1300, TRUE, 'visitor_002', 'ip_hash_002', 'Mozilla/5.0 Safari'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', 'https://cdn.example.com/users/user-003.jpg', NULL, 'queued', 'pending', NULL, NULL, NULL, NULL, FALSE, 'visitor_003', 'ip_hash_003', 'Mozilla/5.0 Firefox'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-ccccccccccc4', 'https://cdn.example.com/users/user-004.jpg', NULL, 'failed', 'valid', 'AI_TIMEOUT', 'AI provider timeout', 30000, 0.0000, FALSE, 'visitor_004', 'ip_hash_004', 'Mozilla/5.0 Edge'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5', '55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-ccccccccccc5', 'https://cdn.example.com/users/user-005.jpg', NULL, 'rejected', 'invalid', 'INVALID_POSE', 'User image pose is not supported', 1200, 0.0000, FALSE, 'visitor_005', 'ip_hash_005', 'Mozilla/5.0 Chrome');


-- =========================
-- 7. usage_events
-- =========================
INSERT INTO usage_events (
    id, shop_id, product_id, tryon_job_id, event_type, visitor_id, metadata
)
VALUES
('ffffffff-ffff-ffff-ffff-fffffffffff1', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1', 'tryon_completed', 'visitor_001', '{"source": "widget", "page": "product_detail"}'),
('ffffffff-ffff-ffff-ffff-fffffffffff2', '22222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-ccccccccccc2', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2', 'tryon_completed', 'visitor_002', '{"source": "widget", "page": "product_detail"}'),
('ffffffff-ffff-ffff-ffff-fffffffffff3', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-ccccccccccc3', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3', 'tryon_started', 'visitor_003', '{"source": "widget"}'),
('ffffffff-ffff-ffff-ffff-fffffffffff4', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-ccccccccccc4', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee4', 'tryon_failed', 'visitor_004', '{"source": "widget", "reason": "AI_TIMEOUT"}'),
('ffffffff-ffff-ffff-ffff-fffffffffff5', '55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-ccccccccccc5', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee5', 'tryon_rejected', 'visitor_005', '{"source": "widget", "reason": "INVALID_POSE"}');


-- =========================
-- 8. plans
-- =========================
INSERT INTO plans (
    id, code, name, monthly_price, included_tryons, overage_price
)
VALUES
('99999999-9999-9999-9999-999999999991', 'pilot', 'Pilot', 0, 100, 3000),
('99999999-9999-9999-9999-999999999992', 'starter', 'Starter', 299000, 500, 2500),
('99999999-9999-9999-9999-999999999993', 'growth', 'Growth', 799000, 2000, 2000),
('99999999-9999-9999-9999-999999999994', 'pro', 'Pro', 1999000, 7000, 1500),
('99999999-9999-9999-9999-999999999995', 'enterprise', 'Enterprise', 4999000, 20000, 1000);


-- =========================
-- 9. shop_subscriptions
-- =========================
INSERT INTO shop_subscriptions (
    id, shop_id, plan_id, status, current_period_start, current_period_end
)
VALUES
('12121212-1212-1212-1212-121212121211', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999991', 'active', NOW(), NOW() + INTERVAL '1 month'),
('12121212-1212-1212-1212-121212121212', '22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999992', 'active', NOW(), NOW() + INTERVAL '1 month'),
('12121212-1212-1212-1212-121212121213', '33333333-3333-3333-3333-333333333333', '99999999-9999-9999-9999-999999999993', 'active', NOW(), NOW() + INTERVAL '1 month'),
('12121212-1212-1212-1212-121212121214', '44444444-4444-4444-4444-444444444444', '99999999-9999-9999-9999-999999999991', 'canceled', NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month'),
('12121212-1212-1212-1212-121212121215', '55555555-5555-5555-5555-555555555555', '99999999-9999-9999-9999-999999999994', 'active', NOW(), NOW() + INTERVAL '1 month');


-- =========================
-- 10. monthly_usage
-- =========================
INSERT INTO monthly_usage (
    id, shop_id, year_month, billable_tryons, total_tryon_requests, failed_tryons, rejected_tryons
)
VALUES
('34343434-3434-3434-3434-343434343431', '11111111-1111-1111-1111-111111111111', '2026-05', 80, 100, 10, 10),
('34343434-3434-3434-3434-343434343432', '22222222-2222-2222-2222-222222222222', '2026-05', 230, 260, 20, 10),
('34343434-3434-3434-3434-343434343433', '33333333-3333-3333-3333-333333333333', '2026-05', 950, 1100, 100, 50),
('34343434-3434-3434-3434-343434343434', '44444444-4444-4444-4444-444444444444', '2026-05', 20, 40, 15, 5),
('34343434-3434-3434-3434-343434343435', '55555555-5555-5555-5555-555555555555', '2026-05', 3200, 3500, 200, 100);



select * from tryon_jobs