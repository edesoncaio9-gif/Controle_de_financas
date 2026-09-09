package com.caio.controledefinancas.domain

import com.caio.controledefinancas.domain.model.TransactionValidator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TransactionValidatorTest {
    @Test
    fun `converte valor decimal para centavos`() {
        assertEquals(12345L, TransactionValidator.parseAmountInCents("123,45"))
    }

    @Test
    fun `rejeita valor vazio zero negativo e com mais de duas casas`() {
        assertNull(TransactionValidator.parseAmountInCents(""))
        assertEquals("Informe um valor maior que zero.", TransactionValidator.validate(0, "2026-09-09"))
        assertEquals("Informe um valor maior que zero.", TransactionValidator.validate(-1, "2026-09-09"))
        assertNull(TransactionValidator.parseAmountInCents("1,999"))
    }

    @Test
    fun `rejeita data invalida`() {
        assertEquals("Informe uma data válida.", TransactionValidator.validate(100, "09/09/2026"))
        assertNull(TransactionValidator.validate(100, "2026-09-09"))
    }
}
