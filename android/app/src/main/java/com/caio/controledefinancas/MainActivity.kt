package com.caio.controledefinancas

import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenu
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.compose.material3.HorizontalDivider
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.caio.controledefinancas.data.local.database.DatabaseProvider
import com.caio.controledefinancas.data.repository.TransactionRepository
import com.caio.controledefinancas.domain.model.FinancialTransaction
import com.caio.controledefinancas.domain.model.DefaultCategories
import com.caio.controledefinancas.domain.model.TransactionType
import com.caio.controledefinancas.ui.theme.ControleDeFinancasTheme
import com.caio.controledefinancas.viewmodel.FinanceViewModel
import com.caio.controledefinancas.viewmodel.FinanceViewModelFactory
import java.text.NumberFormat
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.Locale

class MainActivity : ComponentActivity() {
    private val financeViewModel: FinanceViewModel by viewModels {
        FinanceViewModelFactory(TransactionRepository(DatabaseProvider.get(applicationContext).transactionDao()))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { ControleDeFinancasApp(financeViewModel) }
    }
}

@Composable
private fun ControleDeFinancasApp(financeViewModel: FinanceViewModel = viewModel()) {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route ?: Screen.Dashboard.route

    ControleDeFinancasTheme {
        Scaffold(
            topBar = { TopAppBar(title = { Text("Controle de Finanças") }) },
            bottomBar = {
                NavigationBar {
                    Screen.entries.forEach { screen ->
                        NavigationBarItem(
                            selected = currentRoute == screen.route,
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(Screen.Dashboard.route)
                                    launchSingleTop = true
                                }
                            },
                            icon = { Icon(screen.icon, contentDescription = screen.label) },
                            label = { Text(screen.label) },
                        )
                    }
                }
            },
        ) { paddingValues ->
            NavHost(
                navController = navController,
                startDestination = Screen.Dashboard.route,
                modifier = Modifier.padding(paddingValues),
            ) {
                composable(Screen.Dashboard.route) {
                    DashboardScreen(financeViewModel) { navController.navigate("transaction/new") }
                }
                composable(Screen.Transactions.route) {
                    TransactionsScreen(
                        viewModel = financeViewModel,
                        onAdd = { navController.navigate("transaction/new") },
                        onEdit = { id -> navController.navigate("transaction/$id") },
                    )
                }
                composable("transaction/new") {
                    TransactionFormScreen(financeViewModel, null, navController::navigateUp)
                }
                composable("transaction/{id}") { entry ->
                    val id = entry.arguments?.getString("id")
                    val transaction = financeViewModel.uiState.value.transactions.firstOrNull { it.id == id }
                    TransactionFormScreen(financeViewModel, transaction, navController::navigateUp)
                }
                composable(Screen.Reports.route) {
                    ReportsScreen(financeViewModel)
                }
                composable(Screen.Settings.route) {
                    SettingsScreen(financeViewModel)
                }
            }
        }
    }
}

private enum class Screen(
    val route: String,
    val label: String,
    val icon: androidx.compose.ui.graphics.vector.ImageVector,
) {
    Dashboard("dashboard", "Início", Icons.Default.Home),
    Transactions("transactions", "Movimentações", Icons.Default.SwapVert),
    Reports("reports", "Relatórios", Icons.Default.Assessment),
    Settings("settings", "Configurações", Icons.Default.Settings),
}

@Composable
private fun DashboardScreen(viewModel: FinanceViewModel, onAdd: () -> Unit) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    Scaffold(
        floatingActionButton = {
            FloatingActionButton(onClick = onAdd) {
                Icon(Icons.Default.Add, contentDescription = "Adicionar movimentação")
            }
        },
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { Text("Resumo de ${state.monthLabel}", style = MaterialTheme.typography.headlineSmall) }
            item { SummaryCard("Saldo", state.balanceInCents, MaterialTheme.colorScheme.primary) }
            item {
                Row(modifier = Modifier.fillMaxWidth()) {
                    SummaryCard("Receitas", state.incomeInCents, Color(0xFF247A52), Modifier.weight(1f))
                    Spacer(Modifier.width(12.dp))
                    SummaryCard("Despesas", state.expenseInCents, MaterialTheme.colorScheme.error, Modifier.weight(1f))
                }
            }
            item { Text("Movimentações recentes", style = MaterialTheme.typography.titleLarge) }
            items(state.transactions.take(5), key = { it.id }) { transaction -> TransactionRow(transaction) }
            if (state.transactions.isEmpty()) {
                item { Text("Nenhuma movimentação cadastrada.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
            }
        }
    }
}

