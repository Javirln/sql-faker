/**
 * Basic INSERT Statement
 * @type {string}
 */
export const BASIC_INSERT = `INSERT INTO @tableName (@tableColumns) VALUES (@tableValues);`;

/**
 * Bulk INSERT Statement
 * @type {string}
 */
export const BULK_INSERT = `INSERT INTO @tableName (@tableColumns) VALUES @tableValues;`;
/**
 * Truncate table if exists
 * @type {string}
 */
export const TRUNCATE_TABLE = `IF OBJECT_ID(@tableName) IS NOT NULL EXEC ('TRUNCATE TABLE ' + @tableName )`;

/**
 * MERGE UPDATE boilerplate sql statement
 * @type {string}
 */
export const MERGE_UPDATE = `
MERGE INTO @tableName AS Target
USING @tempTable
       AS Source
ON @key
WHEN MATCHED THEN
UPDATE SET @set
WHEN NOT MATCHED BY Target THEN
INSERT @columnNames VALUES @values;
`;

/**
 * Counts the number of rows on a given tableName
 */
export const COUNT_TABLE_ROWS = `SELECT COUNT(*) FROM @tableName`;

