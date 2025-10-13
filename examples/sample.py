"""
Sample Python file with Jinja2 templates for testing SQLSugar V2 Editor
"""

import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker

# Sample Jinja2 templates for testing V2 editor
TEMPLATES = {
    "simple_query": """
        SELECT * FROM users
        WHERE id = {{ user_id }}
        AND status = '{{ status }}'
    """,

    "complex_query": """
        SELECT u.id, u.name, u.email,
               COUNT(o.id) as order_count,
               SUM(o.total) as total_spent
        FROM users u
        LEFT JOIN orders o ON u.id = o.user_id
        WHERE
            u.status = '{{ user_status }}'
            AND u.created_at >= '{{ start_date }}'
            AND (u.email LIKE '{{ email_pattern }}%' OR u.name LIKE '{{ name_pattern }}%')
            {% if include_inactive %}
            AND u.is_active = false
            {% endif %}
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(o.id) >= {{ min_orders }}
        ORDER BY total_spent {{ sort_direction }}
        LIMIT {{ result_limit }}
    """,

    "template_with_variables": """
        -- Template with various variable types
        SELECT
            '{{ string_var }}' as text_value,
            {{ number_var }} as number_value,
            {{ boolean_var }} as boolean_value,
            '{{ date_var }}' as date_value,
            '{{ uuid_var }}' as uuid_value,
            '{{ email_var }}' as email_value,
            '{{ url_var }}' as url_value
        FROM test_table
        WHERE
            id IN ({{ id_list | join(',') }})
            AND created_by = {{ user_id }}
            AND status IN ({{ status_list | join("','") }})
            AND created_at BETWEEN '{{ start_date }}' AND '{{ end_date }}'
    """
}

# Test V2 editor configuration
def test_v2_editor():
    """Test function for V2 editor configuration"""
    # Enable V2 editor in VSCode settings
    config = {
        "sqlsugar.enableV2Editor": True,
        "sqlsugar.v2Editor.popoverPlacement": "auto",
        "sqlsugar.v2Editor.highlightStyle": "background",
        "sqlsugar.v2Editor.autoPreview": True,
        "sqlsugar.v2Editor.keyboardNavigation": True,
        "sqlsugar.v2Editor.animationsEnabled": True,
        "sqlsugar.v2Editor.showSuggestions": True,
        "sqlsugar.v2Editor.autoFocusFirst": False
    }

    # Test templates
    return TEMPLATES

if __name__ == "__main__":
    test_v2_editor()
    print("V2 Editor configuration ready for testing!")