-- Chạy trên ĐÚNG database mà API dùng (DATABASE_URL trong services/api/app/.env).
-- Mật khẩu sau khi chạy: Password123!
-- Shop Saigon phải active thì owner@saigonstyle.vn mới đăng nhập được.

UPDATE shop_users
SET password_hash = '$2b$12$oPpX1Gf6kLufGcsQ0g8rYOzybvPP4MFlM3EAfzszKm8XLzfi/J1Jy';

UPDATE shops SET status = 'active' WHERE id = '44444444-4444-4444-4444-444444444444';

-- Kiểm tra: length bcrypt = 60; bắt đầu bằng $2b$
SELECT email, length(password_hash) AS len, left(password_hash, 4) AS prefix
FROM shop_users
ORDER BY email;
