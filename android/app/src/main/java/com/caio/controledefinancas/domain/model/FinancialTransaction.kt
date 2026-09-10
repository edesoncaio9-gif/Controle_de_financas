package com.caio.controledefinancas.domain.model

data class FinancialTransaction(
    val id: String,
    val type: TransactionType,
    val amountInCents: Long,
    val date: String,
    val category: String,
    val note: String,
)
