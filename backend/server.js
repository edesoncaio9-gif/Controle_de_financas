const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const pool = require('./db');
const authenticateToken = require('./authMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// ROTA PRINCIPAL
// ==========================================

app.get('/', (req, res) => {
    res.json({
        message: 'API do Controle de Finanças funcionando!'
    });
});

// ==========================================
// TESTE DE CONEXÃO COM POSTGRESQL
// ==========================================

app.get('/api/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');

        res.json({
            message: 'PostgreSQL conectado!',
            time: result.rows[0].now
        });
    } catch (error) {
        console.error('Erro no PostgreSQL:', error);

        res.status(500).json({
            error: 'Erro ao conectar ao PostgreSQL'
        });
    }
});

// ==========================================
// CADASTRO DE USUÁRIO
// ==========================================

app.post('/api/users', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'Nome, e-mail e senha são obrigatórios.'
            });
        }

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'Este e-mail já está cadastrado.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name, email, passwordHash]
        );

        res.status(201).json({
            message: 'Usuário cadastrado com sucesso!',
            user: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);

        res.status(500).json({
            error: 'Erro interno ao cadastrar usuário.'
        });
    }
});

// ==========================================
// LOGIN
// ==========================================

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'E-mail e senha são obrigatórios.'
            });
        }

        const result = await pool.query(
            'SELECT id, name, email, password_hash FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'E-mail ou senha inválidos.'
            });
        }

        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                error: 'E-mail ou senha inválidos.'
            });
        }

        // ==========================================
        // GERAR JWT
        // ==========================================

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1h'
            }
        );

        res.json({
            message: 'Login realizado com sucesso!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Erro ao realizar login:', error);

        res.status(500).json({
            error: 'Erro interno ao realizar login.'
        });
    }
});

// ==========================================
// ROTA PROTEGIDA - TESTE JWT
// ==========================================

app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({
        message: 'Você está autenticado!',
        user: req.user
    });
});

// ==========================================
// CADASTRAR TRANSAÇÃO
// ==========================================

app.post('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const {
            type,
            amount,
            date,
            category,
            note
        } = req.body;

        if (!type || !amount || !date) {
            return res.status(400).json({
                error: 'Tipo, valor e data são obrigatórios.'
            });
        }

        if (type !== 'receita' && type !== 'despesa') {
            return res.status(400).json({
                error: 'O tipo deve ser receita ou despesa.'
            });
        }

        const result = await pool.query(
            `INSERT INTO transactions
            (user_id, type, amount, date, category, note)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [
                req.user.id,
                type,
                amount,
                date,
                category || null,
                note || null
            ]
        );

        res.status(201).json({
            message: 'Transação cadastrada com sucesso!',
            transaction: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao cadastrar transação:', error);

        res.status(500).json({
            error: 'Erro interno ao cadastrar transação.'
        });
    }
});

// ==========================================
// LISTAR TRANSAÇÕES DO USUÁRIO
// ==========================================

app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, user_id, type, amount, date, category, note, created_at
             FROM transactions
             WHERE user_id = $1
             ORDER BY date DESC, id DESC`,
            [req.user.id]
        );

        res.json({
            transactions: result.rows
        });

    } catch (error) {
        console.error('Erro ao buscar transações:', error);

        res.status(500).json({
            error: 'Erro interno ao buscar transações.'
        });
    }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

// ==========================================
// DASHBOARD
// ==========================================

app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                COALESCE(SUM(CASE
                    WHEN type = 'receita' THEN amount
                    ELSE 0
                END), 0) AS total_receitas,

                COALESCE(SUM(CASE
                    WHEN type = 'despesa' THEN amount
                    ELSE 0
                END), 0) AS total_despesas,

                COUNT(*) AS quantidade_transacoes

             FROM transactions
             WHERE user_id = $1`,
            [req.user.id]
        );

        const dados = result.rows[0];

        const totalReceitas = Number(dados.total_receitas);
        const totalDespesas = Number(dados.total_despesas);

        const saldo = totalReceitas - totalDespesas;

        res.json({
            saldo,
            totalReceitas,
            totalDespesas,
            quantidadeTransacoes: Number(dados.quantidade_transacoes)
        });

    } catch (error) {
        console.error('Erro ao buscar dashboard:', error);

        res.status(500).json({
            error: 'Erro interno ao buscar dados do dashboard.'
        });
    }
});

// ==========================================
// EXCLUIR TRANSAÇÃO
// ==========================================

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `DELETE FROM transactions
             WHERE id = $1
             AND user_id = $2
             RETURNING *`,
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Transação não encontrada.'
            });
        }

        res.json({
            message: 'Transação excluída com sucesso!',
            transaction: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao excluir transação:', error);

        res.status(500).json({
            error: 'Erro interno ao excluir transação.'
        });
    }
});

// ==========================================
// ATUALIZAR TRANSAÇÃO
// ==========================================

app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            type,
            amount,
            date,
            category,
            note
        } = req.body;

        if (!type || !amount || !date) {
            return res.status(400).json({
                error: 'Tipo, valor e data são obrigatórios.'
            });
        }

        if (type !== 'receita' && type !== 'despesa') {
            return res.status(400).json({
                error: 'O tipo deve ser receita ou despesa.'
            });
        }

        const result = await pool.query(
            `UPDATE transactions
             SET type = $1,
                 amount = $2,
                 date = $3,
                 category = $4,
                 note = $5
             WHERE id = $6
             AND user_id = $7
             RETURNING *`,
            [
                type,
                amount,
                date,
                category || null,
                note || null,
                id,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Transação não encontrada.'
            });
        }

        res.json({
            message: 'Transação atualizada com sucesso!',
            transaction: result.rows[0]
        });

    } catch (error) {
        console.error('Erro ao atualizar transação:', error);

        res.status(500).json({
            error: 'Erro interno ao atualizar transação.'
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});