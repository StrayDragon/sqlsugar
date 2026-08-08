SELECT * FROM users
WHERE name = '示例名称'
  AND age > 25
  AND is_active = true
  AND created_at > ''2026-08-08''
ORDER BY created_at DESC
LIMIT demo_limit_value;
