// src/pages/Signup.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Button, TextField, Container, Typography, Box, Alert, CircularProgress, Link, AppBar, Toolbar, Paper } from '@mui/material';

function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== passwordConfirm) {
            return setError('As senhas não são iguais.');
        }
        setLoading(true);
        try {
            setError('');
            await signup(email, password);
            navigate('/');
        } catch (err) {
            setError('Falha ao criar a conta. O e-mail pode já estar em uso.');
        }
        setLoading(false);
    };
  
    return (
        <Box sx={{ flexGrow: 1, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Minha Contabilidade
                    </Typography>
                </Toolbar>
            </AppBar>
            <Container component="main" maxWidth="xs">
                <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography component="h1" variant="h5">
                        Cadastro
                    </Typography>
                    
                    {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                        <TextField margin="normal" required fullWidth id="email" label="Seu E-mail" name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        <TextField margin="normal" required fullWidth name="password" label="Crie uma Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        <TextField margin="normal" required fullWidth name="passwordConfirm" label="Confirme a Senha" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
                        
                        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
                            {loading ? <CircularProgress size={24} /> : 'Cadastrar'}
                        </Button>
                        
                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                            <Link component={RouterLink} to="/login" variant="body2">
                                {"Já tem uma conta? Faça Login"}
                            </Link>
                        </Box>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}

export default Signup;