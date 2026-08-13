package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.SubscriptionEntity
import com.example.ui.theme.StatusActive
import com.example.viewmodel.CoachFitViewModel

@Composable
fun SubscriptionsScreen(viewModel: CoachFitViewModel) {
    val client by viewModel.selectedClient.collectAsState()
    val subscriptions by viewModel.clientSubscriptions.collectAsState()

    var showPaymentModal by remember { mutableStateOf(false) }
    var selectedPlanName by remember { mutableStateOf("الباقة الشهرية المباشرة") }
    var selectedPlanAmount by remember { mutableStateOf(300.0) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "نظام الاشتراكات والدفع الإلكتروني الآمن 💳",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "تجديد الاشتراكات شهرياً مع صدور فواتير رسمية فورية لـ ${client?.name ?: "المتدرب"}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Plan Options Cards
        item {
            Text("اختر باقة التجديد المناسبة", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }

        item {
            PlanCard(
                title = "الباقة الشهرية المباشرة",
                priceStr = "300 ر.س / شهرياً",
                features = listOf("برنامج تدريبي مخصص شهرياً", "محادثة مباشرة واستشارات", "تقارير أسبوعية بالذكاء الاصطناعي"),
                isSelected = selectedPlanName == "الباقة الشهرية المباشرة",
                onSelect = {
                    selectedPlanName = "الباقة الشهرية المباشرة"
                    selectedPlanAmount = 300.0
                }
            )
        }

        item {
            PlanCard(
                title = "الباقة الثلاثية (3 أشهر)",
                priceStr = "800 ر.س (توفير 100 ر.س)",
                features = listOf("كل مزايا الباقة الشهرية", "متابعة غذائية مخصصة", "أولوية الرد في المحادثة المباشرة"),
                isSelected = selectedPlanName == "الباقة الثلاثية (3 أشهر)",
                onSelect = {
                    selectedPlanName = "الباقة الثلاثية (3 أشهر)"
                    selectedPlanAmount = 800.0
                }
            )
        }

        item {
            Button(
                onClick = { showPaymentModal = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("checkout_button"),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
            ) {
                Icon(Icons.Default.Lock, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("تجديد الاشتراك الآن عبر الدفع الآمن", fontSize = 15.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Subscriptions & Invoices History Header
        item {
            Text("سجل الفواتير والاشتراكات السابقة (${subscriptions.size})", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }

        items(subscriptions) { sub ->
            SubscriptionHistoryCard(sub = sub)
        }

        item {
            Spacer(modifier = Modifier.height(32.dp))
        }
    }

    if (showPaymentModal) {
        SecureCheckoutModal(
            planName = selectedPlanName,
            amountSAR = selectedPlanAmount,
            onDismiss = { showPaymentModal = false },
            onPaymentSuccess = {
                client?.let {
                    viewModel.renewSubscription(it.id, selectedPlanName, selectedPlanAmount)
                }
                showPaymentModal = false
            }
        )
    }
}

@Composable
fun PlanCard(
    title: String,
    priceStr: String,
    features: List<String>,
    isSelected: Boolean,
    onSelect: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSelect() }
            .then(
                if (isSelected)
                    Modifier.border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(20.dp))
                else
                    Modifier
            ),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f) else MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(title, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Text(priceStr, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            }
            features.forEach { feature ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(feature, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
fun SubscriptionHistoryCard(sub: SubscriptionEntity) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(sub.planType, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                Text("رقم الفاتورة: ${sub.invoiceNumber} | تاريخ: ${sub.paymentDate}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("طريقة الدفع: ${sub.paymentMethod}", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
            }

            Column(horizontalAlignment = Alignment.End) {
                Text("${sub.amountSAR.toInt()} ر.س", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = StatusActive.copy(alpha = 0.15f)
                ) {
                    Text("مدفوع 🟢", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = StatusActive, modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                }
            }
        }
    }
}

@Composable
fun SecureCheckoutModal(
    planName: String,
    amountSAR: Double,
    onDismiss: () -> Unit,
    onPaymentSuccess: () -> Unit
) {
    var cardNumber by remember { mutableStateOf("4588 1234 5678 9012") }
    var expiry by remember { mutableStateOf("12/28") }
    var cvc by remember { mutableStateOf("321") }

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
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("بوابة الدفع الإلكتروني الآمنة 🔒", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        Text("${amountSAR.toInt()} ر.س", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    }

                    Text("باقة: $planName", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)

                    OutlinedTextField(
                        value = cardNumber,
                        onValueChange = { cardNumber = it },
                        label = { Text("رقم بطاقة (مدى / Visa / Mastercard)") },
                        leadingIcon = { Icon(Icons.Default.CreditCard, contentDescription = null) },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = expiry,
                            onValueChange = { expiry = it },
                            label = { Text("تاريخ الانتهاء (MM/YY)") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = cvc,
                            onValueChange = { cvc = it },
                            label = { Text("رمز الأمان CVC") },
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Button(
                        onClick = onPaymentSuccess,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .testTag("pay_now_button"),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Text("تأكيد دفع ${amountSAR.toInt()} ر.س وتجديد الاشتراك", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
