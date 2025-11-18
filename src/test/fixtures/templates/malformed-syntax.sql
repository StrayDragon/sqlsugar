SELECT * FROM users
WHERE id = {{ user_id
  AND is_active = {{ is_active }}
  AND email = '{{ email_address
{% if condition
  SELECT * FROM table
{% endif %}