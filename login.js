document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.querySelector('.reg-form');
    const loginForm = document.querySelector('.login-form');
    const previewBtn = document.getElementById('preview-btn');

    if (!window.apiClient) {
        console.error('apiClient unavailable – ensure js/apiClient.js is loaded before login.js');
        return;
    }

    const client = window.apiClient;

    // Admin credentials (legacy demo override)
    const ADMIN_EMAIL = 'admin@miit.com';
    const ADMIN_PASSWORD = 'admin123';

    const PHONE_REGEX = /^09\d{9}$/;
    const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    function normalizePhone(value) {
        return String(value || '').replace(/\D/g, '');
    }

    function isValidPhone(value) {
        return PHONE_REGEX.test(value);
    }

    function isValidPassword(value) {
        return PASSWORD_REGEX.test(value || '');
    }

    function getFormField(form, name) {
        if (!form || !form.elements) return null;
        return form.elements[name] || null;
    }

    function getFieldErrorElement(form, name) {
        return form ? form.querySelector(`[data-error-for="${name}"]`) : null;
    }

    function setFieldError(form, name, message) {
        const input = getFormField(form, name);
        const errorEl = getFieldErrorElement(form, name);
        const hasMessage = Boolean(message);
        if (input) {
            input.classList.toggle('is-invalid', hasMessage);
            if (typeof input.setCustomValidity === 'function') {
                input.setCustomValidity(hasMessage ? message : '');
            }
        }
        if (errorEl) {
            errorEl.textContent = message || '';
            errorEl.classList.toggle('is-visible', hasMessage);
        }
    }

    function clearFieldError(form, name) {
        setFieldError(form, name, '');
    }

    function scheduleFieldAutoClear(form, name) {
        const field = getFormField(form, name);
        if (!field) return;
        const handler = () => clearFieldError(form, name);
        field.addEventListener('input', handler);
        field.addEventListener('blur', handler);
    }

    const USERS_STORAGE_KEY = 'allUserInfo';

    function readCachedUsers() {
        if (typeof localStorage === 'undefined') return [];
        try {
            const raw = localStorage.getItem(USERS_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.warn('Unable to parse stored users', err);
            return [];
        }
    }

    function writeCachedUsers(users) {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        } catch (err) {
            console.warn('Unable to persist user cache', err);
        }
    }

    function enqueueAdminRequest(details) {
        if (!details || !details.email) return;
        if (typeof localStorage === 'undefined') return;
        const emailLower = details.email.toLowerCase();
        let notifications = [];
        try {
            const raw = localStorage.getItem('adminNotifications');
            notifications = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(notifications)) notifications = [];
        } catch {
            notifications = [];
        }

        const alreadyPending = notifications.some((entry) => {
            const entryEmail = entry && entry.user && entry.user.email ? entry.user.email.toLowerCase() : '';
            return entry && entry.status === 'pending' && entry.type === 'admin-request' && entryEmail === emailLower;
        });

        if (!alreadyPending) {
            notifications.push({
                id: `req-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                type: 'admin-request',
                user: { fullname: details.fullname || details.email, email: details.email },
                status: 'pending',
                date: new Date().toISOString(),
            });
            try {
                localStorage.setItem('adminNotifications', JSON.stringify(notifications));
            } catch (err) {
                console.warn('Unable to persist adminNotifications', err);
            }
        }

        let pendingAccounts = [];
        try {
            const raw = localStorage.getItem('pendingAdminAccounts');
            pendingAccounts = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(pendingAccounts)) pendingAccounts = [];
        } catch {
            pendingAccounts = [];
        }

        const existsInPending = pendingAccounts.some((entry) => (entry?.email || '').toLowerCase() === emailLower);
        if (!existsInPending) {
            const pendingPayload = {
                id: details.id || `pending-${Date.now()}`,
                fullname: details.fullname || '',
                email: details.email,
                phone: details.phone || details.mobile || '',
                password: details.password || '',
                role: 'user',
                pendingAdmin: true,
                requestedAt: new Date().toISOString(),
                source: details.source || 'login-register',
            };
            pendingAccounts.push(pendingPayload);
            try {
                localStorage.setItem('pendingAdminAccounts', JSON.stringify(pendingAccounts));
            } catch (err) {
                console.warn('Unable to persist pendingAdminAccounts', err);
            }
        }
    }

    function isFullnameTaken(fullname, emailToIgnore = '') {
        const normalizedName = String(fullname || '').trim().toLowerCase();
        if (!normalizedName) return false;
        const ignoreEmail = String(emailToIgnore || '').trim().toLowerCase();
        return readCachedUsers().some((user) => {
            if (!user || typeof user.fullname !== 'string') return false;
            const storedName = user.fullname.trim().toLowerCase();
            if (storedName !== normalizedName) return false;
            const storedEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
            return !ignoreEmail || storedEmail !== ignoreEmail;
        });
    }

    function rememberUserLocally(user) {
        if (!user || typeof localStorage === 'undefined') return;
        const users = readCachedUsers();
        const normalizedEmail = String(user.email || '').trim().toLowerCase();
        const normalizedName = String(user.fullname || '').trim();
        const payload = {
            ...user,
            fullname: normalizedName,
            email: normalizedEmail || user.email || ''
        };
        if (!payload.avatarUrl && !payload.avatar) {
            payload.avatarUrl = 'img/default-user.svg';
        }
        const index = users.findIndex((entry) => {
            if (!entry) return false;
            const entryEmail = typeof entry.email === 'string' ? entry.email.trim().toLowerCase() : '';
            return normalizedEmail && entryEmail === normalizedEmail;
        });
        if (index >= 0) {
            users[index] = { ...users[index], ...payload };
        } else {
            users.push(payload);
        }
        writeCachedUsers(users);
    }

    // helper: choose homepage based on language preference
    function getHomeByLang() {
        return localStorage.getItem('siteLang') === 'my' ? 'Homepage(myanmar).html' : 'Homepage.html';
    }

    // Preview button handler
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            sessionStorage.setItem('__au__', JSON.stringify({
                fullname: 'Guest User',
                email: 'guest@preview.com',
                role: 'guest',
                isPreview: true,
                avatarUrl: 'img/default-user.svg',
            }));
            window.location.href = getHomeByLang();
        });
    }

    if (regForm) {
        ['fullname', 'mobile', 'email', 'password'].forEach((field) => scheduleFieldAutoClear(regForm, field));
        regForm.addEventListener('reset', () => {
            ['fullname', 'mobile', 'email', 'password'].forEach((field) => clearFieldError(regForm, field));
        });

        regForm.addEventListener('submit', (e) => {
            e.preventDefault();

            ['fullname', 'mobile', 'email', 'password'].forEach((field) => clearFieldError(regForm, field));

            const selectedRole = regForm.role ? regForm.role.value : 'user';
            const trimmedName = regForm.fullname.value.trim();
            regForm.fullname.value = trimmedName;
            const normalizedEmail = regForm.email.value.trim().toLowerCase();
            regForm.email.value = normalizedEmail;

            if (trimmedName.length < 4) {
                setFieldError(regForm, 'fullname', 'Full name must be at least 4 characters long.');
                regForm.fullname.focus();
                regForm.fullname.reportValidity();
                return;
            }

            if (isFullnameTaken(trimmedName, normalizedEmail)) {
                setFieldError(regForm, 'fullname', 'This name is already registered. Please choose another one.');
                regForm.fullname.focus();
                regForm.fullname.reportValidity();
                return;
            }

            const phoneDigits = normalizePhone(regForm.mobile.value);
            regForm.mobile.value = phoneDigits;
            if (!isValidPhone(phoneDigits)) {
                setFieldError(regForm, 'mobile', 'Phone number must start with 09 and contain exactly 11 digits.');
                regForm.mobile.focus();
                return;
            }

            const passwordValue = regForm.password.value;
            if (!isValidPassword(passwordValue)) {
                setFieldError(regForm, 'password', 'Use at least 8 characters with one uppercase letter, one number, and one special character.');
                regForm.password.focus();
                return;
            }

            const payload = {
                fullname: trimmedName,
                email: normalizedEmail,
                password: passwordValue,
                phone: phoneDigits,
                role: selectedRole
            };

            const regBtn = regForm.querySelector('.butt');
            regBtn.innerText = 'Processing...';
            regBtn.disabled = true;

            client.post('/auth/register', payload, { auth: false })
                .then(({ token, user, message }) => {
                    const serverUser = user || {};
                    const adminRequestSelected = selectedRole === 'admin';
                    const serverExplicitPending = serverUser.pendingAdmin === true;
                    const serverProvidedPendingFlag = Object.prototype.hasOwnProperty.call(serverUser, 'pendingAdmin');
                    const adminRequestPending = adminRequestSelected && (serverExplicitPending || (!serverProvidedPendingFlag && serverUser.role !== 'admin'));
                    const finalUser = {
                        ...serverUser,
                        fullname: serverUser.fullname || payload.fullname,
                        email: serverUser.email || payload.email,
                        phone: serverUser.phone || serverUser.mobile || payload.phone,
                        pendingAdmin: serverExplicitPending || adminRequestPending,
                    };
                    if (!finalUser.avatarUrl && !finalUser.avatar) {
                        finalUser.avatarUrl = 'img/default-user.svg';
                    }
                    if (!finalUser.role) {
                        finalUser.role = adminRequestSelected && !serverUser.role ? 'user' : (serverUser.role || 'user');
                    }
                    client.setSession({ token, user: finalUser });
                    if (finalUser.pendingAdmin) {
                        enqueueAdminRequest({
                            id: finalUser.id || finalUser._id || '',
                            fullname: finalUser.fullname,
                            email: finalUser.email,
                            phone: finalUser.phone,
                            password: payload.password,
                            source: 'login-register',
                        });
                    }
                    const successMsg = message
                        || (finalUser.pendingAdmin ? 'Admin request received. Await approval.' : 'Registration Success!');
                    swal('Great!', successMsg, 'success');
                            rememberUserLocally({
                                fullname: finalUser.fullname,
                                email: finalUser.email,
                                phone: finalUser.phone,
                                role: finalUser.role,
                                pendingAdmin: finalUser.pendingAdmin,
                                avatarUrl: 'img/default-user.svg',
                            });
                    regForm.reset();
                    const container = document.getElementById('container');
                    if (container) {
                        container.classList.add('active');
                    }
                    document.getElementById('toggle-title').textContent = 'Welcome Back!';
                    document.getElementById('toggle-desc').textContent = 'Already have an account?';
                    document.getElementById('toggle-btn').textContent = 'Login';
                })
                .catch((err) => {
                    swal('Failed!', err.message || 'Registration failed', 'error');
                })
                .finally(() => {
                    regBtn.innerText = 'Register';
                    regBtn.disabled = false;
                });
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const loginBtn = loginForm.querySelector('.butt');
            const email = loginForm.querySelector("input[type='email']").value.trim().toLowerCase();
            const password = loginForm.querySelector("input[type='password']").value;

            // Demo admin bypass
            if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                loginBtn.innerText = 'Please wait...';
                setTimeout(() => {
                    loginBtn.innerText = 'Login';
                    sessionStorage.setItem('__au__', JSON.stringify({
                        fullname: 'Administrator',
                        email: ADMIN_EMAIL,
                        role: 'admin',
                        avatarUrl: 'img/default-user.svg',
                    }));
                    window.location.href = 'admin.html';
                }, 2000);
                return;
            }

            loginBtn.innerText = 'Please wait...';
            loginBtn.disabled = true;

            client.post('/auth/login', { email, password }, { auth: false })
                .then(({ token, user }) => {
                    const hydratedUser = user ? {
                        ...user,
                        avatarUrl: user.avatarUrl || user.avatar || 'img/default-user.svg',
                    } : { avatarUrl: 'img/default-user.svg' };
                    client.setSession({ token, user: hydratedUser });
                    if (hydratedUser?.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = getHomeByLang();
                    }
                })
                .catch((err) => {
                    const message = err?.message || 'Login failed';
                    swal('Warning', message.includes('Network') ? 'Unable to reach the server. Please ensure the backend is running.' : message, 'warning');
                })
                .finally(() => {
                    loginBtn.innerText = 'Login';
                    loginBtn.disabled = false;
                });
        });
    }

    // Toggle handler (same as before)
    const container = document.getElementById('container');
    const toggleBtn = document.getElementById('toggle-btn');
    const toggleTitle = document.getElementById('toggle-title');
    const toggleDesc = document.getElementById('toggle-desc');
    const isMyanmar = document.documentElement.lang === 'my';

    const copySet = {
        defaultTitle: isMyanmar ? 'မင်္ဂလာပါ၊ ကြိုဆိုပါသည်!' : 'Hello, Welcome!',
        defaultDesc: isMyanmar ? 'အကောင့်မရှိသေးပါသလား?' : "Don't have an account?",
        defaultBtn: isMyanmar ? 'အကောင့်အသစ်ဖွင့်ရန်' : 'Register',
        activeTitle: isMyanmar ? 'ပြန်လာတာကြိုဆိုပါတယ်!' : 'Welcome Back!',
        activeDesc: isMyanmar ? 'အကောင့်ရှိပြီးသားလား?' : 'Already have an account?',
        activeBtn: isMyanmar ? 'အကောင့်ဝင်ရန်' : 'Login'
    };

    function setToggleCopy(isActive) {
        if (!toggleTitle || !toggleDesc || !toggleBtn) return;
        if (isActive) {
            toggleTitle.textContent = copySet.activeTitle;
            toggleDesc.textContent = copySet.activeDesc;
            toggleBtn.textContent = copySet.activeBtn;
        } else {
            toggleTitle.textContent = copySet.defaultTitle;
            toggleDesc.textContent = copySet.defaultDesc;
            toggleBtn.textContent = copySet.defaultBtn;
        }
    }

    setToggleCopy(container?.classList.contains('active'));

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
        container.classList.toggle('active');
        setToggleCopy(container.classList.contains('active'));
        });
    }

        // Auto-upgrade polling: if current user was pending admin, poll refresh until elevated
        (function startAutoUpgradePolling(){
            try {
                const user = client.getCurrentUser();
                if (!user || !user.pendingAdmin) return; // only poll for pending admin accounts
                let attempts = 0;
                const maxAttempts = 60; // ~5 minutes at 5s interval
                const intervalMs = 5000;
                const id = setInterval(async () => {
                    attempts++;
                    const refreshed = await client.refreshSession();
                    if (refreshed && refreshed.role === 'admin' && !refreshed.pendingAdmin) {
                        clearInterval(id);
                        // redirect user seamlessly to admin dashboard
                            window.location.href = 'admin.html';
                    } else if (attempts >= maxAttempts) {
                        clearInterval(id);
                    }
                }, intervalMs);
            } catch (e) {
                console.warn('auto-upgrade polling init failed', e && e.message);
            }
        })();
});

// Moved from inline Login.html: language switcher and link mapping
(function () {
    const sel = document.getElementById('langSelect');
    if (!sel) return;
    // initialize from stored preference
    const stored = localStorage.getItem('siteLang');
    if (stored) sel.value = stored;
    sel.addEventListener('change', (e) => {
        localStorage.setItem('siteLang', e.target.value);
        if (e.target.value === 'my') {
            window.location.href = 'login(myanmar).html';
        } else {
            window.location.href = 'Login.html';
        }
    });
})();

(function () {
    const map = {
        'Homepage.html': 'Homepage(myanmar).html',
        'Login.html': 'login(myanmar).html',
        'booking.html': 'booking(myanmar).html'
    };
    if (localStorage.getItem('siteLang') === 'my') {
        document.querySelectorAll('a[href]').forEach(a => {
            const h = a.getAttribute('href');
            if (map[h]) a.setAttribute('href', map[h]);
        });
    }
})();