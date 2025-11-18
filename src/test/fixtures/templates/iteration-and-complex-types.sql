{% for item_id in user_items %}
  SELECT
    '{{ item_uuid }}' as item_uuid,
    {{ item.price }} as price,
    '{{ item.metadata }}' as metadata,
    {{ item_count }} as quantity
  FROM items
  WHERE id = {{ item_id }}
    AND category = '{{ category_name }}'
    AND tags && ARRAY{{ tag_list }}
{% endfor %}