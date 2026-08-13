package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "clients")
data class ClientEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val phone: String,
    val avatarUrl: String = "",
    val fitnessLevel: String, // مبتدئ، متوسط، متقدم
    val goal: String, // خسارة وزن، بناء عضلات، لياقة عامة، زيادة قوة
    val status: String = "نشط", // نشط، معلق، منتهي
    val subscriptionExpiryDate: String,
    val age: Int = 26,
    val weightKg: Double = 75.0,
    val heightCm: Int = 178,
    val targetWeightKg: Double = 70.0
)

@Entity(tableName = "workout_programs")
data class WorkoutProgramEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val clientId: Long,
    val title: String,
    val description: String,
    val daysPerWeek: Int = 4,
    val difficultyLevel: String = "متوسط",
    val startDate: String,
    val endDate: String,
    val coachNotes: String = ""
)

@Entity(tableName = "exercises")
data class ExerciseEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val programId: Long,
    val title: String,
    val category: String, // صدر، ظهر، أرجل، أكتاف، ذراعين، بطن، كارديو
    val sets: Int,
    val reps: Int,
    val weightKg: Double,
    val restSeconds: Int = 60,
    val videoUrl: String = "",
    val instructions: String = "",
    val isCompleted: Boolean = false
)

@Entity(tableName = "progress_logs")
data class ProgressLogEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val clientId: Long,
    val date: String, // YYYY-MM-DD
    val weightKg: Double,
    val bodyFatPercentage: Double,
    val muscleMassKg: Double,
    val caloriesBurned: Int,
    val steps: Int,
    val waterIntakeLiters: Double,
    val workoutCompleted: Boolean,
    val notes: String = ""
)

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val clientId: Long,
    val senderRole: String, // COACH, CLIENT
    val senderName: String,
    val messageText: String,
    val timestamp: Long = System.currentTimeMillis(),
    val isRead: Boolean = true,
    val attachmentUrl: String = ""
)

@Entity(tableName = "subscriptions")
data class SubscriptionEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val clientId: Long,
    val clientName: String,
    val planType: String, // باقة شهرية، باقة 3 أشهر، باقة سنوية
    val amountSAR: Double,
    val paymentDate: String,
    val expiryDate: String,
    val status: String, // PAID, PENDING, EXPIRED
    val invoiceNumber: String,
    val paymentMethod: String = "مدى / فيزا"
)

@Entity(tableName = "reminders")
data class ReminderEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val clientId: Long,
    val title: String,
    val message: String,
    val timeOfDay: String, // HH:mm
    val type: String, // WORKOUT, MEAL, WATER, SUBSCRIPTION
    val isEnabled: Boolean = true
)

@Entity(tableName = "weekly_reports")
data class WeeklyReportEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val clientId: Long,
    val weekStartDate: String,
    val totalWorkoutsDone: Int,
    val adherencePercentage: Int,
    val weightChangeKg: Double,
    val aiFeedbackSummary: String,
    val generatedDate: String
)
