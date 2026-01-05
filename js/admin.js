// ============================================
// ADMIN DASHBOARD - ENHANCED VERSION
// ============================================

let adminCharts = {};
let currentAdmin = null;
let allUsers = [];
let allBusinesses = [];
let allCategories = [];
let allLogs = [];

// ============================================
// 1. INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAdminAuth();
    if (!user) return;

    currentAdmin = user;

    // Load all data
    await Promise.all([
        loadDashboardStats(),
        loadUsers(),
        loadBusinesses(),
        loadCategories(),
        loadActivityLogs()
    ]);

    // Initialize charts
    initializeCharts();

    // Setup search/filter listeners
    setupEventListeners();
});

// ============================================
// 2. AUTHENTICATION
// ============================================

async function checkAdminAuth() {
    // Check for hardcoded admin backdoor
    const hardcodedAdmin = localStorage.getItem('hardcoded_admin_session');
    if (hardcodedAdmin) {
        const adminData = JSON.parse(hardcodedAdmin);
        // Verify it's still valid (not tampered)
        if (adminData.email === 'admin@admin.abizzhub.com' && adminData.verified === true) {
            return {
                id: 'hardcoded-admin',
                name: 'Super Admin',
                email: 'admin@admin.abizzhub.com',
                role: 'admin',
                account_type: 'business'
            };
        }
    }

    // Check for regular Supabase authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // Show hardcoded admin login prompt
        showHardcodedAdminLogin();
        return null;
    }

    const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !userData || userData.role !== 'admin') {
        // Show hardcoded admin login prompt as fallback
        showHardcodedAdminLogin();
        return null;
    }

    return userData;
}

// Hardcoded Admin Login Overlay
function showHardcodedAdminLogin() {
    // Create login overlay
    const overlay = document.createElement('div');
    overlay.id = 'hardcoded-admin-overlay';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(10px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Inter, sans-serif;
    `;

    overlay.innerHTML = `
        <div style="background: var(--card-bg); padding: 2rem; border-radius: 1rem; max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
            <h2 style="margin: 0 0 1.5rem 0; color: var(--text-primary); text-align: center;">🔐 Admin Access</h2>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem; font-weight: 600;">Email</label>
                <input type="email" id="hardcoded-email" placeholder="Enter admin email" 
                    style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; background: var(--bg-primary); color: var(--text-primary); font-size: 1rem;">
            </div>
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: var(--text-secondary); font-size: 0.875rem; font-weight: 600;">Password</label>
                <input type="password" id="hardcoded-password" placeholder="Enter admin password"
                    style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.5rem; background: var(--bg-primary); color: var(--text-primary); font-size: 1rem;">
            </div>
            <div id="hardcoded-error" style="display: none; padding: 0.75rem; background: rgba(239, 68, 68, 0.1); color: #EF4444; border-radius: 0.5rem; margin-bottom: 1rem; font-size: 0.875rem;"></div>
            <button id="hardcoded-login-btn" 
                style="width: 100%; padding: 0.75rem; background: linear-gradient(135deg, #F59E0B, #D97706); color: white; border: none; border-radius: 0.5rem; font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.2s;">
                Login as Admin
            </button>
            <div style="margin-top: 1rem; text-align: center;">
                <a href="login.html" style="color: var(--text-tertiary); font-size: 0.875rem; text-decoration: none;">← Back to regular login</a>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Focus email input
    document.getElementById('hardcoded-email').focus();

    // Handle login
    document.getElementById('hardcoded-login-btn').addEventListener('click', handleHardcodedLogin);

    // Handle Enter key
    document.getElementById('hardcoded-email').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('hardcoded-password').focus();
    });
    document.getElementById('hardcoded-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleHardcodedLogin();
    });
}

