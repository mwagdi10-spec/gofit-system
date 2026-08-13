package com.example.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.ai.GeminiAiService
import com.example.data.ClientEntity
import com.example.data.CoachFitDatabase
import com.example.data.CoachFitRepository
import com.example.data.ExerciseEntity
import com.example.data.ProgressLogEntity
import com.example.data.ReminderEntity
import com.example.data.SubscriptionEntity
import com.example.data.WeeklyReportEntity
import com.example.data.WorkoutProgramEntity
import com.example.data.ChatMessageEntity
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

enum class UserRole {
    COACH, CLIENT
}

class CoachFitViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: CoachFitRepository
    
    init {
        val database = CoachFitDatabase.getDatabase(application)
        repository = CoachFitRepository(database.coachFitDao())
    }

    private val _currentRole = MutableStateFlow(UserRole.COACH)
    val currentRole: StateFlow<UserRole> = _currentRole.asStateFlow()

    private val _selectedClientId = MutableStateFlow<Long?>(1L)
    val selectedClientId: StateFlow<Long?> = _selectedClientId.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _fitnessLevelFilter = MutableStateFlow("الكل")
    val fitnessLevelFilter: StateFlow<String> = _fitnessLevelFilter.asStateFlow()

    private val _isDarkMode = MutableStateFlow(true)
    val isDarkMode: StateFlow<Boolean> = _isDarkMode.asStateFlow()

    private val _aiEvaluationText = MutableStateFlow<String?>(null)
    val aiEvaluationText: StateFlow<String?> = _aiEvaluationText.asStateFlow()

    private val _isAiLoading = MutableStateFlow(false)
    val isAiLoading: StateFlow<Boolean> = _isAiLoading.asStateFlow()

    // Filtered Client list based on search and fitness level
    val filteredClients: StateFlow<List<ClientEntity>> = combine(
        repository.allClients,
        _searchQuery,
        _fitnessLevelFilter
    ) { clients, query, filter ->
        clients.filter { client ->
            val matchesQuery = client.name.contains(query, ignoreCase = true) ||
                    client.goal.contains(query, ignoreCase = true) ||
                    client.phone.contains(query)
            val matchesFilter = if (filter == "الكل") true else client.fitnessLevel == filter
            matchesQuery && matchesFilter
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val selectedClient: StateFlow<ClientEntity?> = _selectedClientId.flatMapLatest { id ->
        if (id == null) flowOf(null)
        else {
            repository.allClients.map { clients ->
                clients.firstOrNull { it.id == id }
            }
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val clientPrograms: StateFlow<List<WorkoutProgramEntity>> = _selectedClientId.flatMapLatest { id ->
        if (id == null) flowOf(emptyList())
        else repository.getProgramsForClient(id)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _selectedProgramId = MutableStateFlow<Long?>(1L)
    val selectedProgramId: StateFlow<Long?> = _selectedProgramId.asStateFlow()

    val programExercises: StateFlow<List<ExerciseEntity>> = _selectedProgramId.flatMapLatest { id ->
        if (id == null) repository.allExercises
        else repository.getExercisesForProgram(id)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val clientProgressLogs: StateFlow<List<ProgressLogEntity>> = _selectedClientId.flatMapLatest { id ->
        if (id == null) flowOf(emptyList())
        else repository.getProgressLogsForClient(id)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val clientChatMessages: StateFlow<List<ChatMessageEntity>> = _selectedClientId.flatMapLatest { id ->
        if (id == null) flowOf(emptyList())
        else repository.getChatMessagesForClient(id)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val clientSubscriptions: StateFlow<List<SubscriptionEntity>> = _selectedClientId.flatMapLatest { id ->
        if (id == null) repository.allSubscriptions
        else repository.getSubscriptionsForClient(id)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val clientReminders: StateFlow<List<ReminderEntity>> = _selectedClientId.flatMapLatest { id ->
        if (id == null) flowOf(emptyList())
        else repository.getRemindersForClient(id)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val clientWeeklyReports: StateFlow<List<WeeklyReportEntity>> = _selectedClientId.flatMapLatest { id ->
        if (id == null) flowOf(emptyList())
        else repository.getWeeklyReportsForClient(id)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setRole(role: UserRole) {
        _currentRole.value = role
    }

    fun toggleDarkMode() {
        _isDarkMode.value = !_isDarkMode.value
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setFitnessLevelFilter(filter: String) {
        _fitnessLevelFilter.value = filter
    }

    fun selectClient(clientId: Long) {
        _selectedClientId.value = clientId
    }

    fun selectProgram(programId: Long) {
        _selectedProgramId.value = programId
    }

    fun addOrUpdateClient(client: ClientEntity) {
        viewModelScope.launch {
            if (client.id == 0L) {
                val newId = repository.insertClient(client)
                _selectedClientId.value = newId
            } else {
                repository.updateClient(client)
            }
        }
    }

    fun addProgram(program: WorkoutProgramEntity, exercises: List<ExerciseEntity>) {
        viewModelScope.launch {
            val programId = repository.insertProgram(program)
            exercises.forEach { exercise ->
                repository.insertExercise(exercise.copy(programId = programId))
            }
            _selectedProgramId.value = programId
        }
    }

    fun toggleExerciseCompleted(exercise: ExerciseEntity) {
        viewModelScope.launch {
            repository.setExerciseCompleted(exercise.id, !exercise.isCompleted)
        }
    }

    fun addExercise(exercise: ExerciseEntity) {
        viewModelScope.launch {
            repository.insertExercise(exercise)
        }
    }

    fun logDailyProgress(weight: Double, fat: Double, muscle: Double, calories: Int, steps: Int, water: Double) {
        val clientId = _selectedClientId.value ?: return
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        viewModelScope.launch {
            repository.insertProgressLog(
                ProgressLogEntity(
                    clientId = clientId,
                    date = dateStr,
                    weightKg = weight,
                    bodyFatPercentage = fat,
                    muscleMassKg = muscle,
                    caloriesBurned = calories,
                    steps = steps,
                    waterIntakeLiters = water,
                    workoutCompleted = true
                )
            )
            // update client's current weight in ClientEntity as well
            selectedClient.value?.let { currentClient ->
                repository.updateClient(currentClient.copy(weightKg = weight))
            }
        }
    }

    fun sendChatMessage(text: String, isCoachSender: Boolean) {
        val clientId = _selectedClientId.value ?: return
        val senderRole = if (isCoachSender) "COACH" else "CLIENT"
        val senderName = if (isCoachSender) "الكوتش" else (selectedClient.value?.name ?: "المتدرب")

        viewModelScope.launch {
            repository.insertChatMessage(
                ChatMessageEntity(
                    clientId = clientId,
                    senderRole = senderRole,
                    senderName = senderName,
                    messageText = text,
                    timestamp = System.currentTimeMillis()
                )
            )

            // Automated simulation reply if sent by Client
            if (!isCoachSender) {
                kotlinx.coroutines.delay(1200)
                repository.insertChatMessage(
                    ChatMessageEntity(
                        clientId = clientId,
                        senderRole = "COACH",
                        senderName = "الكوتش (رد آلي)",
                        messageText = "مرحباً! وصلني استفسارك. جاري مراجعة برنامجك التدريبي والرد عليك في أقرب وقت.",
                        timestamp = System.currentTimeMillis()
                    )
                )
            }
        }
    }

    fun renewSubscription(clientId: Long, planName: String, amountSAR: Double) {
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        val invoiceNo = "INV-" + (1000..9999).random()
        viewModelScope.launch {
            repository.insertSubscription(
                SubscriptionEntity(
                    clientId = clientId,
                    clientName = selectedClient.value?.name ?: "متدرب",
                    planType = planName,
                    amountSAR = amountSAR,
                    paymentDate = dateStr,
                    expiryDate = "2026-10-30",
                    status = "PAID",
                    invoiceNumber = invoiceNo
                )
            )
            selectedClient.value?.let { client ->
                repository.updateClient(client.copy(status = "نشط", subscriptionExpiryDate = "2026-10-30"))
            }
        }
    }

    fun addReminder(reminder: ReminderEntity) {
        viewModelScope.launch {
            repository.insertReminder(reminder)
        }
    }

    fun toggleReminder(reminder: ReminderEntity) {
        viewModelScope.launch {
            repository.updateReminder(reminder.copy(isEnabled = !reminder.isEnabled))
        }
    }

    fun runAiPerformanceEvaluation() {
        val client = selectedClient.value ?: return
        val program = clientPrograms.value.firstOrNull()
        val logs = clientProgressLogs.value

        _isAiLoading.value = true
        _aiEvaluationText.value = null

        viewModelScope.launch {
            val result = GeminiAiService.evaluatePerformance(client, program, logs)
            _aiEvaluationText.value = result
            _isAiLoading.value = false

            // Save report into weekly reports
            val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
            repository.insertWeeklyReport(
                WeeklyReportEntity(
                    clientId = client.id,
                    weekStartDate = dateStr,
                    totalWorkoutsDone = logs.size,
                    adherencePercentage = 92,
                    weightChangeKg = -1.2,
                    aiFeedbackSummary = result,
                    generatedDate = dateStr
                )
            )
        }
    }

    fun clearAiEvaluation() {
        _aiEvaluationText.value = null
    }
}
