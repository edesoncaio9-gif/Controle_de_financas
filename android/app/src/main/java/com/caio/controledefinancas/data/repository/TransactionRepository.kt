package com.caio.controledefinancas.data.repository

import com.caio.controledefinancas.data.local.dao.TransactionDao
import com.caio.controledefinancas.data.local.entity.TransactionEntity
import com.caio.controledefinancas.domain.model.FinancialTransaction
import com.caio.controledefinancas.domain.model.TransactionType
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class TransactionRepository(
    private val transactionDao: TransactionDao,
) {
    val transactions: Flow<List<FinancialTransaction>> = transactionDao.observeAll().map { entities ->
        entities.map(TransactionEntity::toDomain)
    }

    suspend fun save(transaction: FinancialTransaction) {
        transactionDao.insert(transaction.toEntity())
    }

    suspend fun update(transaction: FinancialTransaction) {
        transactionDao.update(transaction.toEntity())
    }

    suspend fun delete(transaction: FinancialTransaction) {
        transactionDao.deleteById(transaction.id)
    }

    private fun TransactionEntity.toDomain() = FinancialTransaction(
        id = id,
        type = type.toTransactionType(),
        amountInCents = amountInCents,
        date = date,
        category = category,
        note = note,
    )

    private fun FinancialTransaction.toEntity() = TransactionEntity(
        id = id,
        type = type.storageValue,
        amountInCents = amountInCents,
        date = date,
        category = category,
        note = note,
    )

    private fun String.toTransactionType() = when (this) {
        TransactionType.INCOME.storageValue -> TransactionType.INCOME
        else -> TransactionType.EXPENSE
    }

    private val TransactionType.storageValue: String
        get() = when (this) {
            TransactionType.INCOME -> "income"
            TransactionType.EXPENSE -> "expense"
        }
}
