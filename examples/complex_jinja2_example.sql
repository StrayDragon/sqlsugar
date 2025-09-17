SELECT
    cs_.cs_wechat_id AS cs_wechat_info_id
    , cs_.internal_user_id
    , c_.external_userid
FROM (
    SELECT
        iui.user_id AS internal_user_id
        , cwi.id AS cs_wechat_id
    FROM xxxxx AS iui
    LEFT JOIN xxx AS iu
        ON
            iui.user_id = iu.id
            AND iu.is_forbidden = 0
    INNER JOIN xxxx AS cwi
        ON
            iui.user_id = cwi.cs_id
            AND cwi.is_del = 0
    LEFT JOIN xxx AS cgri
        ON
            cwi.id = cgri.relation_id
            AND cgri.is_del = 0
    LEFT JOIN cs_group AS cg ON cgri.group_id = cg.id
    LEFT JOIN cs_group AS cg2 ON cg.parent_id = cg2.id
    INNER JOIN xxxxx AS cspi
        ON
            iui.user_id = cspi.internal_user_id
            AND cspi.product_line_id = 1
            AND cspi.is_del = 0
    WHERE
        1=1
        AND iui.department_id = 3
        AND iui.enterprise_wechat IS NOT NULL
        AND iui.enterprise_wechat != ''
        AND cg2.country_id = 28
        {% if filter_cs_wechat_info_ids %}
        AND cwi.id IN {{ filter_cs_wechat_info_ids }}
        {% endif %}
) AS cs_
LEFT JOIN (
    SELECT
        u.cs_wechat_id
        , uc.user_wechat AS external_userid
    FROM user_crm AS uc
    LEFT JOIN `xxxx` AS u ON uc.user_id = u.id
    INNER JOIN xxxxxx AS isd
        ON
            uc.institution_standard_data_id = isd.id
            AND isd.status = 0
            AND isd.is_del = 0
            {% if filter_institution_standard_data_ids %}
            AND isd.id IN {{ filter_institution_standard_data_ids }}
            {% endif %}
    WHERE
        1=1
        AND (
            1=1
            {% if consumer_register_begin_time %}
            AND {{ consumer_register_begin_time }} <= uc.create_datetime
            {% endif %}
            {% if consumer_register_end_time %}
            AND uc.create_datetime <= {{ consumer_register_end_time }}
            {% endif %}
            AND uc.user_wechat IS NOT NULL
            AND uc.user_wechat != ''
        )
    GROUP BY 1, 2
) AS c_ ON cs_.cs_wechat_id = c_.cs_wechat_id
WHERE c_.external_userid IS NOT NULL
ORDER BY 1, 2
LIMIT {{ limit }} OFFSET {{ offset }}