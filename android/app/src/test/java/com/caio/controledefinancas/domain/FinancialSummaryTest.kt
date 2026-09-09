package com.caio.controledefinancas.domain

import com.caio.controledefinancas.domain.model.FinancialTransaction
import com.caio.controledefinancas.domain.model.TransactionType
import com.caio.controledefinancas.domain.model.financialSummary
import org.junit.Assert.assertEquals
import org.junit.Test

class FinancialSummaryTest {
    @Test
    fun `calcula receitas despesas e saldo em centavos`() {
        val transactions = listOf(
            transaction(TransactionType.INCOME, 250_000),
            transaction(TransactionType.INCOME, 50_000),
            transaction(TransactionType.EXPENSE, 75_500),
        )

        val summary = transactions.financialSummary()

        assertEquals(300_000, summary.incomeInCents)
        assertEquals(75_500, summary.expenseInCents)
        assertEquals(224_500, summary.balanceInCents)
    }

    @Test
    fun `lista vazia possui resumo zerado`() {
        val summary = emptyList<FinancialTransaction>().financialSummary()

        assertEquals(0, summary.incomeInCents)
        assertEquals(0, summary.expenseInCents)
        assertEquals(0, summary.balanceInCents)
    }

    private fun transaction(type: TransactionType, amountInCents: Long) = FinancialTransaction(
        id = amountInCents.toString(),
        type = type,
        amountInCents = amountInCents,
        date = "2026-09-09",
        category = "Teste",
        note = "",
    )
}
