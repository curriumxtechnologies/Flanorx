function checkSession() {
    const sessionData = JSON.parse(localStorage.getItem('flanorx_session'));
    
    // If no session or session is expired, redirect to login
    if (!sessionData || !sessionData.isLoggedIn) {
        window.location.href = 'login.html';
        return false;
    }
    
    // Optional: Check if session is still valid (e.g., not older than 7 days)
    const loginTime = new Date(sessionData.loginTime);
    const now = new Date();
    const daysDiff = (now - loginTime) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 7) {
        // Session expired after 7 days
        logout();
        return false;
    }
    
    return true;
}

function logout() {
    localStorage.removeItem('flanorx_session');
    window.location.href = 'login.html';
}