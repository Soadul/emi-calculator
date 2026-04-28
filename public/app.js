const API_URL = 'https://13.62.99.175:3000/api';

// --- Utility Functions ---

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    const icon = toast.querySelector('i');

    msgEl.textContent = message;

    if (isError) {
        toast.classList.replace('bg-emerald-500', 'bg-red-500');
        icon.classList.replace('fa-circle-check', 'fa-circle-exclamation');
    } else {
        toast.classList.replace('bg-red-500', 'bg-emerald-500');
        icon.classList.replace('fa-circle-exclamation', 'fa-circle-check');
    }

    toast.classList.remove('translate-x-full');

    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 3000);
}

function formatMoney(amount) {
    return Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// --- Navigation & Login ---

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            // Default tab
            switchTab('search-tab');
        } else {
            document.getElementById('login-error').classList.remove('hidden');
        }
    } catch (err) {
        console.error('Login error:', err);
        alert('Cannot connect to the server. Is it running?');
    }
});

function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    // Show selected tab
    document.getElementById(tabId).classList.remove('hidden');

    // Update nav styling
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.replace('bg-indigo-800', 'hover:bg-indigo-800');
        btn.classList.replace('text-white', 'text-indigo-200');
    });

    const activeBtn = document.getElementById(`nav-${tabId}`);
    activeBtn.classList.replace('hover:bg-indigo-800', 'bg-indigo-800');
    activeBtn.classList.replace('text-indigo-200', 'text-white');
}

// --- Add Customer ---

document.getElementById('add-customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        name: document.getElementById('cust-name').value,
        phone: document.getElementById('cust-phone').value,
        fatherName: document.getElementById('cust-father').value,
        motherName: document.getElementById('cust-mother').value,
        address: document.getElementById('cust-address').value
    };

    try {
        const res = await fetch(`${API_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            showToast('Customer added successfully');
            document.getElementById('add-customer-form').reset();
        } else {
            showToast(data.error || 'Failed to add customer', true);
        }
    } catch (err) {
        showToast('Server error', true);
    }
});

// --- New Sale ---

// 1. Verify Customer
document.getElementById('btn-verify-customer').addEventListener('click', async () => {
    const phone = document.getElementById('sale-phone').value;
    const statusEl = document.getElementById('sale-customer-status');
    const submitBtn = document.getElementById('btn-submit-sale');

    if (!phone) {
        statusEl.textContent = 'Please enter a phone number.';
        statusEl.className = 'mt-2 text-sm text-red-500';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/customers/${phone}`);
        if (res.ok) {
            const customer = await res.json();
            statusEl.textContent = `✓ Customer Found: ${customer.Name}`;
            statusEl.className = 'mt-2 text-sm text-emerald-600 font-medium';
            submitBtn.disabled = false;
        } else {
            statusEl.textContent = '✗ Customer not found. Please add them first.';
            statusEl.className = 'mt-2 text-sm text-red-500';
            submitBtn.disabled = true;
        }
    } catch (err) {
        statusEl.textContent = 'Server error during lookup.';
    }
});

// 2. EMI Calculation logic
function calculateEMI() {
    const price = parseFloat(document.getElementById('sale-price').value) || 0;
    const dp = parseFloat(document.getElementById('sale-downpayment').value) || 0;
    const tenure = parseInt(document.getElementById('sale-tenure').value) || 1;

    const emi = (price - dp) / tenure;
    document.getElementById('sale-calc-emi').textContent = formatMoney(emi);
    return emi;
}

document.getElementById('sale-price').addEventListener('input', calculateEMI);
document.getElementById('sale-downpayment').addEventListener('input', calculateEMI);
document.getElementById('sale-tenure').addEventListener('input', calculateEMI);

// 3. Submit Sale
document.getElementById('new-sale-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const emi = calculateEMI();

    const payload = {
        phone: document.getElementById('sale-phone').value,
        productName: document.getElementById('sale-product').value,
        brand: document.getElementById('sale-brand').value,
        model: document.getElementById('sale-model').value,
        totalPrice: parseFloat(document.getElementById('sale-price').value),
        downPayment: parseFloat(document.getElementById('sale-downpayment').value),
        tenure: parseInt(document.getElementById('sale-tenure').value),
        monthlyEMI: emi
    };

    try {
        const res = await fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            showToast('Sale recorded successfully!');
            document.getElementById('new-sale-form').reset();
            document.getElementById('sale-calc-emi').textContent = '0.00';
            document.getElementById('sale-customer-status').textContent = '';
            document.getElementById('btn-submit-sale').disabled = true;
        } else {
            showToast(data.error || 'Failed to record sale', true);
        }
    } catch (err) {
        showToast('Server error', true);
    }
});

// --- Search & Payments ---

document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('search-phone').value;

    try {
        // 1. Get Customer details
        const custRes = await fetch(`${API_URL}/customers/${phone}`);
        if (!custRes.ok) {
            showToast('Customer not found', true);
            document.getElementById('customer-info-card').classList.add('hidden');
            document.getElementById('sales-history-container').classList.add('hidden');
            return;
        }

        const customer = await custRes.json();
        document.getElementById('disp-cust-name').textContent = customer.Name;
        document.getElementById('disp-cust-phone').textContent = customer.Phone;
        document.getElementById('disp-cust-address').textContent = customer.Address || 'N/A';
        document.getElementById('disp-cust-father').textContent = customer.FatherName || 'N/A';
        document.getElementById('disp-cust-mother').textContent = customer.MotherName || 'N/A';
        document.getElementById('customer-info-card').classList.remove('hidden');

        // 2. Get History
        const histRes = await fetch(`${API_URL}/history/${phone}`);
        const sales = await histRes.json();

        renderSalesHistory(sales);

    } catch (err) {
        showToast('Server error during search', true);
    }
});