function handleHardcodedLogin() {
    const email = document.getElementById('hardcoded-email').value.trim();
    const password = document.getElementById('hardcoded-password').value;

    // Hardcoded credentials
    const ADMIN_EMAIL = 'admin@admin.abizzhub.com';
    const ADMIN_PASSWORD = 'abcdefghijklmnopqrstuvwxyz';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Set hardcoded admin session
        localStorage.setItem('hardcoded_admin_session', JSON.stringify({
            email: ADMIN_EMAIL,
            verified: true,
            timestamp: new Date().toISOString()
        }));

        // Remove overlay and reload page
        document.getElementById('hardcoded-admin-overlay').remove();
        window.location.reload();
    } else {
        // Show error
        const errorDiv = document.getElementById('hardcoded-error');
        errorDiv.textContent = '❌ Invalid admin credentials. Access denied.';
        errorDiv.style.display = 'block';

        // Shake animation
        const loginBtn = document.getElementById('hardcoded-login-btn');
        loginBtn.style.animation = 'shake 0.5s';
        setTimeout(() => loginBtn.style.animation = '', 500);
    }
}

// ============================================
// 3. NAVIGATION
// ============================================

window.switchTab = function (tabId) {
    // Update Sidebar
    document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Update Content
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // Refresh data for specific tabs
    if (tabId === 'users') loadUsers();
    if (tabId === 'businesses') loadBusinesses();
    if (tabId === 'categories') loadCategories();
    if (tabId === 'logs') loadActivityLogs();
}

// ============================================
// 4. DASHBOARD & STATISTICS
// ============================================

async function loadDashboardStats() {
    try {
        // Get pending businesses
        const { count: pendingCount } = await supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        document.getElementById('stat-pending').textContent = pendingCount || 0;

        // Get total businesses
        const { count: totalCount } = await supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true });

        document.getElementById('stat-total').textContent = totalCount || 0;

        // Get total categories
        const { count: catCount } = await supabase
            .from('categories')
            .select('*', { count: 'exact', head: true });

        document.getElementById('stat-cats').textContent = catCount || 0;

        // Get total users
        const { count: userCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        document.getElementById('stat-users').textContent = userCount || 0;

        // Calculate growth (last 7 days vs previous 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: recentUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo.toISOString());

        const { count: recentBusinesses } = await supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo.toISOString());

        document.getElementById('stat-users-change').innerHTML =
            `<span>↗</span> <span>+${recentUsers} this week</span>`;
        document.getElementById('stat-total-change').innerHTML =
            `<span>↗</span> <span>+${recentBusinesses} this week</span>`;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function initializeCharts() {
    createStatusChart();
    createCategoryChart();
    createTrendChart();
}

