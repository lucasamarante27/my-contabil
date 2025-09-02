// src/pages/Dashboard.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, writeBatch } from 'firebase/firestore'; 
import { db } from '../firebase/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { startOfMonth, endOfMonth, subMonths, addMonths, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransactionForm from '../components/TransactionForm';

import {
    Container, Typography, Box, Grid, Card, CardContent, Fab, Modal,
    List, ListItem, ListItemText, ListItemSecondaryAction, IconButton,
    AppBar, Toolbar, Button, CircularProgress, Divider
} from '@mui/material';
import { Add as AddIcon, Logout as LogoutIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Delete as DeleteIcon } from '@mui/icons-material';

const Dashboard = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    
    const [currentMonth, setCurrentMonth] = useState(() => {
        const savedMonth = localStorage.getItem('currentMonth');
        return savedMonth ? parseISO(savedMonth) : new Date();
    });

    const [transactions, setTransactions] = useState([]);
    const [previousMonthBalance, setPreviousMonthBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);

    useEffect(() => {
        localStorage.setItem('currentMonth', currentMonth.toISOString());
    }, [currentMonth]);

    const fetchData = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);

        const endOfPrevMonth = endOfMonth(subMonths(currentMonth, 1));
        const prevBalanceQuery = query(collection(db, "transactions"), where("userId", "==", currentUser.uid), where("date", "<=", endOfPrevMonth));
        const prevSnapshot = await getDocs(prevBalanceQuery);
        let balance = 0;
        prevSnapshot.forEach(doc => {
            const t = doc.data();
            if (t.type === 'income') {
                balance += t.amount;
            } else {
                balance -= t.amount;
            }
        });
        setPreviousMonthBalance(balance);

        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        const currentMonthQuery = query(collection(db, 'transactions'), where('userId', '==', currentUser.uid), where('date', '>=', start), where('date', '<=', end), orderBy('date', 'asc'));
        const currentSnapshot = await getDocs(currentMonthQuery);
        const monthlyTransactions = currentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date.toDate() }));
        setTransactions(monthlyTransactions);
        
        setLoading(false);
    }, [currentUser, currentMonth]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async (transactionToDelete) => {
        const isConfirmed = window.confirm(`Tem certeza que deseja excluir "${transactionToDelete.description}"? Esta ação não pode ser desfeita.`);
        if (!isConfirmed) return;

        try {
            if (transactionToDelete.isInstallment) {
                const batch = writeBatch(db);
                const installmentId = transactionToDelete.installmentDetails.installmentId;
                const q = query(collection(db, 'transactions'), where('userId', '==', currentUser.uid), where('installmentDetails.installmentId', '==', installmentId), where('date', '>=', transactionToDelete.date));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(document => batch.delete(document.ref));
                await batch.commit();
            } else if (transactionToDelete.isRecurring) {
                const batch = writeBatch(db);
                const recurringId = transactionToDelete.recurringId;
                const q = query(collection(db, 'transactions'), where('userId', '==', currentUser.uid), where('recurringId', '==', recurringId), where('date', '>=', transactionToDelete.date));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(document => batch.delete(document.ref));
                await batch.commit();
            } else { // Transação única
                const docRef = doc(db, 'transactions', transactionToDelete.id);
                await deleteDoc(docRef);
            }
            fetchData();
        } catch (error) {
            console.error("Erro ao deletar transação:", error);
            alert("Ocorreu um erro ao tentar excluir o lançamento.");
        }
    };

    const summary = useMemo(() => {
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);

        const expenses = transactions
            .filter(t => t.type !== 'income')
            .reduce((acc, t) => acc + t.amount, 0);

        return { income, expenses, finalBalance: previousMonthBalance + income - expenses };
    }, [transactions, previousMonthBalance]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const changeMonth = (amount) => setCurrentMonth(prev => addMonths(prev, amount));

    return (
        <Box sx={{ flexGrow: 1, backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
            <AppBar position="sticky">
                <Toolbar sx={{ flexWrap: 'wrap' }}>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, minWidth: '200px' }}>Minha Contabilidade</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: { xs: 0, sm: 'auto' } }}>
                        <Typography sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>{currentUser.email}</Typography>
                        <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout}>Sair</Button>
                    </Box>
                </Toolbar>
            </AppBar>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4, paddingBottom: 10 }}> 
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
                    <IconButton onClick={() => changeMonth(-1)}><ChevronLeftIcon /></IconButton>
                    <Typography variant="h5" sx={{ mx: 3, width: '250px', textAlign: 'center' }}>
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </Typography>
                    <IconButton onClick={() => changeMonth(1)}><ChevronRightIcon /></IconButton>
                </Box>
            
                {loading ? <CircularProgress sx={{ display: 'block', margin: 'auto' }} /> : (
                    <>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6} md={3}><SummaryCard title="Saldo Anterior" value={previousMonthBalance} /></Grid>
                            <Grid item xs={12} sm={6} md={3}><SummaryCard title="Entradas do Mês" value={summary.income} color="success.main" /></Grid>
                            <Grid item xs={12} sm={6} md={3}><SummaryCard title="Despesas do Mês" value={summary.expenses} color="error.main" /></Grid>
                            <Grid item xs={12} sm={6} md={3}><SummaryCard title="Saldo Final" value={summary.finalBalance} isBold /></Grid>
                        </Grid>
                        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Lançamentos do Mês</Typography>
                        {transactions.length > 0 ? (
                            <List sx={{ backgroundColor: 'transparent' }}>
                                {transactions.map((t, index) => (
                                    <React.Fragment key={t.id}>
                                        <Card sx={{ mb: 2 }}> {/* Usando Card para cada item da lista */}
                                            <ListItem sx={{ padding: '16px' }}> {/* Adicionado padding para o conteúdo */}
                                                <ListItemText 
                                                    primary={t.description} 
                                                    secondary={`${format(t.date, 'dd/MM/yyyy')} ${t.cardName ? `| Cartão: ${t.cardName}` : ''}`} 
                                                />
                                                <ListItemSecondaryAction>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}>
                                                        <Typography component="span" sx={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }} color={t.type === 'income' ? 'success.main' : 'error.main'}>
                                                            {t.type === 'income' ? `+ R$ ${t.amount.toFixed(2)}` : `- R$ ${t.amount.toFixed(2)}`}
                                                        </Typography>
                                                        <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(t)} sx={{ ml: 1, minWidth: '40px' }}>
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Box>
                                                </ListItemSecondaryAction>
                                            </ListItem>
                                        </Card>
                                    </React.Fragment>
                                ))}
                            </List>
                        ) : (
                            <Typography>Nenhum lançamento para este mês.</Typography>
                        )}
                    </>
                )}
                <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1050 }} onClick={() => setOpenModal(true)}>
                    <AddIcon />
                </Fab>
                <Modal open={openModal} onClose={() => setOpenModal(false)} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Box sx={{ width: '90%', maxWidth: 500 }}>
                        <TransactionForm onTransactionAdded={fetchData} onClose={() => setOpenModal(false)} />
                    </Box>
                </Modal>
             </Container>
        </Box>
    );
};

const SummaryCard = ({ title, value, color = 'text.primary', isBold = false }) => (
    <Card>
        <CardContent>
            <Typography color="text.secondary" gutterBottom>{title}</Typography>
            <Typography variant="h5" component="div" color={color} fontWeight={isBold ? 'bold' : 'normal'}>
                R$ {value.toFixed(2)}
            </Typography>
        </CardContent>
    </Card>
);

export default Dashboard;
