-- Pyformat 参数风格示例 (psycopg2 / %(param)s)
-- Pyformat Parameter Style Example (psycopg2)

-- 基础 Pyformat 参数
SELECT id, name, email
FROM users
WHERE id = %(user_id)s
  AND status = %(status)s
  AND created_at > %(start_date)s;

-- 带 Jinja2 条件的 Pyformat 参数
SELECT * FROM orders
WHERE 1=1
{% if filter_by_user %}
  AND user_id = %(user_id)s
{% endif %}
{% if filter_by_status %}
  AND status = %(order_status)s
{% endif %}
{% if date_range %}
  AND created_at BETWEEN %(start_date)s AND %(end_date)s
{% endif %}
ORDER BY created_at DESC
LIMIT %(limit)s;

-- INSERT 语句
INSERT INTO products (name, category, price, stock)
VALUES (%(product_name)s, %(category_id)s, %(price)s, %(stock_quantity)s);

-- UPDATE 语句
UPDATE users
SET email = %(new_email)s,
    phone = %(phone_number)s,
    updated_at = %(current_timestamp)s
WHERE id = %(user_id)s;

-- 动态表名和列名 (结合 Jinja2)
SELECT {{ columns | join(', ') }}
FROM {{ table_name }}
WHERE 1=1
{% for key, value in filters.items() %}
  {% if value %}
    AND {{ key }} = %(filter_{{ key }})s
  {% endif %}
{% endfor %}
ORDER BY {{ sort_column | default('id') }}
LIMIT %(limit)s;
