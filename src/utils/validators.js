// ─── Email Validators ────────────────────────────────────────────────────────
export const isValidEmail = (email = '') => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ─── Phone Validators ────────────────────────────────────────────────────────
export const isValidPhone = (phone = '') => {
  // Accept any format with at least 7 digits
  const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
  return phoneRegex.test(phone.trim());
};

// ─── Exercise Validators ─────────────────────────────────────────────────────
export const isValidExercise = (exercise = {}) => {
  if (!exercise.name || !exercise.name.trim()) return false;
  if (!exercise.category) return false;
  return true;
};

export const isValidExerciseName = (name = '') => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

// ─── Workout Validators ──────────────────────────────────────────────────────
export const isValidWorkout = (workout = {}) => {
  if (!isValidExerciseName(workout.name)) return false;
  if (!workout.category) return false;
  if (!Number(workout.sets) || Number(workout.sets) < 1) return false;
  return true;
};

export const isValidSets = (sets) => {
  const num = parseInt(sets);
  return !isNaN(num) && num >= 1 && num <= 10;
};

export const isValidReps = (reps = '') => {
  if (!reps.trim()) return true; // Optional
  // Allow formats like "10", "8-12", "AMRAP", "30-45s"
  return reps.trim().length >= 1 && reps.trim().length <= 20;
};

export const isValidTempo = (tempo = '') => {
  if (!tempo.trim()) return true; // Optional
  // Allow formats like "2-0-2", "slow", "explosive"
  return tempo.trim().length >= 1 && tempo.trim().length <= 20;
};

export const isValidWeight = (weight) => {
  const num = parseFloat(weight);
  return !isNaN(num) && num >= 0 && num <= 1000;
};

export const isValidRPE = (rpe) => {
  const num = parseInt(rpe);
  return !isNaN(num) && num >= 1 && num <= 10;
};

// ─── Client Validators ───────────────────────────────────────────────────────
export const isValidClient = (client = {}) => {
  if (!client.name || !client.name.trim()) return false;
  if (!client.phone || !client.phone.trim()) return false;
  if (!isValidPhone(client.phone)) return false;
  return true;
};

export const isValidClientName = (name = '') => {
  return name.trim().length >= 2 && name.trim().length <= 50;
};

export const isValidAge = (age) => {
  const num = parseInt(age);
  return !isNaN(num) && num >= 13 && num <= 120;
};

export const isValidHeight = (height) => {
  const num = parseInt(height);
  return !isNaN(num) && num >= 100 && num <= 250; // cm
};

export const isValidDaysPerWeek = (days) => {
  const num = parseInt(days);
  return !isNaN(num) && num >= 1 && num <= 7;
};

export const isValidBodyFat = (bf) => {
  const num = parseFloat(bf);
  return !isNaN(num) && num >= 5 && num <= 60;
};

// ─── Alternative Validators ──────────────────────────────────────────────────
export const isValidAlternative = (alt = {}) => {
  return alt.name && alt.name.trim().length > 0;
};

export const hasValidAlternatives = (alternatives = []) => {
  return alternatives.some(alt => isValidAlternative(alt));
};

// ─── Date Validators ────────────────────────────────────────────────────────
export const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date.getTime());
};

export const isToday = (date) => {
  if (!isValidDate(date)) return false;
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isWithinDays = (date, days = 7) => {
  if (!isValidDate(date)) return false;
  const now = new Date();
  const diff = now - date;
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
};

// ─── Form Field Validators ──────────────────────────────────────────────────
export const isValidFormData = (formData = {}, requiredFields = []) => {
  for (const field of requiredFields) {
    const value = formData[field];
    if (value === null || value === undefined || value === '') {
      return false;
    }
  }
  return true;
};

export const validateFormField = (field, value) => {
  const validators = {
    email: isValidEmail,
    phone: isValidPhone,
    name: isValidClientName,
    age: isValidAge,
    height: isValidHeight,
    daysPerWeek: isValidDaysPerWeek,
    weight: isValidWeight,
    rpe: isValidRPE,
    sets: isValidSets,
    reps: isValidReps,
    bodyFat: isValidBodyFat
  };

  const validator = validators[field];
  return validator ? validator(value) : true;
};

// ─── General Validators ──────────────────────────────────────────────────────
export const isNotEmpty = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return !!value;
};

export const hasMaxLength = (value, max) => {
  return String(value).length <= max;
};

export const hasMinLength = (value, min) => {
  return String(value).length >= min;
};

export const isBetween = (value, min, max) => {
  const num = Number(value);
  return !isNaN(num) && num >= min && num <= max;
};
