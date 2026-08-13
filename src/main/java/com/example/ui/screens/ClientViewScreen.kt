package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.WaterDrop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.viewmodel.CoachFitViewModel
import kotlinx.coroutines.delay

@Composable
fun ClientViewScreen(
    viewModel: CoachFitViewModel,
    onOpenVideoPlayer: (String, String) -> Unit
) {
    val client by viewModel.selectedClient.collectAsState()
    val exercises by viewModel.programExercises.collectAsState()
    val logs by viewModel.clientProgressLogs.collectAsState()

    var showLogDialog by remember { mutableStateOf(false) }

    // Rest Timer State
    var timerSeconds by remember { mutableIntStateOf(0) }
    var isTimerRunning by remember { mutableStateOf(false) }

    LaunchedEffect(isTimerRunning, timerSeconds) {
        if (isTimerRunning && timerSeconds > 0) {
            delay(1000)
            timerSeconds--
            if (timerSeconds == 0) {
                isTimerRunning = false
            }
        }
    }

    val lastLog = logs.lastOrNull()
    val completedCount = exercises.count { it.isCompleted }
    val totalCount = exercises.size
    val progressPercent = if (totalCount > 0) (completedCount * 100 / totalCount) else 0

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Welcome Header & AI Performance Button
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.horizontalGradient(
                                listOf(
                                    MaterialTheme.colorScheme.primaryContainer,
                                    MaterialTheme.colorScheme.surface
                                )
                            )
                        )
                        .padding(20.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "أهلاً بك، ${client?.name ?: "المتدرب"} 💪",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "هدفك: ${client?.goal ?: "بناء عضلات"}",
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Medium
                                )
                            }

                            Button(
                                onClick = { viewModel.runAiPerformanceEvaluation() },
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary),
                                modifier = Modifier.testTag("ai_eval_button")
                            ) {
                                Icon(
                                    Icons.Default.AutoAwesome,
                                    contentDescription = null,
                                    modifier = Modifier.size(16.dp),
                                    tint = MaterialTheme.colorScheme.onTertiary
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("تقييم الذكاء الاصطناعي", fontSize = 12.sp, color = MaterialTheme.colorScheme.onTertiary)
                            }
                        }

                        // Progress Bar
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("إنجاز اليوم التدريبي", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                                Text("$progressPercent%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(10.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(progressPercent / 100f)
                                        .height(10.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.primary)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Rest Timer Widget if Active
        if (timerSeconds > 0) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("مؤقت الراحة بين المجموعات ⏱️", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onTertiaryContainer)
                            Text("خذ نفساً عميقاً واستعد المباشرة", fontSize = 12.sp, color = MaterialTheme.colorScheme.onTertiaryContainer)
                        }
                        Text(
                            text = "${timerSeconds}s",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.tertiary
                        )
                    }
                }
            }
        }

        // Health Sync Metrics Row (Steps, Calories, Water, Heart Rate)
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "مؤشرات الصحة واللياقة (Health Sync 🟢)",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Button(
                        onClick = { showLogDialog = true },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("تسجيل جديد", fontSize = 12.sp)
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    HealthMetricChip(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.DirectionsRun,
                        iconTint = MaterialTheme.colorScheme.primary,
                        title = "الخطوات",
                        value = "${lastLog?.steps ?: 10200}"
                    )
                    HealthMetricChip(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.LocalFireDepartment,
                        iconTint = Color(0xFFFF6D00),
                        title = "الحرارية",
                        value = "${lastLog?.caloriesBurned ?: 2550} سعرة"
                    )
                    HealthMetricChip(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.WaterDrop,
                        iconTint = Color(0xFF00E5FF),
                        title = "الماء",
                        value = "${lastLog?.waterIntakeLiters ?: 3.0} لتر"
                    )
                }
            }
        }

        // Exercise Checklist Header
        item {
            Text(
                text = "جدول تمارين اليوم المخصص",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        }

        // Exercise Items Checklist
        items(exercises) { exercise ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (exercise.isCompleted)
                        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                    else
                        MaterialTheme.colorScheme.surface
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = {
                            viewModel.toggleExerciseCompleted(exercise)
                            if (!exercise.isCompleted) {
                                // Start Rest Timer
                                timerSeconds = exercise.restSeconds
                                isTimerRunning = true
                            }
                        }) {
                            Icon(
                                imageVector = if (exercise.isCompleted) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                                contentDescription = "إكمال التماثل",
                                tint = if (exercise.isCompleted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Column {
                            Text(
                                text = exercise.title,
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "${exercise.sets} مجموعات × ${exercise.reps} تكرار (${exercise.weightKg} كجم)",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    if (exercise.videoUrl.isNotBlank()) {
                        IconButton(
                            onClick = { onOpenVideoPlayer(exercise.title, exercise.videoUrl) },
                            modifier = Modifier
                                .background(MaterialTheme.colorScheme.secondary.copy(alpha = 0.15f), CircleShape)
                                .size(36.dp)
                        ) {
                            Icon(
                                Icons.Default.PlayCircle,
                                contentDescription = "شرح بالفيديو",
                                tint = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    if (showLogDialog) {
        LogHealthDataModal(
            onDismiss = { showLogDialog = false },
            onSave = { weight, fat, muscle, calories, steps, water ->
                viewModel.logDailyProgress(weight, fat, muscle, calories, steps, water)
                showLogDialog = false
            }
        )
    }
}

@Composable
fun HealthMetricChip(
    modifier: Modifier = Modifier,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconTint: Color,
    title: String,
    value: String
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = title, tint = iconTint, modifier = Modifier.size(20.dp))
            Text(title, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        }
    }
}

@Composable
fun LogHealthDataModal(
    onDismiss: () -> Unit,
    onSave: (Double, Double, Double, Int, Int, Double) -> Unit
) {
    var weight by remember { mutableStateOf("82.0") }
    var bodyFat by remember { mutableStateOf("19.5") }
    var muscleMass by remember { mutableStateOf("39.2") }
    var calories by remember { mutableStateOf("2600") }
    var steps by remember { mutableStateOf("10500") }
    var water by remember { mutableStateOf("3.5") }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color.Black.copy(alpha = 0.6f)
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(16.dp)) {
            Card(
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("تسجيل مؤشرات اليوم الصحة واللياقة", fontSize = 18.sp, fontWeight = FontWeight.Bold)

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = weight,
                            onValueChange = { weight = it },
                            label = { Text("الوزن (كجم)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = bodyFat,
                            onValueChange = { bodyFat = it },
                            label = { Text("نسبة الدهون %") },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = muscleMass,
                            onValueChange = { muscleMass = it },
                            label = { Text("الكتلة العضلية") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = calories,
                            onValueChange = { calories = it },
                            label = { Text("السعرات المحروقة") },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = steps,
                            onValueChange = { steps = it },
                            label = { Text("عدد الخطوات") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = water,
                            onValueChange = { water = it },
                            label = { Text("الماء (لتر)") },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        Button(onClick = onDismiss, colors = ButtonDefaults.buttonColors(containerColor = Color.Gray)) {
                            Text("إلغاء")
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                onSave(
                                    weight.toDoubleOrNull() ?: 82.0,
                                    bodyFat.toDoubleOrNull() ?: 19.5,
                                    muscleMass.toDoubleOrNull() ?: 39.2,
                                    calories.toIntOrNull() ?: 2600,
                                    steps.toIntOrNull() ?: 10500,
                                    water.toDoubleOrNull() ?: 3.5
                                )
                            }
                        ) {
                            Text("حفظ المؤشرات")
                        }
                    }
                }
            }
        }
    }
}
