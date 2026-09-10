package com.caio.controledefinancas.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.caio.controledefinancas.data.local.dao.TransactionDao
import com.caio.controledefinancas.data.local.entity.TransactionEntity

@Database(
    entities = [TransactionEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class FinanceDatabase : RoomDatabase() {
    abstract fun transactionDao(): TransactionDao
}
