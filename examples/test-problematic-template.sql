-- Test the problematic Jinja2 template that was causing the error
SELECT * FROM orders
WHERE user_id = {{ user.id }}
  AND total > {{ min_amount|float }}
  AND status IN ('{{ status }}')
  {% if include_deleted %}AND is_deleted = FALSE{% endif %}
ORDER BY created_at DESC
LIMIT {{ max_results }}