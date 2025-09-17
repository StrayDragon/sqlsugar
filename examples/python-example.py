# Python example with Jinja2 template SQL
query = """
SELECT * FROM orders
WHERE user_id = {{ user.id }}
  AND total > {{ min_amount|float }}
  AND status IN ('{{ status }}')
  {% if include_deleted %}AND is_deleted = FALSE{% endif %}
ORDER BY created_at DESC
LIMIT {{ max_results }}
"""

# Execute query
results = database.execute(query, {
    'user': current_user,
    'min_amount': 100.0,
    'status': 'completed',
    'include_deleted': True,
    'max_results': 50
})