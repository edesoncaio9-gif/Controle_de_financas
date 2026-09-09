package com.caio.controledefinancas.domain

import com.caio.controledefinancas.domain.model.FinancialTransaction
import com.caio.controledefinancas.domain.model.TransactionCsvCodec
import com.caio.controledefinancas.domain.model.TransactionType
import org.junit.Assert.assertEquals
import org.junit.Test

class TransactionCsvCodecTest {
    @Test
    fun `exporta e importa transacao com virgula e aspas`() {
        val original = listOf(
            FinancialTransaction(
                id = "1",
                type = TransactionType.EXPENSE,
                amountInCents = 12345,
                date = "2026-09-09",
                category = "Alimentação",
                note = "Mercado, semana \"1\"",
            ),
        )

        val restored = TransactionCsvCodec.decode(TransactionCsvCodec.encode(original))

        assertEquals(original, restored)
    }

    @Test
    fun `ignora cabecalho incorreto`() {
        assertEquals(emptyList<FinancialTransaction>(), TransactionCsvCodec.decode("wrong,header"))
    }
}
