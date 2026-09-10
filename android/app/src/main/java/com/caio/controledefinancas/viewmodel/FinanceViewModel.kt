package com.caio.controledefinancas.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.caio.controledefinancas.data.repository.TransactionRepository
import com.caio.controledefinancas.domain.model.FinancialTransaction
import com.caio.controledefinancas.domain.model.TransactionType
import com.caio.controledefinancas.domain.model.TransactionValidator
import com.caio.controledefinancas.domain.model.TransactionCsvCodec
import com.caio.controledefinancas.domain.model.financialSummary
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

data class FinanceUiState(
    val transactions: List<FinancialTransaction> = emptyList(),
    val incomeInCents: Long = 0,
    val expenseInCents: Long = 0,
    val balanceInCents: Long = 0,
    val monthLabel: String = "mês atual",
)

class FinanceViewModel(private val repository: TransactionRepository) : ViewModel() {
    val uiState: StateFlow<FinanceUiState> = repository.transactions
        .map { transactions ->
            val summary = transactions.financialSummary()
            FinanceUiState(
                transactions = transactions,
                incomeInCents = summary.incomeInCents,
                expenseInCents = summary.expenseInCents,
                balanceInCents = summary.balanceInCents,
                monthLabel = LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM yyyy", Locale("pt", "BR"))),
            )
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), FinanceUiState())

    fun saveTransaction(
        id: String?,
        type: TransactionType,
        amountText: String,
        date: String,
        category: String,
        note: String,
        onResult: (String?) -> Unit,
    ) {
        val amountInCents = TransactionValidator.parseAmountInCents(amountText)
        val validationError = TransactionValidator.validate(amountInCents, date)
        if (validationError != null) {
            onResult(validationError)
            return
        }

        val transaction = FinancialTransaction(
            id = id ?: UUID.randomUUID().toString(),
            type = type,
            amountInCents = amountInCents,
            date = date,
            category = category.trim(),
            note = note.trim(),
        )
        viewModelScope.launch {
            if (id == null) repository.save(transaction) else repository.update(transaction)
            onResult(null)
        }
    }

    fun deleteTransaction(transaction: FinancialTransaction) {
        viewModelScope.launch { repository.delete(transaction) }
    }

    fun exportCsv(): String = TransactionCsvCodec.encode(uiState.value.transactions)

    fun importCsv(csv: String, onResult: (Int) -> Unit) {
        viewModelScope.launch {
            val transactions = TransactionCsvCodec.decode(csv)
            transactions.forEach { repository.save(it) }
            onResult(transactions.size)
        }
    }
}

class FinanceViewModelFactory(private val repository: TransactionRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        require(modelClass.isAssignableFrom(FinanceViewModel::class.java))
        return FinanceViewModel(repository) as T
    }
}
