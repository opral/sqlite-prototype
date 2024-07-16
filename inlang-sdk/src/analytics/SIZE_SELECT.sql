SELECT
    'Bundle' AS table_name,
    'id' AS column_name,
    SUM(LENGTH(id)) / 1048576.0 AS column_size_mb
FROM
    Bundle

UNION ALL

SELECT
    'Bundle' AS table_name,
    'alias' AS column_name,
    SUM(LENGTH(alias)) / 1048576.0 AS column_size_mb
FROM
    Bundle

UNION ALL

SELECT
    'Message' AS table_name,
    'id' AS column_name,
    SUM(LENGTH(id)) / 1048576.0 AS column_size_mb
FROM
    Message

UNION ALL

SELECT
    'Message' AS table_name,
    'bundleId' AS column_name,
    SUM(LENGTH(bundleId)) / 1048576.0 AS column_size_mb
FROM
    Message

UNION ALL

SELECT
    'Message' AS table_name,
    'locale' AS column_name,
    SUM(LENGTH(locale)) / 1048576.0 AS column_size_mb
FROM
    Message

UNION ALL

SELECT
    'Message' AS table_name,
    'declarations' AS column_name,
    SUM(LENGTH(declarations)) / 1048576.0 AS column_size_mb
FROM
    Message

UNION ALL

SELECT
    'Message' AS table_name,
    'selectors' AS column_name,
    SUM(LENGTH(selectors)) / 1048576.0 AS column_size_mb
FROM
    Message

UNION ALL

SELECT
    'Variant' AS table_name,
    'id' AS column_name,
    SUM(LENGTH(id)) / 1048576.0 AS column_size_mb
FROM
    Variant

UNION ALL

SELECT
    'Variant' AS table_name,
    'messageId' AS column_name,
    SUM(LENGTH(messageId)) / 1048576.0 AS column_size_mb
FROM
    Variant

UNION ALL

SELECT
    'Variant' AS table_name,
    'match' AS column_name,
    SUM(LENGTH(match)) / 1048576.0 AS column_size_mb
FROM
    Variant

UNION ALL

SELECT
    'Variant' AS table_name,
    'pattern' AS column_name,
    SUM(LENGTH(pattern)) / 1048576.0 AS column_size_mb
FROM
    Variant;
