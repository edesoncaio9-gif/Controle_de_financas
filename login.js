const API_URL = 'http://172.28.4.149:3000/api';

const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');

const registerForm = document.getElementById('register-form');
const registerButton = document.getElementById('register-button');
const registerError = document.getElementById('register-error');

const showRegisterButton = document.getElementById('show-register');
const showLoginButton = document.getElementById('show-login');

function isGmailAddress(address) {
    return /^[^\s@]+@gmail\.com$/i.test(address);
}


// ===============================
// LOGIN
// ===============================

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    loginError.hidden = true;
    loginError.textContent = '';

    if (!isGmailAddress(email)) {
        loginError.textContent = 'Informe um endereço Gmail válido (@gmail.com).';
        loginError.hidden = false;
        return;
    }

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
            throw new Error(data.error || 'Gmail ou senha inválidos.');
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


// ===============================
// MOSTRAR CADASTRO
// ===============================

showRegisterButton.addEventListener('click', () => {
    loginForm.hidden = true;
    registerForm.hidden = false;
});


// ===============================
// VOLTAR PARA LOGIN
// ===============================

showLoginButton.addEventListener('click', () => {
    registerForm.hidden = true;
    loginForm.hidden = false;
});


// ===============================
// CADASTRO
// ===============================

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;

    registerError.hidden = true;
    registerError.textContent = '';

    if (!isGmailAddress(email)) {
        registerError.textContent = 'Informe um endereço Gmail válido (@gmail.com).';
        registerError.hidden = false;
        return;
    }

    // Verifica se as senhas são iguais
    if (password !== passwordConfirm) {
        registerError.textContent = 'As senhas não coincidem.';
        registerError.hidden = false;
        return;
    }

    registerButton.disabled = true;
    registerButton.textContent = 'Criando conta...';

    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Não foi possível criar a conta.');
        }

        alert('Conta criada com sucesso!');

        // Limpa os campos
        registerForm.reset();

        // Volta para o login
        registerForm.hidden = true;
        loginForm.hidden = false;

    } catch (error) {
        console.error('Erro no cadastro:', error);

        registerError.textContent = error.message;
        registerError.hidden = false;

    } finally {
        registerButton.disabled = false;
        registerButton.textContent = 'Criar conta';
    }
});