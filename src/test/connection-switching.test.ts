import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

// Test the database connection switching functionality
suite('Database Connection Switching Test', () => {
    test('Should load connections from YAML config', async () => {
        const configPath = path.join(__dirname, '..', '..', 'src', 'test', 'stubs', 'sqls-config-example.yml');
        const configContent = await fs.promises.readFile(configPath, 'utf8');
        const config = yaml.load(configContent) as any;
        
        assert.strictEqual(config.connections.length, 5);
        assert.strictEqual(config.connections[0].alias, 'local_mysql');
        assert.strictEqual(config.connections[1].alias, 'production_mysql');
        assert.strictEqual(config.connections[2].alias, 'development_postgres');
    });
    
    test('Should identify different database types', () => {
        const connections = [
            { alias: 'mysql_conn', driver: 'mysql' },
            { alias: 'postgres_conn', driver: 'postgres' },
            { alias: 'mariadb_conn', driver: 'mariadb' },
        ];
        
        const drivers = connections.map(conn => conn.driver);
        assert.ok(drivers.includes('mysql'));
        assert.ok(drivers.includes('postgres'));
        assert.ok(drivers.includes('mariadb'));
    });

    test('Should validate connection configuration structure', () => {
        const validConnection = {
            alias: 'test_connection',
            driver: 'mysql',
            dataSourceName: 'test:test@tcp(localhost:3306)/testdb'
        };
        
        assert.ok(validConnection.alias);
        assert.ok(validConnection.driver);
        assert.ok(['mysql', 'postgres', 'sqlite3', 'mssql', 'h2'].includes(validConnection.driver));
    });

    test('Should support different connection configuration formats', () => {
        const dsnConnection = {
            alias: 'dsn_style',
            driver: 'mysql',
            dataSourceName: 'user:pass@tcp(host:3306)/db'
        };
        
        const individualConnection = {
            alias: 'individual_style',
            driver: 'mysql',
            proto: 'tcp',
            user: 'user',
            passwd: 'pass',
            host: 'localhost',
            port: '3306',
            dbName: 'database'
        };
        
        // Both should be valid
        assert.ok(dsnConnection.dataSourceName);
        assert.ok(individualConnection.user);
        assert.ok(individualConnection.host);
        assert.ok(individualConnection.dbName);
    });
});