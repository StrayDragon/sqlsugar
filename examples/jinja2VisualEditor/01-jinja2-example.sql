SELECT * FROM users
WHERE name = '{{ user_name }}'
  AND age > {{ user_age }}
  AND is_active = {{ is_active }}
  {% if show_created %}AND created_at > '{{ start_date }}'{% endif %}
ORDER BY created_at DESC
LIMIT {{ limit_value }};