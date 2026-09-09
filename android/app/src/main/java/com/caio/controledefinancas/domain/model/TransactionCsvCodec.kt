package com.caio.controledefinancas.domain.model

object TransactionCsvCodec {
    private val header = listOf("id", "type", "amount", "date", "category", "note")

    fun encode(transactions: List<FinancialTransaction>): String {
        val rows = transactions.map { transaction ->
            listOf(
                transaction.id,
                transaction.type.storageValue,
                (transaction.amountInCents / 100.0).toString(),
                transaction.date,
                transaction.category,
                transaction.note,
            ).joinToString(",", transform = ::escape)
        }
        return (listOf(header.joinToString(",")) + rows).joinToString("\n")
    }

    fun decode(csv: String): List<FinancialTransaction> {
        val lines = csv.lineSequence().map(String::trim).filter(String::isNotEmpty).toList()
        if (lines.isEmpty()) return emptyList()
        val columns = parseLine(lines.first())
        if (columns != header) return emptyList()

        return lines.drop(1).mapNotNull { line ->
            val values = parseLine(line)
            if (values.size < header.size) return@mapNotNull null
            val amountInCents = TransactionValidator.parseAmountInCents(values[2]) ?: return@mapNotNull null
            if (TransactionValidator.validate(amountInCents, values[3]) != null) return@mapNotNull null
            FinancialTransaction(
                id = values[0],
                type = if (values[1] == TransactionType.INCOME.storageValue) TransactionType.INCOME else TransactionType.EXPENSE,
                amountInCents = amountInCents,
                date = values[3],
                category = values[4],
                note = values[5],
            )
        }
    }

    private fun escape(value: String): String = "\"${value.replace("\"", "\"\"")}\""

    private fun parseLine(line: String): List<String> {
        val values = mutableListOf<String>()
        val current = StringBuilder()
        var quoted = false
        var index = 0
        while (index < line.length) {
            val character = line[index]
            when {
                character == '"' && quoted && index + 1 < line.length && line[index + 1] == '"' -> {
                    current.append('"')
                    index++
                }
                character == '"' -> quoted = !quoted
                character == ',' && !quoted -> {
                    values += current.toString()
                    current.clear()
                }
                else -> current.append(character)
            }
            index++
        }
        values += current.toString()
        return values
    }

    private val TransactionType.storageValue: String
        get() = when (this) {
            TransactionType.INCOME -> "income"
            TransactionType.EXPENSE -> "expense"
        }
}
