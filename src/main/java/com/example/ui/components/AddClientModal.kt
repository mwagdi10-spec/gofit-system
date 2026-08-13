package com.example.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.ClientEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddClientModal(
    onDismiss: () -> Unit,
    onAddClient: (ClientEntity) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("+966 5") }
    var fitnessLevel by remember { mutableStateOf("متوسط") }
    var goal by remember { mutableStateOf("بناء عضلات وحرق الدهون") }
    var weight by remember { mutableStateOf("80.0") }
    var targetWeight by remember { mutableStateOf("75.0") }
    var expiryDate by remember { mutableStateOf("2026-09-30") }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color.Black.copy(alpha = 0.65f)
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
                    Text("إضافة متدرب جديد وتخصيص الأهداف 🏋️‍♂️", fontSize = 18.sp, fontWeight = FontWeight.Bold)

                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("اسم المتدرب الثلاثي") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = { Text("رقم الجوال") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Text("مستوى اللياقة البدنية الحالي", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("مبتدئ", "متوسط", "متقدم").forEach { level ->
                            FilterChip(
                                selected = fitnessLevel == level,
                                onClick = { fitnessLevel = level },
                                label = { Text(level) }
                            )
                        }
                    }

                    OutlinedTextField(
                        value = goal,
                        onValueChange = { goal = it },
                        label = { Text("الهدف البدني الرئيسي (تخصيص الأهداف)") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = weight,
                            onValueChange = { weight = it },
                            label = { Text("الوزن الحالي (كجم)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = targetWeight,
                            onValueChange = { targetWeight = it },
                            label = { Text("الوزن المستهدف") },
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
                                if (name.isNotBlank()) {
                                    onAddClient(
                                        ClientEntity(
                                            name = name,
                                            phone = phone,
                                            fitnessLevel = fitnessLevel,
                                            goal = goal,
                                            status = "نشط",
                                            subscriptionExpiryDate = expiryDate,
                                            weightKg = weight.toDoubleOrNull() ?: 80.0,
                                            targetWeightKg = targetWeight.toDoubleOrNull() ?: 75.0
                                        )
                                    )
                                }
                            }
                        ) {
                            Text("إضافة وحفظ")
                        }
                    }
                }
            }
        }
    }
}
