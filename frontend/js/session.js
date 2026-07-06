function checkSession() {
    const raw = localStorage.getItem('flanorx_auth');
    if (!raw) {
        window.location.href = 'login.html';
        return false;
    }

    try {
        const session = JSON.parse(raw);
        
        // Check if token exists
        if (!session.token) {
            localStorage.removeItem('flanorx_auth');
            window.location.href = 'login.html';
            return false;
        }

        // Optional: Check session age (7 days expiration)
        const loggedInAt = session.loggedInAt || 0;
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (now - loggedInAt > sevenDays) {
            // Session expired
            localStorage.removeItem('flanorx_auth');
            window.location.href = 'login.html';
            return false;
        }

        // Session is valid
        return true;
    } catch (e) {
        localStorage.removeItem('flanorx_auth');
        window.location.href = 'login.html';
        return false;
    }
}

function logout() {
    localStorage.removeItem('flanorx_auth');
    window.location.href = 'login.html';
}

function getAuthData() {
    const raw = localStorage.getItem('flanorx_auth');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}