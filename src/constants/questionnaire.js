export const QUESTIONNAIRE = {
    "formTitle": "استبيان حول أسلوب الحياة والتاريخ الصحي",
    "screens": [
        {
            "screenId": "personal_info",
            "screenTitle": "المعلومات الشخصية للعميل",
            "fields": [
                {
                    "id": "name",
                    "type": "text",
                    "label": "الاسم"
                },
                {
                    "id": "age",
                    "type": "number",
                    "label": "العمر"
                },
                {
                    "id": "date",
                    "type": "date",
                    "label": "التاريخ"
                },
                {
                    "id": "gender",
                    "type": "select",
                    "label": "الجنس",
                    "options": [
                        "ذكر",
                        "أنثى"
                    ]
                },
                {
                    "id": "height",
                    "type": "number",
                    "label": "الطول"
                },
                {
                    "id": "weight",
                    "type": "number",
                    "label": "الوزن"
                },
                {
                    "id": "doctor_contact",
                    "type": "text",
                    "label": "اسم الطبيب ورقم الهاتف"
                },
                {
                    "id": "emergency_contact",
                    "type": "text",
                    "label": "اسم جهة اتصال الطوارئ ورقم الهاتف"
                }
            ]
        },
        {
            "screenId": "exercise",
            "screenTitle": "التمرين",
            "fields": [
                {
                    "id": "current_activities",
                    "type": "textarea",
                    "label": "ما هي الأنشطة الرياضية التي تشارك فيها حاليًا مثل الجري، ورفع الأثقال، والتمارين الجماعية، وما إلى ذلك؟"
                },
                {
                    "id": "mod_exercise_days",
                    "type": "number",
                    "label": "كم يوما في الأسبوع تقضي 60 دقيقة على الأقل في ممارسة التمارين معتدلة الشدة؟",
                    "min": 0,
                    "max": 7
                },
                {
                    "id": "goal_weight_loss",
                    "type": "slider",
                    "label": "مدى أهمية خسارة الوزن",
                    "min": 0,
                    "max": 10
                },
                {
                    "id": "goal_muscle_gain",
                    "type": "slider",
                    "label": "مدى أهمية زيادة حجم العضلات",
                    "min": 0,
                    "max": 10
                },
                {
                    "id": "goal_athletic_performance",
                    "type": "slider",
                    "label": "مدى أهمية مستوى الأداء الرياضي",
                    "min": 0,
                    "max": 10
                },
                {
                    "id": "goal_health_improvement",
                    "type": "slider",
                    "label": "مدى أهمية تحسين الصحة",
                    "min": 0,
                    "max": 10
                }
            ]
        },
        {
            "screenId": "diet",
            "screenTitle": "النظام الغذائي",
            "fields": [
                {
                    "id": "diet_health_rating",
                    "type": "slider",
                    "label": "على مقياس من 0 إلى 10، هل تعتبر نظامك الغذائي العام صحيا؟",
                    "min": 0,
                    "max": 10
                },
                {
                    "id": "current_diet",
                    "type": "textarea",
                    "label": "هل تتبع حاليا أي نوع من أنواع الأنظمة الغذائية؟ إذا كان الأمر كذلك، فما النظام الغذائي الذي تتبعه وما أسباب ذلك؟"
                },
                {
                    "id": "salt_intake",
                    "type": "radio",
                    "label": "كيف تقيم المدخول اليومي الخاص بك من الملح؟",
                    "options": [
                        "منخفض",
                        "متوسط",
                        "مرتفع"
                    ]
                },
                {
                    "id": "sugar_intake",
                    "type": "radio",
                    "label": "كيف تقيم المدخول اليومي الخاص بك من السكر؟",
                    "options": [
                        "منخفض",
                        "متوسط",
                        "مرتفع"
                    ]
                },
                {
                    "id": "fat_intake",
                    "type": "radio",
                    "label": "كيف تقيم المدخول اليومي الخاص بك من الدهون؟",
                    "options": [
                        "منخفض",
                        "متوسط",
                        "مرتفع"
                    ]
                },
                {
                    "id": "junk_food_control",
                    "type": "slider",
                    "label": "على مقياس من 0 إلى 10، ما مدى قدرتك على التحكم بفاعلية في إغراءات تناول الوجبات السريعة؟",
                    "min": 0,
                    "max": 10
                },
                {
                    "id": "alcohol_intake",
                    "type": "number",
                    "label": "كم عدد المشروبات الكحولية التي تستهلكها في الأسبوع؟"
                },
                {
                    "id": "caffeine_intake",
                    "type": "textarea",
                    "label": "هل تستهلك المشروبات التي تحتوي على الكافيين، مثل القهوة، أو الشاي، أو الصودا، أو مشروبات الطاقة أو كلا من ذلك؟ كم عدد مرات استهلاكها في الأسبوع؟"
                }
            ]
        },
        {
            "screenId": "lifestyle_occupation",
            "screenTitle": "أسلوب الحياة والمهنة",
            "fields": [
                {
                    "id": "sleep_quality",
                    "type": "boolean",
                    "label": "هل تشعر أنك تحصل على قسط كاف من النوم وتستيقظ وتشعر بالراحة في كل يوم؟"
                },
                {
                    "id": "stress_level",
                    "type": "slider",
                    "label": "على مقياس من 0 إلى 10 كيف تقيم متوسط مستوى التوتر لديك؟",
                    "min": 0,
                    "max": 10
                },
                {
                    "id": "stress_management",
                    "type": "textarea",
                    "label": "ما الأساليب التي تستخدمها حاليًا للتحكم في مستويات التوتر لديك؟"
                },
                {
                    "id": "smoking",
                    "type": "boolean",
                    "label": "هل تدخن التبغ أو تستخدم المدخن الإلكتروني؟"
                },
                {
                    "id": "occupation",
                    "type": "text",
                    "label": "ما هي مهنتك؟"
                },
                {
                    "id": "prolonged_sitting",
                    "type": "textarea",
                    "label": "هل تتطلب مهنتك الجلوس لفترات طويلة؟ (إذا كانت الإجابة بنعم، فيرجى التوضيح)"
                },
                {
                    "id": "repetitive_motion",
                    "type": "textarea",
                    "label": "هل تتطلب مهنتك الحركة المتكررة؟ (إذا كانت الإجابة بنعم، فيرجى التوضيح)"
                },
                {
                    "id": "heels_worn",
                    "type": "boolean",
                    "label": "هل تتطلب مهنتك ارتداء أحذية بكعب (على سبيل المثال أحذية رسمية، أحذية عمل)؟"
                }
            ]
        },
        {
            "screenId": "recreation_medical",
            "screenTitle": "الترفيه والحالة الطبية",
            "fields": [
                {
                    "id": "recreation_activities",
                    "type": "textarea",
                    "label": "هل تشارك في أي أنشطة بدنية ترفيهية (الجولف، والتزلج، وغيرها)؟ (إذا كانت الإجابة بنعم، فيرجى التوضيح)"
                },
                {
                    "id": "hobbies",
                    "type": "textarea",
                    "label": "هل لديك هوايات إضافية (البستنة، وصيد الأسماك، والموسيقى، وغيرها)؟ (إذا كانت الإجابة بنعم، فيرجى التوضيح)"
                },
                {
                    "id": "past_injuries",
                    "type": "textarea",
                    "label": "يرجى ذكر أي إصابات عضلية هيكلية سابقة:"
                },
                {
                    "id": "past_surgeries",
                    "type": "textarea",
                    "label": "يرجى ذكر أي عمليات جراحية سابقة:"
                },
                {
                    "id": "rehab_clearance",
                    "type": "textarea",
                    "label": "إذا كنت قد تعرضت لإصابات أو عمليات جراحية، فهل تمت إعادة تأهيلك بشكل صحيح، وهل حصلت على تصريح من طبيب للعودة إلى النشاط البدني؟"
                },
                {
                    "id": "chronic_conditions",
                    "type": "textarea",
                    "label": "هل لديك أي حالات صحية مزمنة (مثل، على سبيل المثال لا الحصر، أمراض القلب والأوعية الدموية، واضطرابات الرئة، وارتفاع ضغط الدم، والسكري، والسرطان أو أي من ذلك؟ إذا كانت الإجابة بنعم، فيرجى التوضيح)"
                },
                {
                    "id": "medications_clearance",
                    "type": "textarea",
                    "label": "هل تتناول أي أدوية، وإذا كان الأمر كذلك، فهل حصلت على تصريح من طبيبك للمشاركة في النشاط البدني؟"
                },
                {
                    "id": "additional_notes",
                    "type": "textarea",
                    "label": "ملاحظات إضافية:"
                }
            ]
        }
    ]
};

