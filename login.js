const API_URL = 'http://localhost:3000/api';

const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    loginError.hidden = true;
    loginError.textContent = '';

    loginButton.disabled = true;
    loginButton.textContent = 'Entrando...';

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'E-mail ou senha inválidos.');
        }

        localStorage.setItem('authToken', data.token);

        window.location.href = 'index.html';

    } catch (error) {
        console.error('Erro no login:', error);

        loginError.textContent = error.message;
        loginError.hidden = false;

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Entrar';
    }
});