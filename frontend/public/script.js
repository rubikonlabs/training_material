const API_URL = 'http://localhost:8000';

// DOM Elements
const loginForm = document.getElementById('loginFormElement');
const registerForm = document.getElementById('registerFormElement');
const logoutButton = document.getElementById('logoutButton');
const showRegisterLink = document.getElementById('showRegister');
const showLoginLink = document.getElementById('showLogin');

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
logoutButton.addEventListener('click', handleLogout);
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms('registerForm');
});
showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms('loginForm');
});

// Form Handlers
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    clearError('loginError');
    const button = e.target.querySelector('button');
    setLoading(button, true);
    
    try {
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await fetch(`${API_URL}/api/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', username);
        
        showDashboard(username);
        loginForm.reset();
        
    } catch (error) {
        showError('loginError', error.message);
    } finally {
        setLoading(button, false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    clearError('registerError');
    const button = e.target.querySelector('button');
    setLoading(button, true);
    
    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Registration failed');
        }

        toggleForms('loginForm');
        alert(`Registration successful! Please login with your username: ${username}.`);
        registerForm.reset();
        
    } catch (error) {
        showError('registerError', error.message);
    } finally {
        setLoading(button, false);
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    toggleForms('loginForm');
}

// Utility Functions
function toggleForms(formToShow) {
    const forms = ['loginForm', 'registerForm', 'dashboard'];
    forms.forEach(form => {
        document.getElementById(form).style.display = 'none';
    });
    document.getElementById(formToShow).style.display = 'block';
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = '';
    errorElement.style.display = 'none';
}

function setLoading(button, isLoading) {
    button.disabled = isLoading;
}

function showDashboard(username) {
    document.getElementById('welcomeMessage').textContent = `Logged in as ${username}`;
    toggleForms('dashboard');
}

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (token && username) {
        showDashboard(username);
    }
});