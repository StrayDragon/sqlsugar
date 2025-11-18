{% if user_has_access %}
  {% if user.is_active %}
    SELECT * FROM premium_features
    WHERE user_id = {{ user.id }}
      AND created_at >= {{ access_start_date }}
      AND ({{ is_trial_user }} OR subscription_end_date > '{{ current_date }}')
  {% endif %}
{% endif %}