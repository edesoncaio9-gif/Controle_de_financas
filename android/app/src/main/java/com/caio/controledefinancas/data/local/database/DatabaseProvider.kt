package com.caio.controledefinancas.data.local.database

import android.content.Context
import androidx.room.Room

object DatabaseProvider {
    @Volatile
    private var instance: FinanceDatabase? = null

    fun get(context: Context): FinanceDatabase = instance ?: synchronized(this) {
        instance ?: Room.databaseBuilder(
            context.applicationContext,
            FinanceDatabase::class.java,
            "controle_de_financas.db",
        ).build().also { instance = it }
    }
}
