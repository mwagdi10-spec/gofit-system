package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Analytics
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.LightMode
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.components.AddClientModal
import com.example.ui.components.AiEvaluationModal
import com.example.ui.components.VideoPlayerModal
import com.example.ui.screens.ChatScreen
import com.example.ui.screens.CoachDashboardScreen
import com.example.ui.screens.ClientViewScreen
import com.example.ui.screens.ProgramBuilderScreen
import com.example.ui.screens.ProgressChartsScreen
import com.example.ui.screens.RemindersScreen
import com.example.ui.screens.SubscriptionsScreen
import com.example.ui.theme.CoachFitTheme
import com.example.viewmodel.CoachFitViewModel
import com.example.viewmodel.UserRole

enum class AppTab {
    DASHBOARD, PROGRAMS, PROGRESS, CHAT, PAYMENTS, REMINDERS
}

class MainActivity : ComponentActivity() {

    private val viewModel: CoachFitViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val isDarkMode by viewModel.isDarkMode.collectAsState()

            CoachFitTheme(darkTheme = isDarkMode) {
                // Force Right-to-Left layout for authentic Arabic UI
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    CoachFitAppMain(viewModel)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoachFitAppMain(viewModel: CoachFitViewModel) {
    val currentRole by viewModel.currentRole.collectAsState()
    val isDarkMode by viewModel.isDarkMode.collectAsState()
    val aiEvaluationText by viewModel.aiEvaluationText.collectAsState()
    val isAiLoading by viewModel.isAiLoading.collectAsState()

    var activeTab by remember { mutableStateOf(AppTab.DASHBOARD) }
    var showAddClientModal by remember { mutableStateOf(false) }

    // Video Player State
    var activeVideoTitle by remember { mutableStateOf<String?>(null) }
    var activeVideoUrl by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = MaterialTheme.colorScheme.primary
                        ) {
                            Icon(
                                Icons.Default.FitnessCenter,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onPrimary,
                                modifier = Modifier
                                    .padding(6.dp)
                                    .size(20.dp)
                            )
                        }
                        Text(
                            text = "CoachFit",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                },
                actions = {
                    // Role Switcher Button (الكوتش vs المتدرب)
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .clickable {
                                val nextRole = if (currentRole == UserRole.COACH) UserRole.CLIENT else UserRole.COACH
                                viewModel.setRole(nextRole)
                            }
                            .testTag("role_switch_button"),
                        color = MaterialTheme.colorScheme.primaryContainer
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.SwapHoriz,
                                contentDescription = "تبديل النمط",
                                tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (currentRole == UserRole.COACH) "لوحة المدرب 👨‍🏫" else "واجهة المتدرب 🏋️‍♂️",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    // Dark/Light Theme Toggle
                    IconButton(onClick = { viewModel.toggleDarkMode() }) {
                        Icon(
                            imageVector = if (isDarkMode) Icons.Default.LightMode else Icons.Default.DarkMode,
                            contentDescription = "المظهر",
                            tint = MaterialTheme.colorScheme.onSurface
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    selected = activeTab == AppTab.DASHBOARD,
                    onClick = { activeTab = AppTab.DASHBOARD },
                    icon = { Icon(Icons.Default.Dashboard, contentDescription = "الرئيسية") },
                    label = { Text("الرئيسية", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                    )
                )

                NavigationBarItem(
                    selected = activeTab == AppTab.PROGRAMS,
                    onClick = { activeTab = AppTab.PROGRAMS },
                    icon = { Icon(Icons.Default.FitnessCenter, contentDescription = "البرامج") },
                    label = { Text("البرامج", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                    )
                )

                NavigationBarItem(
                    selected = activeTab == AppTab.PROGRESS,
                    onClick = { activeTab = AppTab.PROGRESS },
                    icon = { Icon(Icons.Default.Analytics, contentDescription = "التقدم") },
                    label = { Text("التقدم", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                    )
                )

                NavigationBarItem(
                    selected = activeTab == AppTab.CHAT,
                    onClick = { activeTab = AppTab.CHAT },
                    icon = { Icon(Icons.Default.Chat, contentDescription = "المحادثة") },
                    label = { Text("المحادثة", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                    )
                )

                NavigationBarItem(
                    selected = activeTab == AppTab.PAYMENTS,
                    onClick = { activeTab = AppTab.PAYMENTS },
                    icon = { Icon(Icons.Default.CreditCard, contentDescription = "الاشتراكات") },
                    label = { Text("الاشتراكات", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                    )
                )

                NavigationBarItem(
                    selected = activeTab == AppTab.REMINDERS,
                    onClick = { activeTab = AppTab.REMINDERS },
                    icon = { Icon(Icons.Default.Notifications, contentDescription = "التنبيهات") },
                    label = { Text("التنبيهات", fontSize = 10.sp) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primaryContainer
                    )
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when (activeTab) {
                AppTab.DASHBOARD -> {
                    if (currentRole == UserRole.COACH) {
                        CoachDashboardScreen(
                            viewModel = viewModel,
                            onNavigateToChat = { activeTab = AppTab.CHAT },
                            onNavigateToProgram = { activeTab = AppTab.PROGRAMS },
                            onNavigateToProgress = { activeTab = AppTab.PROGRESS },
                            onOpenAddClientDialog = { showAddClientModal = true }
                        )
                    } else {
                        ClientViewScreen(
                            viewModel = viewModel,
                            onOpenVideoPlayer = { title, url ->
                                activeVideoTitle = title
                                activeVideoUrl = url
                            }
                        )
                    }
                }

                AppTab.PROGRAMS -> {
                    ProgramBuilderScreen(
                        viewModel = viewModel,
                        onOpenVideoPlayer = { title, url ->
                            activeVideoTitle = title
                            activeVideoUrl = url
                        }
                    )
                }

                AppTab.PROGRESS -> {
                    ProgressChartsScreen(viewModel = viewModel)
                }

                AppTab.CHAT -> {
                    ChatScreen(viewModel = viewModel)
                }

                AppTab.PAYMENTS -> {
                    SubscriptionsScreen(viewModel = viewModel)
                }

                AppTab.REMINDERS -> {
                    RemindersScreen(viewModel = viewModel)
                }
            }
        }
    }

    // AI Evaluation Result Modal
    AiEvaluationModal(
        isLoading = isAiLoading,
        evaluationText = aiEvaluationText,
        onDismiss = { viewModel.clearAiEvaluation() }
    )

    // Add Client Modal
    if (showAddClientModal) {
        AddClientModal(
            onDismiss = { showAddClientModal = false },
            onAddClient = { newClient ->
                viewModel.addOrUpdateClient(newClient)
                showAddClientModal = false
            }
        )
    }

    // Video Player Modal
    if (activeVideoTitle != null && activeVideoUrl != null) {
        VideoPlayerModal(
            exerciseTitle = activeVideoTitle!!,
            videoUrl = activeVideoUrl!!,
            onDismiss = {
                activeVideoTitle = null
                activeVideoUrl = null
            }
        )
    }
}
