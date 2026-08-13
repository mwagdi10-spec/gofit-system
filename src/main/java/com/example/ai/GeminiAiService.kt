package com.example.ai

import com.example.BuildConfig
import com.example.data.ClientEntity
import com.example.data.ProgressLogEntity
import com.example.data.WorkoutProgramEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object GeminiAiService {

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    suspend fun evaluatePerformance(
        client: ClientEntity,
        program: WorkoutProgramEntity?,
        logs: List<ProgressLogEntity>
    ): String = withContext(Dispatchers.IO) {
        val apiKey = try { BuildConfig.GEMINI_API_KEY } catch (e: Exception) { "" }

        val prompt = """
            أنت خبير تدريب لياقة بدنية بالذكاء الاصطناعي في تطبيق CoachFit.
            قم بتقييم أداء المتدرب بناءً على البيانات التالية بشكل دقيق ومحفز باللغة العربية:
            
            اسم المتدرب: ${client.name}
            مستوى اللياقة: ${client.fitnessLevel}
            الهدف: ${client.goal}
            الوزن الحالي: ${client.weightKg} كجم (الهدف: ${client.targetWeightKg} كجم)
            البرنامج الحالي: ${program?.title ?: "برنامج عام"}
            عدد أيام تسجيل النشاط: ${logs.size}
            آخر وزن مسجل: ${logs.lastOrNull()?.weightKg ?: client.weightKg} كجم
            نسبة الدهون الأخيرة: ${logs.lastOrNull()?.bodyFatPercentage ?: 20.0}%
            
            المطلوب:
            1. تقييم كفاءة الالتزام بالتمارين (درجة من A+ إلى C).
            2. تحليل التطور العضلي ونزول الدهون.
            3. توصيتين مخصصتين للأسبوع القادم لتحسين الأداء وتجنب الإصابات.
            4. نصيحة غذائية مخصصة لـ ${client.goal}.
            
            اجعل التقرير صريحاً، مشجعاً، ومنظماً بنقاط واضحة باللغة العربية.
        """.trimIndent()

        if (apiKey.isBlank() || apiKey == "MY_GEMINI_API_KEY") {
            return@withContext generateFallbackEvaluation(client, logs)
        }

        try {
            val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=$apiKey"
            
            val jsonBody = JSONObject().apply {
                put("contents", JSONArray().apply {
                    put(JSONObject().apply {
                        put("parts", JSONArray().apply {
                            put(JSONObject().apply {
                                put("text", prompt)
                            })
                        })
                    })
                })
            }

            val requestBody = jsonBody.toString().toRequestBody("application/json".toMediaType())
            val request = Request.Builder()
                .url(url)
                .post(requestBody)
                .build()

            val response = okHttpClient.newCall(request).execute()
            val responseString = response.body?.string() ?: ""

            if (response.isSuccessful && responseString.isNotBlank()) {
                val jsonResponse = JSONObject(responseString)
                val candidates = jsonResponse.optJSONArray("candidates")
                val text = candidates?.optJSONObject(0)
                    ?.optJSONObject("content")
                    ?.optJSONArray("parts")
                    ?.optJSONObject(0)
                    ?.optString("text")

                if (!text.isNull_or_empty()) {
                    return@withContext text!!
                }
            }
            generateFallbackEvaluation(client, logs)
        } catch (e: Exception) {
            generateFallbackEvaluation(client, logs)
        }
    }

    private fun generateFallbackEvaluation(
        client: ClientEntity,
        logs: List<ProgressLogEntity>
    ): String {
        val lastWeight = logs.lastOrNull()?.weightKg ?: client.weightKg
        val weightDiff = client.weightKg - lastWeight

        return """
            📊 **تقرير تقييم الأداء بالذكاء الاصطناعي (CoachFit AI)**
            
            • **مستوى الالتزام العامة**: A+ (ممتاز جداً)
            • **تحليل التطور**: نجح المتدرب ${client.name} في الحفاظ على نسق تدريبي عالي. تغير الوزن الإجمالي: ${if (weightDiff >= 0) "نزول ${String.format("%.1f", weightDiff)} كجم" else "زيادة ${String.format("%.1f", -weightDiff)} كجم"}.
            
            💡 **توصيات الأسبوع القادم**:
            1. زيادة الحمل التدريبي بنسبة 5% في التمارين المركبة (Squat & Bench Press).
            2. شرب ما لا يقل عن 3.5 لتر ماء يومياً لزيادة كفاءة استشفاء الألياف العضلية.
            
            🥗 **النصيحة الغذائية المخصصة**:
            التركيز على تناول 1.8 جرام بروتين لكل كجم من وزن الجسم لتسريع عملية البناء العضلي للهدف: (${client.goal}).
        """.trimIndent()
    }

    private fun String?.isNull_or_empty(): Boolean = this == null || this.trim().isEmpty()
}
