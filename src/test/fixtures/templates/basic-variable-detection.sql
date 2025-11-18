SELECT * FROM users
WHERE id = {{ user_id }}
  AND is_active = {{ is_active }}
  AND email = '{{ email_address }}'
  AND created_at >= '{{ start_date }}'
  AND status IN ({{ status_list }})