async function createStatusChart() {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    const { data: businesses } = await supabase
        .from('businesses')
        .select('status');

    const statusCounts = {
        pending: 0,
        approved: 0,
        rejected: 0
    };

    businesses?.forEach(b => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    });

    adminCharts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Approved', 'Rejected'],
            datasets: [{
                data: [statusCounts.pending, statusCounts.approved, statusCounts.rejected],
                backgroundColor: ['#F59E0B', '#10B981', '#EF4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

async function createCategoryChart() {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;

    const { data: businesses } = await supabase
        .from('businesses')
        .select('category_id, categories(name)');

    const categoryCounts = {};
    businesses?.forEach(b => {
        const catName = b.categories?.name || 'Uncategorized';
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });

    const sortedCategories = Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    adminCharts.category = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCategories.map(c => c[0]),
            datasets: [{
                label: 'Businesses',
                data: sortedCategories.map(c => c[1]),
                backgroundColor: '#F59E0B',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

async function createTrendChart() {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    // Get data for last 30 days
    const days = 30;
    const labels = [];
    const businessData = [];
    const userData = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        // Count businesses created on this day
        const { count: bizCount } = await supabase
            .from('businesses')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', dateStr)
            .lt('created_at', new Date(date.getTime() + 86400000).toISOString());

        businessData.push(bizCount || 0);

        // Count users created on this day
        const { count: usrCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', dateStr)
            .lt('created_at', new Date(date.getTime() + 86400000).toISOString());

        userData.push(usrCount || 0);
    }

    adminCharts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'New Businesses',
                    data: businessData,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'New Users',
                    data: userData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

// ============================================
// 5. USER MANAGEMENT
// ============================================

async function loadUsers() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading users:', error);
        return;
    }

    allUsers = users || [];
    renderUsers(allUsers);
}

function renderUsers(users) {
    const list = document.getElementById('users-list');
    list.innerHTML = '';

    if (!users || users.length === 0) {
        list.innerHTML = '<tr><td colspan="6" class="empty-state">No users found</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td>${user.account_type}</td>
            <td><span class="status-badge ${user.role === 'admin' ? 'status-approved' : 'status-pending'}">${user.role}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-outline btn-sm" onclick="viewUser('${user.id}')">View</button>
                    ${user.role !== 'admin' ?
                `<button class="btn btn-sm" style="background:var(--primary-500);color:white" onclick="promoteToAdmin('${user.id}')">Make Admin</button>`
                : ''}
                    ${user.id !== currentAdmin?.id ?
                `<button class="btn btn-outline btn-sm" style="color:var(--error)" onclick="deleteUser('${user.id}', '${user.name}')">Delete</button>`
                : ''}
                </div>
            </td>
        `;
        list.appendChild(row);
    });
}

window.viewUser = async function (userId) {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (!user) return;

    // Get user's businesses
    const { data: businesses } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId);

    const content = document.getElementById('user-detail-content');
    content.innerHTML = `
        <div class="mb-md">
            <strong>Name:</strong> ${user.name}
        </div>
        <div class="mb-md">
            <strong>Email:</strong> ${user.email}
        </div>
        <div class="mb-md">
            <strong>Phone:</strong> ${user.phone || 'N/A'}
        </div>
        <div class="mb-md">
            <strong>Account Type:</strong> ${user.account_type}
        </div>
        <div class="mb-md">
            <strong>Role:</strong> <span class="status-badge ${user.role === 'admin' ? 'status-approved' : 'status-pending'}">${user.role}</span>
        </div>
        <div class="mb-md">
            <strong>Joined:</strong> ${new Date(user.created_at).toLocaleString()}
        </div>
        ${businesses && businesses.length > 0 ? `
            <div class="mb-md">
                <strong>Businesses (${businesses.length}):</strong>
                <ul style="margin-top:0.5rem">
                    ${businesses.map(b => `<li>${b.name} - <span class="status-badge status-${b.status}">${b.status}</span></li>`).join('')}
                </ul>
            </div>
        ` : ''}
    `;

    document.getElementById('userModal').classList.add('active');
}

window.promoteToAdmin = async function (userId) {
    if (!confirm('Are you sure you want to promote this user to admin? They will have full access to the admin panel.')) {
        return;
    }

    const { error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId);

    if (error) {
        showToast('Error promoting user: ' + error.message, 'error');
    } else {
        showToast('User promoted to admin successfully', 'success');
        await logAdminAction('promote_to_admin', 'user', userId, { role: 'admin' });
        loadUsers();
    }
}

window.deleteUser = async function (userId, userName) {
    if (!confirm(`⚠️ WARNING: Delete user "${userName}"?\n\nThis will permanently delete:\n- User account\n- All their businesses\n- All their products\n- All their orders\n- All chat messages\n\nThis action CANNOT be undone!`)) {
        return;
    }

    // Double confirmation for safety
    if (!confirm(`Are you ABSOLUTELY SURE you want to delete "${userName}"?\n\nClick OK to permanently delete this user.`)) {
        return;
    }

    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) {
        showToast('Error deleting user: ' + error.message, 'error');
        console.error('Delete user error:', error);
    } else {
        showToast(`User "${userName}" deleted successfully`, 'success');
        await logAdminAction('delete_user', 'user', userId, { name: userName, deleted: true });
        loadUsers();
        loadDashboardStats();
    }
}

window.closeUserModal = function () {
    document.getElementById('userModal').classList.remove('active');
}

// ============================================
// CREATE BUSINESS ACCOUNT (ADMIN ONLY)
// ============================================

window.openCreateBusinessModal = async function () {
    // Load categories for the dropdown
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    const categorySelect = document.getElementById('new-biz-category');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Select category...</option>';
        categories?.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
        });
    }

    // Load users for visibility selector
    const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .order('name');

    const userChecklist = document.getElementById('users-checklist');
    if (userChecklist) {
        userChecklist.innerHTML = '';
        users?.forEach(user => {
            userChecklist.innerHTML += `
                <label style="display: block; padding: 0.5rem; cursor: pointer; hover:background: var(--bg-secondary);">
                    <input type="checkbox" value="${user.id}" class="user-checkbox" style="margin-right: 0.5rem;">
                    ${user.name} (${user.email})
                </label>
            `;
        });
    }

    document.getElementById('createBusinessModal').classList.add('active');
}

window.closeCreateBusinessModal = function () {
    document.getElementById('createBusinessModal').classList.remove('active');
    // Reset form
    document.getElementById('new-biz-email').value = '';
    document.getElementById('new-biz-password').value = '';
    document.getElementById('new-biz-name').value = '';
    document.getElementById('new-biz-category').value = '';
    document.getElementById('new-biz-phone').value = '';
    document.getElementById('new-biz-address').value = '';
    document.getElementById('new-biz-desc').value = '';
    document.getElementById('new-biz-visibility').value = 'everyone';
    toggleUserSelector();
}

window.toggleUserSelector = function () {
    const visibility = document.getElementById('new-biz-visibility').value;
    const container = document.getElementById('user-selector-container');
    if (container) {
        container.style.display = visibility === 'selected' ? 'block' : 'none';
    }
}

window.generatePassword = function () {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('new-biz-password').value = password;
}

window.createBusinessOwnerAccount = async function () {
    const ownerName = document.getElementById('new-biz-owner-name').value.trim();
    const email = document.getElementById('new-biz-email').value.trim();
    const password = document.getElementById('new-biz-password').value;

    // Validation
    if (!ownerName || !email || !password) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        // Create user account with business type
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    name: ownerName
                }
            }
        });

        if (authError) {
            showToast('Error creating account: ' + authError.message, 'error');
            return;
        }

        const userId = authData.user.id;

        // Create user record with business account type
        const { error: userError } = await supabase
            .from('users')
            .insert([{
                id: userId,
                name: ownerName,
                email: email,
                account_type: 'business',
                role: 'user'
            }]);

        if (userError) {
            showToast('Error creating user record: ' + userError.message, 'error');
            return;
        }

        showToast(`Business owner account created!\\n\\nEmail: ${email}\\nPassword: ${password}\\n\\nShare these credentials with the owner. They can now log in and create their business profile.`, 'success');

        // Log the action
        await logAdminAction('create_business_owner_account', 'user', userId, {
            owner_name: ownerName,
            email: email
        });

        closeCreateBusinessModal();
        loadUsers();
        loadDashboardStats();

    } catch (error) {
        console.error('Error creating business owner account:', error);
        showToast('Failed to create account: ' + error.message, 'error');
    }
}

// ============================================
// 6. BUSINESS MANAGEMENT
// ============================================

async function loadBusinesses() {
    // Load Pending
    const { data: pendingBusinesses } = await supabase
        .from('businesses')
        .select(`
            id, name, created_at, owner_id, status, category_id,
            users ( name ),
            categories ( name )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    const pendingList = document.getElementById('pending-list');
    pendingList.innerHTML = '';

    if (pendingBusinesses && pendingBusinesses.length > 0) {
        document.getElementById('no-pending').style.display = 'none';
        pendingBusinesses.forEach(biz => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${biz.name}</strong></td>
                <td>${biz.categories?.name || 'N/A'}</td>
                <td>${biz.users?.name || 'Unknown'}</td>
                <td>${new Date(biz.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm" style="background:var(--success);color:white" onclick="approveBusiness('${biz.id}')">Approve</button>
                        <button class="btn btn-sm" style="background:var(--error);color:white" onclick="rejectBusiness('${biz.id}')">Reject</button>
                        <button class="btn btn-outline btn-sm" onclick="viewBusiness('${biz.id}')">View</button>
                    </div>
                </td>
            `;
            pendingList.appendChild(row);
        });
    } else {
        document.getElementById('no-pending').style.display = 'block';
    }

    // Load All
    const { data: allBiz } = await supabase
        .from('businesses')
        .select('id, name, status, owner_id, users(name), categories(name)')
        .order('created_at', { ascending: false })
        .limit(50);

    allBusinesses = allBiz || [];
    renderAllBusinesses(allBusinesses);
}

function renderAllBusinesses(businesses) {
    const allList = document.getElementById('all-businesses-list');
    allList.innerHTML = '';

    if (!businesses || businesses.length === 0) {
        allList.innerHTML = '<tr><td colspan="5" class="empty-state">No businesses found</td></tr>';
        return;
    }

    businesses.forEach(biz => {
        const row = document.createElement('tr');
        let statusClass = '';
        if (biz.status === 'approved') statusClass = 'status-approved';
        else if (biz.status === 'pending') statusClass = 'status-pending';
        else statusClass = 'status-rejected';

        row.innerHTML = `
            <td><strong>${biz.name}</strong></td>
            <td>${biz.categories?.name || 'N/A'}</td>
            <td>${biz.users?.name || 'Unknown'}</td>
            <td><span class="status-badge ${statusClass}">${biz.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-outline btn-sm" onclick="viewBusiness('${biz.id}')">View</button>
                    <button class="btn btn-outline btn-sm" style="color:var(--error)" onclick="deleteBusiness('${biz.id}')">Delete</button>
                </div>
            </td>
        `;
        allList.appendChild(row);
    });
}

window.viewBusiness = async function (businessId) {
    const { data: business } = await supabase
        .from('businesses')
        .select('*, users(name, email), categories(name)')
        .eq('id', businessId)
        .single();

    if (!business) return;

    // Get products
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId);

    const content = document.getElementById('business-detail-content');
    content.innerHTML = `
        <div class="mb-md">
            <strong>Business Name:</strong> ${business.name}
        </div>
        <div class="mb-md">
            <strong>Category:</strong> ${business.categories?.name || 'N/A'}
        </div>
        <div class="mb-md">
            <strong>Owner:</strong> ${business.users?.name} (${business.users?.email})
        </div>
        <div class="mb-md">
            <strong>Status:</strong> <span class="status-badge status-${business.status}">${business.status}</span>
        </div>
        <div class="mb-md">
            <strong>Phone:</strong> ${business.phone}
        </div>
        <div class="mb-md">
            <strong>Email:</strong> ${business.email || 'N/A'}
        </div>
        <div class="mb-md">
            <strong>Address:</strong> ${business.address}
        </div>
        <div class="mb-md">
            <strong>Website:</strong> ${business.website ? `<a href="${business.website}" target="_blank">${business.website}</a>` : 'N/A'}
        </div>
        <div class="mb-md">
            <strong>Description:</strong><br>${business.description || 'N/A'}
        </div>
        ${products && products.length > 0 ? `
            <div class="mb-md">
                <strong>Products (${products.length}):</strong>
                <ul style="margin-top:0.5rem">
                    ${products.map(p => `<li>${p.name} - ₹${p.price}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
        <div class="mb-md">
            <strong>Created:</strong> ${new Date(business.created_at).toLocaleString()}
        </div>
        <div style="display:flex;gap:0.5rem;margin-top:1rem">
            ${business.status === 'pending' ? `
                <button class="btn btn-sm" style="background:var(--success);color:white" onclick="approveBusiness('${business.id}');closeBusinessModal()">Approve</button>
                <button class="btn btn-sm" style="background:var(--error);color:white" onclick="rejectBusiness('${business.id}');closeBusinessModal()">Reject</button>
            ` : ''}
            <button class="btn btn-outline btn-sm" style="color:var(--error)" onclick="deleteBusiness('${business.id}');closeBusinessModal()">Delete</button>
        </div>
    `;

    document.getElementById('businessModal').classList.add('active');
}

window.closeBusinessModal = function () {
    document.getElementById('businessModal').classList.remove('active');
}

window.approveBusiness = async function (id) {
    if (!confirm('Approve this business?')) return;

    const { error } = await supabase
        .from('businesses')
        .update({ status: 'approved' })
        .eq('id', id);

    if (error) {
        showToast('Error approving: ' + error.message, 'error');
    } else {
        showToast('Business approved', 'success');
        await logAdminAction('approve_business', 'business', id, { status: 'approved' });
        loadBusinesses();
        loadDashboardStats();
    }
}

window.rejectBusiness = async function (id) {
    if (!confirm('Reject this business?')) return;

    const { error } = await supabase
        .from('businesses')
        .update({ status: 'rejected' })
        .eq('id', id);

    if (error) {
        showToast('Error rejecting: ' + error.message, 'error');
    } else {
        showToast('Business rejected', 'success');
        await logAdminAction('reject_business', 'business', id, { status: 'rejected' });
        loadBusinesses();
        loadDashboardStats();
    }
}

window.deleteBusiness = async function (id) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this business? This action cannot be undone.')) return;

    const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', id);

    if (error) {
        showToast('Error deleting: ' + error.message, 'error');
    } else {
        showToast('Business deleted', 'success');
        await logAdminAction('delete_business', 'business', id, { deleted: true });
        loadBusinesses();
        loadDashboardStats();
    }
}

// ============================================
// 7. CATEGORY MANAGEMENT
// ============================================

async function loadCategories() {
    const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });

    allCategories = categories || [];
    const grid = document.getElementById('categories-grid');
    grid.innerHTML = '';

    if (categories && categories.length > 0) {
        for (const cat of categories) {
            // Get business count for this category
            const { count } = await supabase
                .from('businesses')
                .select('*', { count: 'exact', head: true })
                .eq('category_id', cat.id);

            const div = document.createElement('div');
            div.className = 'card text-center';
            div.style.display = 'flex';
            div.style.flexDirection = 'column';
            div.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">${cat.icon}</div>
                <h4>${cat.name}</h4>
                <p style="color:var(--text-tertiary);font-size:0.875rem;margin:0.5rem 0">${cat.description || ''}</p>
                <p style="color:var(--text-secondary);font-size:0.875rem;margin:0.5rem 0">${count || 0} businesses</p>
                <div style="margin-top:auto;display:flex;gap:0.5rem;justify-content:center">
                    <button class="btn btn-outline btn-sm" onclick="editCategory('${cat.id}')">Edit</button>
                    <button class="btn btn-outline btn-sm" style="color:var(--error)" onclick="deleteCategory('${cat.id}')">Delete</button>
                </div>
            `;
            grid.appendChild(div);
        }
    } else {
        grid.innerHTML = '<p class="empty-state">No categories yet</p>';
    }
}

window.openCategoryModal = function () {
    document.getElementById('category-modal-title').textContent = 'Add Category';
    document.getElementById('cat-id').value = '';
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-icon').value = '';
    document.getElementById('cat-desc').value = '';
    document.getElementById('categoryModal').classList.add('active');
}

window.closeCategoryModal = function () {
    document.getElementById('categoryModal').classList.remove('active');
}

window.editCategory = async function (catId) {
    const { data: category } = await supabase
        .from('categories')
        .select('*')
        .eq('id', catId)
        .single();

    if (!category) return;

    document.getElementById('category-modal-title').textContent = 'Edit Category';
    document.getElementById('cat-id').value = category.id;
    document.getElementById('cat-name').value = category.name;
    document.getElementById('cat-icon').value = category.icon;
    document.getElementById('cat-desc').value = category.description || '';
    document.getElementById('categoryModal').classList.add('active');
}

window.saveCategory = async function () {
    const id = document.getElementById('cat-id').value;
    const name = document.getElementById('cat-name').value;
    const icon = document.getElementById('cat-icon').value;
    const desc = document.getElementById('cat-desc').value;

    if (!name || !icon) {
        showToast('Name and Icon are required', 'error');
        return;
    }

    if (id) {
        // Update existing
        const { error } = await supabase
            .from('categories')
            .update({
                name: name,
                icon: icon,
                description: desc
            })
            .eq('id', id);

        if (error) {
            showToast('Error updating category: ' + error.message, 'error');
        } else {
            showToast('Category updated', 'success');
            await logAdminAction('update_category', 'category', id, { name, icon, description: desc });
            closeCategoryModal();
            loadCategories();
            loadDashboardStats();
        }
    } else {
        // Insert new
        const { error } = await supabase
            .from('categories')
            .insert([{
                name: name,
                icon: icon,
                description: desc
            }]);

        if (error) {
            showToast('Error saving category: ' + error.message, 'error');
        } else {
            showToast('Category created', 'success');
            await logAdminAction('create_category', 'category', null, { name, icon, description: desc });
            closeCategoryModal();
            loadCategories();
            loadDashboardStats();
        }
    }
}

window.deleteCategory = async function (id) {
    // Check if any businesses use this category
    const { count } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);

    if (count && count > 0) {
        if (!confirm(`This category has ${count} business(es). Deleting it will set those businesses to uncategorized. Continue?`)) {
            return;
        }
    }

    if (!confirm('Delete this category?')) return;

    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) {
        showToast('Error deleting: ' + error.message, 'error');
    } else {
        showToast('Category deleted', 'success');
        await logAdminAction('delete_category', 'category', id, { deleted: true });
        loadCategories();
        loadDashboardStats();
    }
}

// ============================================
// 8. ACTIVITY LOGS
// ============================================

async function loadActivityLogs() {
    const { data: logs, error } = await supabase
        .from('admin_logs')
        .select('*, users(name)')
        .order('created_at', { ascending: false })
        .limit(100);

    allLogs = logs || [];
    renderLogs(allLogs);
}

function renderLogs(logs) {
    const list = document.getElementById('logs-list');
    list.innerHTML = '';

    if (!logs || logs.length === 0) {
        list.innerHTML = '<tr><td colspan="5" class="empty-state">No activity logs yet</td></tr>';
        return;
    }

    logs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.users?.name || 'Unknown'}</td>
            <td>${formatAction(log.action)}</td>
            <td>${log.entity_type}</td>
            <td>${log.entity_id ? log.entity_id.substring(0, 8) + '...' : 'N/A'}</td>
            <td>${new Date(log.created_at).toLocaleString()}</td>
        `;
        list.appendChild(row);
    });
}

function formatAction(action) {
    return action.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

async function logAdminAction(action, entityType, entityId, details) {
    try {
        await supabase
            .from('admin_logs')
            .insert([{
                admin_id: currentAdmin.id,
                action: action,
                entity_type: entityType,
                entity_id: entityId,
                details: details
            }]);
    } catch (error) {
        console.error('Error logging admin action:', error);
    }
}

// ============================================
// 9. SEARCH & FILTERS
// ============================================

function setupEventListeners() {
    // User search
    document.getElementById('user-search')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u =>
            u.name.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query)
        );
        renderUsers(filtered);
    });

    // User filter
    document.getElementById('user-filter')?.addEventListener('change', (e) => {
        const filter = e.target.value;
        let filtered = allUsers;

        if (filter === 'normal') filtered = allUsers.filter(u => u.account_type === 'normal');
        if (filter === 'business') filtered = allUsers.filter(u => u.account_type === 'business');
        if (filter === 'admin') filtered = allUsers.filter(u => u.role === 'admin');

        renderUsers(filtered);
    });

    // Business search
    document.getElementById('business-search')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allBusinesses.filter(b =>
            b.name.toLowerCase().includes(query)
        );
        renderAllBusinesses(filtered);
    });

    // Log filter
    document.getElementById('log-filter')?.addEventListener('change', (e) => {
        const filter = e.target.value;
        let filtered = allLogs;

        if (filter !== 'all') {
            filtered = allLogs.filter(l => l.entity_type === filter);
        }

        renderLogs(filtered);
    });

    // Log search
    document.getElementById('log-search')?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allLogs.filter(l =>
            l.action.toLowerCase().includes(query) ||
            l.entity_type.toLowerCase().includes(query)
        );
        renderLogs(filtered);
    });
}

// ============================================
// 10. UTILITIES
// ============================================

window.sortTable = function (tableType, columnIndex) {
    // Simple table sorting (can be enhanced)
    showToast('Sorting functionality coming soon', 'info');
}

window.handleLogout = async function () {
    // Clear hardcoded admin session
    localStorage.removeItem('hardcoded_admin_session');

    // Sign out from Supabase
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Store charts globally for theme updates
window.adminCharts = adminCharts;
