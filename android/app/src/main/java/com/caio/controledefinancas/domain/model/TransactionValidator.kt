package com.caio.controledefinancas.domain.model

import java.time.LocalDate

object TransactionValidator {
    fun parseAmountInCents(text: String): Long? {
        return runCatching {
            text.replace(',', '.').toBigDecimal()
                .movePointRight(2)
                .longValueExact()
        }.getOrNull()
    }

    fun validate(amountInCents: Long?, date: String): String? = when {
        amountInCents == null || amountInCents <= 0 -> "Informe um valor maior que zero."
        runCatching { LocalDate.parse(date) }.isFailure -> "Informe uma data válida."
        else -> null
    }
}
