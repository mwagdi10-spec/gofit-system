package com.example.data

import kotlinx.coroutines.flow.Flow

class CoachFitRepository(private val dao: CoachFitDao) {

    val allClients: Flow<List<ClientEntity>> = dao.getAllClients()
    val allPrograms: Flow<List<WorkoutProgramEntity>> = dao.getAllPrograms()
    val allExercises: Flow<List<ExerciseEntity>> = dao.getAllExercises()
    val allSubscriptions: Flow<List<SubscriptionEntity>> = dao.getAllSubscriptions()

    suspend fun getClientById(id: Long): ClientEntity? = dao.getClientById(id)
    suspend fun insertClient(client: ClientEntity): Long = dao.insertClient(client)
    suspend fun updateClient(client: ClientEntity) = dao.updateClient(client)
    suspend fun deleteClient(client: ClientEntity) = dao.deleteClient(client)

    fun getProgramsForClient(clientId: Long): Flow<List<WorkoutProgramEntity>> =
        dao.getProgramsForClient(clientId)

    suspend fun insertProgram(program: WorkoutProgramEntity): Long =
        dao.insertProgram(program)

    suspend fun deleteProgram(program: WorkoutProgramEntity) = dao.deleteProgram(program)

    fun getExercisesForProgram(programId: Long): Flow<List<ExerciseEntity>> =
        dao.getExercisesForProgram(programId)

    suspend fun insertExercise(exercise: ExerciseEntity): Long =
        dao.insertExercise(exercise)

    suspend fun updateExercise(exercise: ExerciseEntity) = dao.updateExercise(exercise)

    suspend fun setExerciseCompleted(id: Long, isCompleted: Boolean) =
        dao.setExerciseCompleted(id, isCompleted)

    suspend fun deleteExercise(exercise: ExerciseEntity) = dao.deleteExercise(exercise)

    fun getProgressLogsForClient(clientId: Long): Flow<List<ProgressLogEntity>> =
        dao.getProgressLogsForClient(clientId)

    suspend fun insertProgressLog(log: ProgressLogEntity): Long =
        dao.insertProgressLog(log)

    fun getChatMessagesForClient(clientId: Long): Flow<List<ChatMessageEntity>> =
        dao.getChatMessagesForClient(clientId)

    suspend fun insertChatMessage(message: ChatMessageEntity): Long =
        dao.insertChatMessage(message)

    fun getSubscriptionsForClient(clientId: Long): Flow<List<SubscriptionEntity>> =
        dao.getSubscriptionsForClient(clientId)

    suspend fun insertSubscription(subscription: SubscriptionEntity): Long =
        dao.insertSubscription(subscription)

    fun getRemindersForClient(clientId: Long): Flow<List<ReminderEntity>> =
        dao.getRemindersForClient(clientId)

    suspend fun insertReminder(reminder: ReminderEntity): Long =
        dao.insertReminder(reminder)

    suspend fun updateReminder(reminder: ReminderEntity) = dao.updateReminder(reminder)

    fun getWeeklyReportsForClient(clientId: Long): Flow<List<WeeklyReportEntity>> =
        dao.getWeeklyReportsForClient(clientId)

    suspend fun insertWeeklyReport(report: WeeklyReportEntity): Long =
        dao.insertWeeklyReport(report)
}