export const QUESTIONNAIRE_EN = {
    "formTitle": "Lifestyle and Health History Questionnaire",
    "screens": [
        {
            "screenId": "personal_info",
            "screenTitle": "Client Personal Information",
            "fields": [
                { "id": "name", "type": "text", "label": "Name" },
                { "id": "age", "type": "number", "label": "Age" },
                { "id": "date", "type": "date", "label": "Date" },
                { "id": "gender", "type": "select", "label": "Gender", "options": ["Male", "Female"] },
                { "id": "height", "type": "number", "label": "Height" },
                { "id": "weight", "type": "number", "label": "Weight" },
                { "id": "doctor_contact", "type": "text", "label": "Physician Name and Phone #" },
                { "id": "emergency_contact", "type": "text", "label": "Emergency Contact Name and Phone #" }
            ]
        },
        {
            "screenId": "exercise",
            "screenTitle": "Exercise",
            "fields": [
                { "id": "current_activities", "type": "textarea", "label": "What exercise activities do you currently take part in (e.g., running, weightlifting, group exercise, etc.)?" },
                { "id": "mod_exercise_days", "type": "number", "label": "How many days per week do you get at least 60 minutes of moderate-intensity exercise?", "min": 0, "max": 7 },
                { "id": "goal_weight_loss", "type": "slider", "label": "On a scale of 0 to 10, how important is weight loss to you?", "min": 0, "max": 10 },
                { "id": "goal_muscle_gain", "type": "slider", "label": "On a scale of 0 to 10, how important is muscle gain to you?", "min": 0, "max": 10 },
                { "id": "goal_athletic_performance", "type": "slider", "label": "On a scale of 0 to 10, how important is sports performance to you?", "min": 0, "max": 10 },
                { "id": "goal_health_improvement", "type": "slider", "label": "On a scale of 0 to 10, how important is health improvement to you?", "min": 0, "max": 10 }
            ]
        },
        {
            "screenId": "diet",
            "screenTitle": "Diet",
            "fields": [
                { "id": "diet_health_rating", "type": "slider", "label": "On a scale of 0 to 10, do you consider your overall diet to be healthy?", "min": 0, "max": 10 },
                { "id": "current_diet", "type": "textarea", "label": "Are you currently following any kind of diet? If so, what diet and for what reason(s)?" },
                { "id": "salt_intake", "type": "radio", "label": "How would you rank your daily salt intake?", "options": ["Low", "Medium", "High"] },
                { "id": "sugar_intake", "type": "radio", "label": "How would you rank your daily sugar intake?", "options": ["Low", "Medium", "High"] },
                { "id": "fat_intake", "type": "radio", "label": "How would you rank your daily fat intake?", "options": ["Low", "Medium", "High"] },
                { "id": "junk_food_control", "type": "slider", "label": "On a scale of 0 to 10, how effectively are you able to control your temptations for junk food?", "min": 0, "max": 10 },
                { "id": "alcohol_intake", "type": "number", "label": "How many alcoholic drinks do you consume per week?" },
                { "id": "caffeine_intake", "type": "textarea", "label": "Do you consume caffeinated beverages such as coffee, tea, soda, and/or energy drinks? How many per week?" }
            ]
        },
        {
            "screenId": "lifestyle_occupation",
            "screenTitle": "Lifestyle & Occupation",
            "fields": [
                { "id": "sleep_quality", "type": "boolean", "label": "Do you feel like you get enough sleep and wake up feeling rested each day?" },
                { "id": "stress_level", "type": "slider", "label": "On a scale of 0 to 10, how would you rate your average level of stress?", "min": 0, "max": 10 },
                { "id": "stress_management", "type": "textarea", "label": "What techniques do you currently use to manage your stress levels?" },
                { "id": "smoking", "type": "boolean", "label": "Do you smoke tobacco or use a vaporizer alternative?" },
                { "id": "occupation", "type": "text", "label": "What is your occupation?" },
                { "id": "prolonged_sitting", "type": "textarea", "label": "Does your occupation require extended periods of sitting? (If YES, please explain.)" },
                { "id": "repetitive_motion", "type": "textarea", "label": "Does your occupation require repetitive movements? (If YES, please explain.)" },
                { "id": "heels_worn", "type": "boolean", "label": "Does your occupation require you to wear shoes with a heel (e.g., dress shoes, work boots)?" }
            ]
        },
        {
            "screenId": "recreation_medical",
            "screenTitle": "Recreation & Medical",
            "fields": [
                { "id": "recreation_activities", "type": "textarea", "label": "Do you partake in any recreational physical activities (golf, skiing, etc.)? (If YES, please explain.)" },
                { "id": "hobbies", "type": "textarea", "label": "Do you have any additional hobbies (gardening, fishing, music, etc.)? (If YES, please explain.)" },
                { "id": "past_injuries", "type": "textarea", "label": "Please list out any past musculoskeletal injuries:" },
                { "id": "past_surgeries", "type": "textarea", "label": "Please list out any past surgeries:" },
                { "id": "rehab_clearance", "type": "textarea", "label": "If you have experienced injuries or surgeries, were they properly rehabilitated and did you receive clearance from a doctor to return to physical activity?" },
                { "id": "chronic_conditions", "type": "textarea", "label": "Do you have any chronic health conditions (such as, but not limited to, cardiovascular disease, pulmonary disorders, hypertension, diabetes, or cancer)? (If YES, please explain.)" },
                { "id": "medications_clearance", "type": "textarea", "label": "Are you on any medications, and if so, have you received clearance from your doctor to take part in physical activity?" },
                { "id": "additional_notes", "type": "textarea", "label": "Additional Notes" }
            ]
        }
    ]
};
