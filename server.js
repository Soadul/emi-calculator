const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Simple login endpoint
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    // Simple password gate as requested
    if (password === 'admin123') {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

// API endpoint to add a customer
app.post('/api/customers', (req, res) => {
    const { phone, name, image, fatherName, motherName, address } = req.body;

    if (!phone || !name) {
        return res.status(400).json({ error: 'Phone and Name are required' });
    }

    const stmt = db.prepare(`INSERT INTO Customers (Phone, Name, Image, FatherName, MotherName, Address) VALUES (?, ?, ?, ?, ?, ?)`);
    stmt.run([phone, name, image, fatherName, motherName, address], function (err) {
        if (err) {
            // If phone already exists, that's fine for our logic, we can just update or ignore
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'Customer with this phone number already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ success: true, message: 'Customer added successfully', phone });
    });
    stmt.finalize();
});

// API endpoint to get customer by phone
app.get('/api/customers/:phone', (req, res) => {
    const { phone } = req.params;
    db.get(`SELECT * FROM Customers WHERE Phone = ?`, [phone], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Customer not found' });
        res.json(row);
    });
});

// API endpoint to add a new sale
app.post('/api/sales', (req, res) => {
    const { phone, invoiceId, productName, brand, model, totalPrice, downPayment, tenure, monthlyEMI } = req.body;

    if (!phone || !productName || !totalPrice || typeof downPayment !== 'number' || !tenure || !monthlyEMI) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const stmt = db.prepare(`INSERT INTO Sales (Phone, InvoiceID, ProductName, Brand, Model, TotalPrice, DownPayment, Tenure, MonthlyEMI) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run([phone, invoiceId, productName, brand, model, totalPrice, downPayment, tenure, monthlyEMI], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        const saleId = this.lastID;
        res.status(201).json({ success: true, message: 'Sale added successfully', saleId });
    });
    stmt.finalize();
});

// API endpoint to get all sales and payments for a customer
app.get('/api/history/:phone', (req, res) => {
    const { phone } = req.params;

    db.all(`SELECT * FROM Sales WHERE Phone = ? ORDER BY Date DESC`, [phone], (err, sales) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all(`SELECT * FROM Payments WHERE Phone = ? ORDER BY Date ASC`, [phone], (err, payments) => {
            if (err) return res.status(500).json({ error: err.message });

            // Map payments to their respective sales
            const salesWithPayments = sales.map(sale => {
                const salePayments = payments.filter(p => p.SaleID === sale.SaleID);
                let currentBalance = sale.TotalPrice - sale.DownPayment;

                // Calculate remaining balance from payments
                if (salePayments.length > 0) {
                    currentBalance = salePayments[salePayments.length - 1].RemainingBalance;
                }

                return {
                    ...sale,
                    currentBalance,
                    payments: salePayments
                };
            });

            res.json(salesWithPayments);
        });
    });
});

// API endpoint to make a payment
app.post('/api/payments', (req, res) => {
    const { saleId, phone, amountPaid, currentBalance } = req.body;

    if (!saleId || !phone || !amountPaid || currentBalance === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newBalance = currentBalance - amountPaid;

    const stmt = db.prepare(`INSERT INTO Payments (SaleID, Phone, AmountPaid, RemainingBalance) VALUES (?, ?, ?, ?)`);
    stmt.run([saleId, phone, amountPaid, newBalance], function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // If balance is 0 or less, update sale status
        if (newBalance <= 0) {
            db.run(`UPDATE Sales SET Status = 'Closed' WHERE SaleID = ?`, [saleId]);
        }

        res.status(201).json({ success: true, message: 'Payment recorded', remainingBalance: newBalance });
    });
    stmt.finalize();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Congratulation soad. Server is running on http://13.62.99.175:${PORT}`);
});
