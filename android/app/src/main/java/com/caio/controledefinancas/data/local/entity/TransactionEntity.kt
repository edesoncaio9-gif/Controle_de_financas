package com.caio.controledefinancas.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "transactions")
data class TransactionEntity(
    @PrimaryKey val id: String,
    val type: String,
    val amountInCents: Long,
    val date: String,
    val category: String,
    val note: String,
)
