document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');
        const loginBtn = document.getElementById('loginbtn');

        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        errorMsg.classList.add('d-none');

        try {
            const result = await api.validateLogin(email, password);
            if (result.success) {
                sessionStorage.setItem("user", JSON.stringify(result.user));
                showDashboard(result.user);
            } else {
                errorMsg.textContent = result.message;
                errorMsg.classList.remove('d-none');
            }
        } catch (error) {
            errorMsg.textContent = 'An unexpected error occurred.';
            errorMsg.classList.remove('d-none');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login';
        }
    });

    // Handle Logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.clear();
        document.getElementById('dashboardSection').classList.add('d-none');
        document.getElementById('loginSection').classList.remove('d-none');
    });

    // Check for existing session on page load
    checkSession();
});

function checkSession() {
    const user = sessionStorage.getItem("user");
    if (user) {
        showDashboard(JSON.parse(user));
    } else {
        document.getElementById('dashboardSection').classList.add('d-none');
        document.getElementById('loginSection').classList.remove('d-none');
    }
}

function showDashboard(user) {
    document.getElementById('loginSection').classList.add('d-none');
    document.getElementById('dashboardSection').classList.remove('d-none');
    document.getElementById('userInfo').textContent = `${user.name} (${user.role})`;
    loadMenuItems(user.role);
    showSection('dashboard');
}

function loadMenuItems(role) {
    const allItems = {
        'dashboard': { text: 'Dashboard', icon: 'fas fa-chart-line', roles: ['admin', 'teacher'] },
        'students': { text: 'Students', icon: 'fas fa-users', roles: ['admin', 'teacher'] },
        'attendance': { text: 'Attendance', icon: 'fas fa-user-check', roles: ['admin', 'teacher'] },
        'settings': { text: 'Class Settings', icon: 'fas fa-cogs', roles: ['admin'] },
        'marks': { text: 'Marksheet', icon: 'fas fa-award', roles: ['admin', 'teacher'] },
        'fees': { text: 'Fees', icon: 'fas fa-rupee-sign', roles: ['admin'] },
        'promotion': { text: 'Promotion', icon: 'fas fa-arrow-alt-circle-up', roles: ['admin'] },
    };

    let menuHtml = '';
    let navMenuHtml = '';

    for (const [id, item] of Object.entries(allItems)) {
        if (item.roles.includes(role)) {
            menuHtml += `<a href="#" class="list-group-item list-group-item-action" onclick="event.preventDefault(); showSection('${id}')"><i class="${item.icon} me-2"></i> ${item.text}</a>`;
            navMenuHtml += `<li class="nav-item"><a class="nav-link" href="#" onclick="event.preventDefault(); showSection('${id}')"><i class="${item.icon} me-2"></i> ${item.text}</a></li>`;
        }
    }
    
    document.getElementById('sideMenu').innerHTML = menuHtml;
    document.getElementById('navMenu').innerHTML = navMenuHtml;
}