@Composable
private fun TransactionsScreen(viewModel: FinanceViewModel, onAdd: () -> Unit, onEdit: (String) -> Unit) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    var search by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Todas") }
    var fromDate by remember { mutableStateOf("") }
    var toDate by remember { mutableStateOf("") }
    var categoryMenuExpanded by remember { mutableStateOf(false) }
    val filteredTransactions = state.transactions.filter { transaction ->
        val normalizedSearch = search.trim().lowercase()
        val matchesSearch = normalizedSearch.isBlank() ||
            transaction.category.lowercase().contains(normalizedSearch) ||
            transaction.note.lowercase().contains(normalizedSearch)
        val matchesCategory = category == "Todas" || transaction.category == category
        val matchesFrom = fromDate.isBlank() || transaction.date >= fromDate
        val matchesTo = toDate.isBlank() || transaction.date <= toDate
        matchesSearch && matchesCategory && matchesFrom && matchesTo
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text("Movimentações", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                OutlinedButton(onClick = onAdd) { Text("Adicionar") }
            }
        }
        item {
            OutlinedTextField(
                value = search,
                onValueChange = { search = it },
                label = { Text("Buscar por categoria ou descrição") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
        }
        item {
            ExposedDropdownMenuBox(
                expanded = categoryMenuExpanded,
                onExpandedChange = { categoryMenuExpanded = !categoryMenuExpanded },
            ) {
                OutlinedTextField(
                    value = category,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Categoria") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(categoryMenuExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                )
                ExposedDropdownMenu(
                    expanded = categoryMenuExpanded,
                    onDismissRequest = { categoryMenuExpanded = false },
                ) {
                    (listOf("Todas") + DefaultCategories.values).forEach { option ->
                        DropdownMenuItem(
                            text = { Text(option) },
                            onClick = {
                                category = option
                                categoryMenuExpanded = false
                            },
                        )
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = fromDate,
                    onValueChange = { fromDate = it },
                    label = { Text("Data inicial (AAAA-MM-DD)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
                OutlinedTextField(
                    value = toDate,
                    onValueChange = { toDate = it },
                    label = { Text("Data final (AAAA-MM-DD)") },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                )
            }
        }
        items(filteredTransactions, key = { it.id }) { transaction ->
            TransactionRow(transaction) { onEdit(transaction.id) }
        }
        if (filteredTransactions.isEmpty()) {
            item {
                Text(
                    if (state.transactions.isEmpty()) "Nenhuma movimentação cadastrada." else "Nenhuma movimentação corresponde aos filtros.",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun SummaryCard(label: String, amountInCents: Long, accent: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(containerColor = accent.copy(alpha = 0.12f))) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(6.dp))
            Text(formatCurrency(amountInCents), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = accent)
        }
    }
}

@Composable
private fun TransactionRow(transaction: FinancialTransaction, onClick: () -> Unit = {}) {
    val isIncome = transaction.type == TransactionType.INCOME
    Card(modifier = Modifier.fillMaxWidth().clickable(onClick = onClick)) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(transaction.category.ifBlank { "Sem categoria" }, fontWeight = FontWeight.SemiBold)
                Text(transaction.note.ifBlank { transaction.date }, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(
                text = (if (isIncome) "+" else "-") + formatCurrency(transaction.amountInCents),
                color = if (isIncome) Color(0xFF247A52) else MaterialTheme.colorScheme.error,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun ReportsScreen(viewModel: FinanceViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val expensesByCategory = state.transactions
        .filter { it.type == TransactionType.EXPENSE }
        .groupBy { it.category.ifBlank { "Sem categoria" } }
        .mapValues { (_, transactions) -> transactions.sumOf { it.amountInCents } }
        .toList()
        .sortedByDescending { it.second }
    val maxExpense = expensesByCategory.maxOfOrNull { it.second } ?: 0L

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item { Text("Relatórios", style = MaterialTheme.typography.headlineSmall) }
        item { SummaryCard("Despesas no período", state.expenseInCents, MaterialTheme.colorScheme.error) }
        item { Text("Despesas por categoria", style = MaterialTheme.typography.titleLarge) }
        if (expensesByCategory.isEmpty()) {
            item { Text("Ainda não há despesas para analisar.", color = MaterialTheme.colorScheme.onSurfaceVariant) }
        } else {
            items(expensesByCategory, key = { it.first }) { (category, amount) ->
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(modifier = Modifier.fillMaxWidth()) {
                        Text(category, modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                        Text(formatCurrency(amount))
                    }
                    LinearProgressIndicator(
                        progress = { if (maxExpense == 0L) 0f else amount.toFloat() / maxExpense.toFloat() },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(viewModel: FinanceViewModel) {
    val context = LocalContext.current
    var status by remember { mutableStateOf<String?>(null) }
    val exportLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.CreateDocument("text/csv"),
    ) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { writer ->
            writer.write(viewModel.exportCsv())
        }
        status = "Backup exportado com sucesso."
    }
    val importLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        val csv = context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() }
        if (csv == null) {
            status = "Não foi possível ler o arquivo."
        } else {
            viewModel.importCsv(csv) { count -> status = "$count movimentação(ões) importada(s)." }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Configurações", style = MaterialTheme.typography.headlineSmall)
        Text("Dados locais", style = MaterialTheme.typography.titleLarge)
        Text("Faça backup das suas movimentações ou restaure um CSV exportado anteriormente.")
        HorizontalDivider()
        OutlinedButton(onClick = { exportLauncher.launch("transactions.csv") }, modifier = Modifier.fillMaxWidth()) {
            Text("Exportar CSV")
        }
        OutlinedButton(onClick = { importLauncher.launch("text/csv") }, modifier = Modifier.fillMaxWidth()) {
            Text("Importar CSV")
        }
        if (status != null) Text(status!!, color = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.weight(1f))
        Text("O tema escuro acompanha a configuração de aparência do sistema.", color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TransactionFormScreen(viewModel: FinanceViewModel, transaction: FinancialTransaction?, onFinished: () -> Unit) {
    var type by remember(transaction?.id) { mutableStateOf(transaction?.type ?: TransactionType.EXPENSE) }
    var amount by remember(transaction?.id) {
        mutableStateOf(transaction?.amountInCents?.let { "%.2f".format(Locale.US, it / 100.0) } ?: "")
    }
    var date by remember(transaction?.id) { mutableStateOf(transaction?.date ?: LocalDate.now().toString()) }
    var category by remember(transaction?.id) { mutableStateOf(transaction?.category ?: "") }
    var note by remember(transaction?.id) { mutableStateOf(transaction?.note ?: "") }
    var error by remember { mutableStateOf<String?>(null) }
    var showDatePicker by remember { mutableStateOf(false) }

    Scaffold(topBar = { TopAppBar(title = { Text(if (transaction == null) "Nova movimentação" else "Editar movimentação") }) }) { paddingValues ->
        Column(
            modifier = Modifier.fillMaxSize().padding(paddingValues).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("Tipo", style = MaterialTheme.typography.labelLarge)
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                TransactionType.entries.forEachIndexed { index, option ->
                    SegmentedButton(
                        selected = type == option,
                        onClick = { type = option },
                        shape = SegmentedButtonDefaults.itemShape(index, TransactionType.entries.size),
                        icon = {},
                    ) { Text(if (option == TransactionType.INCOME) "Receita" else "Despesa") }
                }
            }
            OutlinedTextField(amount, { amount = it }, label = { Text("Valor") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(
                value = date,
                onValueChange = {},
                label = { Text("Data") },
                modifier = Modifier.fillMaxWidth().clickable { showDatePicker = true },
                readOnly = true,
                singleLine = true,
            )
            OutlinedTextField(category, { category = it }, label = { Text("Categoria") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(note, { note = it }, label = { Text("Descrição") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            if (error != null) Text(error!!, color = MaterialTheme.colorScheme.error)
            Spacer(Modifier.weight(1f))
            if (transaction != null) {
                TextButton(
                    onClick = {
                        viewModel.deleteTransaction(transaction)
                        onFinished()
                    },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Excluir movimentação", color = MaterialTheme.colorScheme.error) }
            }
            TextButton(onClick = onFinished, modifier = Modifier.fillMaxWidth()) { Text("Cancelar") }
            Button(
                onClick = {
                    viewModel.saveTransaction(transaction?.id, type, amount, date, category, note) { result ->
                        error = result
                        if (result == null) onFinished()
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Salvar movimentação") }
        }
    }

    if (showDatePicker) {
        val selectedDate = runCatching { LocalDate.parse(date) }.getOrDefault(LocalDate.now())
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = selectedDate.atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli(),
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        date = java.time.Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString()
                    }
                    showDatePicker = false
                }) { Text("Concluir") }
            },
        ) { DatePicker(state = datePickerState) }
    }
}

@Composable
private fun PlaceholderScreen(title: String, message: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(title, style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(8.dp))
            Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun formatCurrency(amountInCents: Long): String = NumberFormat.getCurrencyInstance(Locale("pt", "BR")).format(amountInCents / 100.0)

@Preview(showBackground = true)
@Composable
private fun ControleDeFinancasPreview() {
    ControleDeFinancasApp()
}
