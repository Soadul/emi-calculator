const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const schemaPath = path.resolve(__dirname, 'schema.sql');

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDatabase();
    }
});

// Initialize database from schema.sql
function initializeDatabase() {
    if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute the schema sequentially
        db.exec(schema, (err) => {
            if (err) {
                console.error('Error executing schema:', err.message);
            } else {
                console.log('Database tables initialized properly.');
                // Safely add new columns if they don't exist
                db.run('ALTER TABLE Sales ADD COLUMN InvoiceID TEXT', (err) => {
                    if (!err) console.log('Added InvoiceID column to Sales table.');
                });
                
                db.run('ALTER TABLE Customers ADD COLUMN Image TEXT', (err) => {
                    if (!err) console.log('Added Image column to Customers table.');
                });
            }
        });
    } else {
        console.error('Schema file not found at:', schemaPath);
    }
}

module.exports = db;
