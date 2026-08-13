package com.example.data

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface CoachFitDao {

    // --- CLIENTS ---
    @Query("SELECT * FROM clients ORDER BY name ASC")
    fun getAllClients(): Flow<List<ClientEntity>>

    @Query("SELECT * FROM clients WHERE id = :id LIMIT 1")
    suspend fun getClientById(id: Long): ClientEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClient(client: ClientEntity): Long

    @Update
    suspend fun updateClient(client: ClientEntity)

    @Delete
    suspend fun deleteClient(client: ClientEntity)

    // --- WORKOUT PROGRAMS ---
    @Query("SELECT * FROM workout_programs WHERE clientId = :clientId ORDER BY id DESC")
    fun getProgramsForClient(clientId: Long): Flow<List<WorkoutProgramEntity>>

    @Query("SELECT * FROM workout_programs ORDER BY id DESC")
    fun getAllPrograms(): Flow<List<WorkoutProgramEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProgram(program: WorkoutProgramEntity): Long

    @Delete
    suspend fun deleteProgram(program: WorkoutProgramEntity)

    // --- EXERCISES ---
    @Query("SELECT * FROM exercises WHERE programId = :programId ORDER BY id ASC")
    fun getExercisesForProgram(programId: Long): Flow<List<ExerciseEntity>>

    @Query("SELECT * FROM exercises ORDER BY id ASC")
    fun getAllExercises(): Flow<List<ExerciseEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExercise(exercise: ExerciseEntity): Long

    @Update
    suspend fun updateExercise(exercise: ExerciseEntity)

    @Query("UPDATE exercises SET isCompleted = :isCompleted WHERE id = :id")
    suspend fun setExerciseCompleted(id: Long, isCompleted: Boolean)

    @Delete
    suspend fun deleteExercise(exercise: ExerciseEntity)

    // --- PROGRESS LOGS ---
    @Query("SELECT * FROM progress_logs WHERE clientId = :clientId ORDER BY date ASC")
    fun getProgressLogsForClient(clientId: Long): Flow<List<ProgressLogEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProgressLog(log: ProgressLogEntity): Long

    // --- CHAT MESSAGES ---
    @Query("SELECT * FROM chat_messages WHERE clientId = :clientId ORDER BY timestamp ASC")
    fun getChatMessagesForClient(clientId: Long): Flow<List<ChatMessageEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertChatMessage(message: ChatMessageEntity): Long

    // --- SUBSCRIPTIONS ---
    @Query("SELECT * FROM subscriptions WHERE clientId = :clientId ORDER BY paymentDate DESC")
    fun getSubscriptionsForClient(clientId: Long): Flow<List<SubscriptionEntity>>

    @Query("SELECT * FROM subscriptions ORDER BY paymentDate DESC")
    fun getAllSubscriptions(): Flow<List<SubscriptionEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSubscription(subscription: SubscriptionEntity): Long

    // --- REMINDERS ---
    @Query("SELECT * FROM reminders WHERE clientId = :clientId")
    fun getRemindersForClient(clientId: Long): Flow<List<ReminderEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReminder(reminder: ReminderEntity): Long

    @Update
    suspend fun updateReminder(reminder: ReminderEntity)

    // --- WEEKLY REPORTS ---
    @Query("SELECT * FROM weekly_reports WHERE clientId = :clientId ORDER BY generatedDate DESC")
    fun getWeeklyReportsForClient(clientId: Long): Flow<List<WeeklyReportEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertWeeklyReport(report: WeeklyReportEntity): Long
}
