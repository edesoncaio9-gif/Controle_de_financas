package com.caio.controledefinancas.domain.model

data class FinancialSummary(
    val incomeInCents: Long,
    val expenseInCents: Long,
) {
    val balanceInCents: Long
        get() = incomeInCents - expenseInCents
}

fun List<FinancialTransaction>.financialSummary(): FinancialSummary {
    return FinancialSummary(
        incomeInCents = filter { it.type == TransactionType.INCOME }.sumOf { it.amountInCents },
        expenseInCents = filter { it.type == TransactionType.EXPENSE }.sumOf { it.amountInCents },
    )
}
