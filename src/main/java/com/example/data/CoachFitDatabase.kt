package com.example.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(
    entities = [
        ClientEntity::class,
        WorkoutProgramEntity::class,
        ExerciseEntity::class,
        ProgressLogEntity::class,
        ChatMessageEntity::class,
        SubscriptionEntity::class,
        ReminderEntity::class,
        WeeklyReportEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class CoachFitDatabase : RoomDatabase() {
    abstract fun coachFitDao(): CoachFitDao

    companion object {
        @Volatile
        private var INSTANCE: CoachFitDatabase? = null

        fun getDatabase(context: Context): CoachFitDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    CoachFitDatabase::class.java,
                    "coachfit_database"
                )
                .fallbackToDestructiveMigration()
                .addCallback(DatabaseCallback(context))
                .build()
                INSTANCE = instance
                instance
            }
        }

        private class DatabaseCallback(private val context: Context) : RoomDatabase.Callback() {
            override fun onCreate(db: SupportSQLiteDatabase) {
                super.onCreate(db)
                INSTANCE?.let { database ->
                    CoroutineScope(Dispatchers.IO).launch {
                        seedDatabase(database.coachFitDao())
                    }
                }
            }
        }

        suspend fun seedDatabase(dao: CoachFitDao) {
            val c1Id = dao.insertClient(
                ClientEntity(
                    name = "أحمد السعيد",
                    phone = "+966 50 123 4567",
                    fitnessLevel = "متوسط",
                    goal = "بناء عضلات وحرق الدهون",
                    status = "نشط",
                    subscriptionExpiryDate = "2026-09-15",
                    age = 28,
                    weightKg = 82.5,
                    heightCm = 180,
                    targetWeightKg = 78.0
                )
            )

            val c2Id = dao.insertClient(
                ClientEntity(
                    name = "سارة بن خالد",
                    phone = "+966 55 987 6543",
                    fitnessLevel = "مبتدئ",
                    goal = "خسارة وزن وزيادة اللياقة",
                    status = "نشط",
                    subscriptionExpiryDate = "2026-09-01",
                    age = 24,
                    weightKg = 68.0,
                    heightCm = 165,
                    targetWeightKg = 60.0
                )
            )

            val c3Id = dao.insertClient(
                ClientEntity(
                    name = "عمر الفاروق",
                    phone = "+966 54 321 0987",
                    fitnessLevel = "متقدم",
                    goal = "زيادة القوة البدنية",
                    status = "منتهي",
                    subscriptionExpiryDate = "2026-08-10",
                    age = 32,
                    weightKg = 90.0,
                    heightCm = 185,
                    targetWeightKg = 88.0
                )
            )

            val p1Id = dao.insertProgram(
                WorkoutProgramEntity(
                    clientId = c1Id,
                    title = "برنامج التضخيم العضلي المتقدم - 4 أيام",
                    description = "برنامج يركز على التضخيم العضلي مع الحفاظ على نسبة دهون منخفضة",
                    daysPerWeek = 4,
                    difficultyLevel = "متوسط",
                    startDate = "2026-08-01",
                    endDate = "2026-08-31",
                    coachNotes = "يرجى الالتزام بالأوزان وراحة 60 ثانية بين المجموعات"
                )
            )

            dao.insertExercise(
                ExerciseEntity(
                    programId = p1Id,
                    title = "ضغط بنش بالبار (Bench Press)",
                    category = "صدر",
                    sets = 4,
                    reps = 10,
                    weightKg = 70.0,
                    restSeconds = 90,
                    videoUrl = "https://www.youtube.com/watch?v=rT7DgCr-3pg",
                    instructions = "حافظ على استقامة الظهر وشد عضلات البطن أثناء الدفع",
                    isCompleted = true
                )
            )

            dao.insertExercise(
                ExerciseEntity(
                    programId = p1Id,
                    title = "سحب ظهر عالي (Lat Pulldown)",
                    category = "ظهر",
                    sets = 4,
                    reps = 12,
                    weightKg = 60.0,
                    restSeconds = 60,
                    videoUrl = "https://www.youtube.com/watch?v=CAwf7n6Luuc",
                    instructions = "اسحب القبضة نحو أعلى الصدر مع إرجاع الكتفين للخلف",
                    isCompleted = true
                )
            )

            dao.insertExercise(
                ExerciseEntity(
                    programId = p1Id,
                    title = "سكوات بالأثقال (Barbell Squat)",
                    category = "أرجل",
                    sets = 4,
                    reps = 8,
                    weightKg = 85.0,
                    restSeconds = 120,
                    videoUrl = "https://www.youtube.com/watch?v=ultWZbUMPL8",
                    instructions = "انزل حتى تشكل ركبتك زاوية 90 درجة مع دفع الكعبين للأرض",
                    isCompleted = false
                )
            )

            dao.insertExercise(
                ExerciseEntity(
                    programId = p1Id,
                    title = "ضغط أكتاف بالدمبل (Dumbbell Shoulder Press)",
                    category = "أكتاف",
                    sets = 3,
                    reps = 12,
                    weightKg = 22.0,
                    restSeconds = 60,
                    videoUrl = "https://www.youtube.com/watch?v=qEwKCR5JCog",
                    instructions = "ارفع الدمبل لأعلى ببطء واحرص على عدم تحريك الجذع",
                    isCompleted = false
                )
            )

            val logs = listOf(
                ProgressLogEntity(clientId = c1Id, date = "2026-08-01", weightKg = 84.0, bodyFatPercentage = 21.0, muscleMassKg = 38.0, caloriesBurned = 2300, steps = 8500, waterIntakeLiters = 2.5, workoutCompleted = true, notes = "بداية خفيفة"),
                ProgressLogEntity(clientId = c1Id, date = "2026-08-04", weightKg = 83.5, bodyFatPercentage = 20.5, muscleMassKg = 38.3, caloriesBurned = 2550, steps = 10200, waterIntakeLiters = 3.0, workoutCompleted = true, notes = "نشاط ممتاز في التمارين"),
                ProgressLogEntity(clientId = c1Id, date = "2026-08-07", weightKg = 83.0, bodyFatPercentage = 20.1, muscleMassKg = 38.6, caloriesBurned = 2400, steps = 9500, waterIntakeLiters = 3.2, workoutCompleted = true, notes = "تحسن القوة العضلية"),
                ProgressLogEntity(clientId = c1Id, date = "2026-08-10", weightKg = 82.5, bodyFatPercentage = 19.6, muscleMassKg = 39.0, caloriesBurned = 2700, steps = 11000, waterIntakeLiters = 3.5, workoutCompleted = true, notes = "نزول ممتاز للدهون")
            )
            for (log in logs) {
                dao.insertProgressLog(log)
            }

            dao.insertChatMessage(
                ChatMessageEntity(
                    clientId = c1Id,
                    senderRole = "COACH",
                    senderName = "الكوتش محمد",
                    messageText = "مرحباً أحمد! أضفت لك أوزان جديدة لتمرين السكوات اليوم. أخبرني بتطورك.",
                    timestamp = System.currentTimeMillis() - 86400000 * 2
                )
            )

            dao.insertChatMessage(
                ChatMessageEntity(
                    clientId = c1Id,
                    senderRole = "CLIENT",
                    senderName = "أحمد السعيد",
                    messageText = "أهلاً كوتش! أديت التمارين بنجاح وشعرت بضخ عضلي رائع اليوم، شكراً لك!",
                    timestamp = System.currentTimeMillis() - 86400000
                )
            )

            dao.insertSubscription(
                SubscriptionEntity(
                    clientId = c1Id,
                    clientName = "أحمد السعيد",
                    planType = "الباقة الشهرية المباشرة (300 ر.س)",
                    amountSAR = 300.0,
                    paymentDate = "2026-08-15",
                    expiryDate = "2026-09-15",
                    status = "PAID",
                    invoiceNumber = "INV-2026-0801",
                    paymentMethod = "مدى / Visa"
                )
            )

            dao.insertReminder(
                ReminderEntity(
                    clientId = c1Id,
                    title = "موعد التمرين اليومي",
                    message = "حان موعد تدريب الصدر والظهر حسب البرنامج المخصص!",
                    timeOfDay = "17:00",
                    type = "WORKOUT"
                )
            )

            dao.insertReminder(
                ReminderEntity(
                    clientId = c1Id,
                    title = "وجبة ما بعد التمرين",
                    message = "تذكر تناول 40 جرام بروتين مع كربوهيدرات معقدة",
                    timeOfDay = "19:00",
                    type = "MEAL"
                )
            )

            dao.insertReminder(
                ReminderEntity(
                    clientId = c1Id,
                    title = "تذكير شرب الماء",
                    message = "شرب 500 مل ماء للحفاظ على الترطيب والأداء العالي",
                    timeOfDay = "14:00",
                    type = "WATER"
                )
            )

            dao.insertWeeklyReport(
                WeeklyReportEntity(
                    clientId = c1Id,
                    weekStartDate = "2026-08-04",
                    totalWorkoutsDone = 4,
                    adherencePercentage = 95,
                    weightChangeKg = -1.0,
                    aiFeedbackSummary = "أداء ممتاز جداً! التزامك بالتمارين بنسبة 95% أدى إلى نزول 1 كجم من الدهون وزيادة في الكتلة العضلية النظيفة. استمر على هذا المنوال.",
                    generatedDate = "2026-08-11"
                )
            )
        }
    }
}
