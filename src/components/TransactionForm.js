// src/components/TransactionForm.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, writeBatch, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { addMonths, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, Grid, Typography } from '@mui/material';

const TransactionForm = ({ onTransactionAdded, onClose }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState('variableExpense');
    const [installments, setInstallments] = useState(1);
    const [cardName, setCardName] = useState(''); // <-- NOVO ESTADO PARA O CARTÃO
    const { currentUser } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const transactionData = {
            description,
            amount: parseFloat(amount),
            date: parseISO(date),
            type,
            installments: parseInt(installments),
            cardName: cardName // <-- NOVO DADO
        };

        if (transactionData.type === 'installment' && transactionData.installments > 1) {
            const batch = writeBatch(db);
            const installmentId = uuidv4();
            const installmentValue = transactionData.amount / transactionData.installments;
            for (let i = 0; i < transactionData.installments; i++) {
                const installmentDate = addMonths(transactionData.date, i);
                const docRef = doc(collection(db, "transactions"));
                batch.set(docRef, {
                    userId: currentUser.uid,
                    description: `${transactionData.description} (${i + 1}/${transactionData.installments})`,
                    amount: installmentValue,
                    type: 'installment',
                    date: installmentDate,
                    isInstallment: true,
                    installmentDetails: { installmentId, current: i + 1, total: transactionData.installments },
                    cardName: transactionData.cardName, // <-- SALVANDO O NOME DO CARTÃO
                });
            }
            await batch.commit();
        } else {
            await addDoc(collection(db, 'transactions'), {
                userId: currentUser.uid,
                description: transactionData.description,
                amount: transactionData.amount,
                type: transactionData.type,
                date: transactionData.date,
                isInstallment: false,
            });
        }
        
        onTransactionAdded();
        onClose();
    };

    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, border: '1px solid #ddd', borderRadius: '8px', backgroundColor: 'white' }}>
            <Typography variant="h6" gutterBottom>Novo Lançamento</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <TextField label="Descrição" value={description} onChange={e => setDescription(e.target.value)} fullWidth required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField label="Valor (R$)" type="number" value={amount} onChange={e => setAmount(e.target.value)} fullWidth required />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField type="date" value={date} onChange={e => setDate(e.target.value)} fullWidth required />
                </Grid>
                <Grid item xs={12}>
                    <FormControl fullWidth>
                        <InputLabel>Tipo</InputLabel>
                        <Select value={type} label="Tipo" onChange={e => setType(e.target.value)}>
                            <MenuItem value="income">Entrada</MenuItem>
                            <MenuItem value="fixedExpense">Despesa Fixa</MenuItem>
                            <MenuItem value="variableExpense">Despesa Variável</MenuItem>
                            <MenuItem value="installment">Parcelamento</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                {/* <-- CONDIÇÃO PARA MOSTRAR OS CAMPOS DE PARCELAMENTO --> */}
                {type === 'installment' && (
                    <>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Nº de Parcelas" type="number" value={installments} onChange={e => setInstallments(e.target.value)} min="2" fullWidth />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField label="Nome do Cartão" value={cardName} onChange={e => setCardName(e.target.value)} fullWidth />
                        </Grid>
                    </>
                )}
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                     <Button onClick={onClose} variant="text">Cancelar</Button>
                     <Button type="submit" variant="contained">Salvar</Button>
                </Grid>
            </Grid>
        </Box>
    );
};

export default TransactionForm;