function renderSalesHistory(sales) {
    const container = document.getElementById('sales-history-container');
    container.innerHTML = '';
    container.classList.remove('hidden');

    if (sales.length === 0) {
        container.innerHTML = `<div class="bg-yellow-50 p-6 rounded-xl border border-yellow-200 text-yellow-800 text-center">No sales history found for this customer.</div>`;
        return;
    }

    sales.forEach(sale => {
        const isClosed = sale.Status === 'Closed';
        const statusBadge = isClosed
            ? `<span class="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">CLOSED</span>`
            : `<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">ACTIVE</span>`;

        // Render Payment Rows
        let paymentRows = '';
        if (sale.payments && sale.payments.length > 0) {
            paymentRows = sale.payments.map((p, index) => `
                <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td class="py-3 px-4 text-sm text-slate-500">${index + 1}</td>
                    <td class="py-3 px-4 text-sm text-slate-800">${formatDate(p.Date)}</td>
                    <td class="py-3 px-4 text-sm font-medium text-emerald-600">৳ ${formatMoney(p.AmountPaid)}</td>
                    <td class="py-3 px-4 text-sm text-slate-500 text-right">৳ ${formatMoney(p.RemainingBalance)}</td>
                </tr>
            `).join('');
        } else {
            paymentRows = `<tr><td colspan="4" class="py-4 text-center text-sm text-slate-400">No payments made yet.</td></tr>`;
        }

        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden';
        card.innerHTML = `
            <div class="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h3 class="font-bold text-lg text-slate-800">${sale.ProductName} ${sale.Brand ? `(${sale.Brand})` : ''}</h3>
                    <p class="text-xs text-slate-500">Purchased on ${formatDate(sale.Date)}</p>
                </div>
                <div>${statusBadge}</div>
            </div>
            
            <div class="p-6">
                <!-- Summary Metrics -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-slate-50 p-3 rounded-lg">
                        <p class="text-xs text-slate-500 mb-1">Total Price</p>
                        <p class="font-semibold text-slate-800">৳ ${formatMoney(sale.TotalPrice)}</p>
                    </div>
                    <div class="bg-slate-50 p-3 rounded-lg">
                        <p class="text-xs text-slate-500 mb-1">Down Payment</p>
                        <p class="font-semibold text-slate-800">৳ ${formatMoney(sale.DownPayment)}</p>
                    </div>
                    <div class="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                        <p class="text-xs text-indigo-600 mb-1">Monthly EMI</p>
                        <p class="font-bold text-indigo-700">৳ ${formatMoney(sale.MonthlyEMI)}</p>
                    </div>
                    <div class="${isClosed ? 'bg-slate-50' : 'bg-red-50 border border-red-100'} p-3 rounded-lg">
                        <p class="text-xs ${isClosed ? 'text-slate-500' : 'text-red-500'} mb-1">Remaining Balance</p>
                        <p class="font-bold ${isClosed ? 'text-slate-700' : 'text-red-600'} text-lg">৳ ${formatMoney(sale.currentBalance)}</p>
                    </div>
                </div>

                <!-- Payment Action -->
                ${!isClosed ? `
                <div class="flex justify-end mb-6">
                    <button onclick="openPaymentModal(${sale.SaleID}, '${sale.Phone}', ${sale.currentBalance}, ${sale.MonthlyEMI}, '${sale.ProductName}')" 
                            class="bg-emerald-500 text-white px-5 py-2 rounded-lg hover:bg-emerald-600 transition-colors font-medium text-sm flex items-center gap-2">
                        <i class="fa-solid fa-hand-holding-dollar"></i> Record Payment
                    </button>
                </div>
                ` : ''}

                <!-- Payment History Table -->
                <h4 class="text-sm font-bold text-slate-700 mb-3 border-b pb-2">Payment History</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                                <th class="py-2 px-4 font-medium">#</th>
                                <th class="py-2 px-4 font-medium">Date</th>
                                <th class="py-2 px-4 font-medium">Amount Paid</th>
                                <th class="py-2 px-4 font-medium text-right">Remaining Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${paymentRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Payment Modal Logic ---

function openPaymentModal(saleId, phone, currentBalance, emi, productName) {
    document.getElementById('pay-sale-id').value = saleId;
    document.getElementById('pay-phone').value = phone;
    document.getElementById('pay-current-balance').value = currentBalance;

    document.getElementById('pay-product-name').textContent = productName;
    document.getElementById('pay-display-balance').textContent = formatMoney(currentBalance);
    document.getElementById('pay-display-emi').textContent = formatMoney(emi);

    // Auto-fill amount with EMI, but cap at remaining balance
    document.getElementById('pay-amount').value = Math.min(emi, currentBalance).toFixed(0);

    document.getElementById('payment-modal').classList.remove('hidden');
}

function closePaymentModal() {
    document.getElementById('payment-modal').classList.add('hidden');
    document.getElementById('payment-form').reset();
}

document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        saleId: parseInt(document.getElementById('pay-sale-id').value),
        phone: document.getElementById('pay-phone').value,
        amountPaid: parseFloat(document.getElementById('pay-amount').value),
        currentBalance: parseFloat(document.getElementById('pay-current-balance').value)
    };

    if (payload.amountPaid > payload.currentBalance) {
        alert("Amount paid cannot exceed the remaining balance!");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast('Payment recorded successfully!');
            closePaymentModal();
            // Refresh search results to update history
            document.getElementById('search-form').dispatchEvent(new Event('submit'));
        } else {
            showToast('Failed to record payment', true);
        }
    } catch (err) {
        showToast('Server error', true);
    }
});
