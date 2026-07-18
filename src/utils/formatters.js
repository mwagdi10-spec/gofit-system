export const dateFromLog = log => log.completedAt?.toDate?.() || null;

export const formatDateShort = date => date ? date.toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—';

export const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());


export function getMuscleGroup(exerciseName = '') {

  const n = exerciseName.toLowerCase();

  if (/bench|chest|fly|pec|push.?up|dip/i.test(n))                              return 'Chest';

  if (/row|pull|lat|deadlift|back|chin/i.test(n))                               return 'Back';

  if (/squat|leg press|lunge|quad|hamstring|romanian|rdl|nordic|leg extension|leg curl/i.test(n)) return 'Upper Legs';

  if (/calf|calves/i.test(n))                                                   return 'Lower Legs';

  if (/glute|hip thrust|bridge|kickback/i.test(n))                              return 'Glutes';

  if (/plank|crunch|\bab\b|abs|core|sit.?up|cable crunch|wheel/i.test(n))       return 'Abs';

  if (/shoulder|overhead|press|lateral raise|front raise|face pull/i.test(n))   return 'Shoulders';

  if (/bicep|curl/i.test(n))                                                    return 'Biceps';

  if (/tricep|pushdown|skull.?crusher|kickback.?tricep/i.test(n))               return 'Triceps';

  if (/forearm|wrist curl|grip/i.test(n))                                       return 'Forearms';

  return null;

}


export function getEquipment(exerciseName = '') {

  const n = exerciseName.toLowerCase();

  if (/ez.?curl|ez.?bar/i.test(n))                                    return 'EZ Curl Bar';

  if (/barbell/i.test(n))                                             return 'Barbell';

  if (/dumbbell|\bdb\b/i.test(n))                                     return 'Dumbbell';

  if (/kettlebell|\bkb\b/i.test(n))                                   return 'Kettlebell';

  if (/band/i.test(n))                                                return 'Bands';

  if (/stability ball|exercise ball|swiss ball/i.test(n))             return 'Exercise Ball';

  if (/plate/i.test(n))                                               return 'Weight Plate';

  if (/pull.?up bar|chin.?up bar/i.test(n))                           return 'Pullup Bar';

  if (/treadmill|elliptical|rower|bike|stairmaster|climber/i.test(n)) return 'Cardio Machine';

  if (/machine|cable|smith/i.test(n))                                 return 'Strength Machine';

  if (/\bbench\b/i.test(n))                                           return 'Bench';

  return null;

}


export function getExerciseMuscle(exercise = {}) {

  return exercise.muscleGroup || getMuscleGroup(exercise.name) || 'Other';

}


export function getExerciseEquipment(exercise = {}) {

  return exercise.equipment || getEquipment(exercise.name) || 'Body Weight';

}


export function titleCase(str = '') {

  return str.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w/g, c => c.toLowerCase());

}



// ─── Format exercise name ─────────────────────────────────────────────────────

export function formatName(raw = '') {

  if (!raw) return '';

  const hasDumbbell = /dumbbell/i.test(raw);

  const hasBarbell  = /barbell/i.test(raw);

  const hasCable    = /cable/i.test(raw);

  const isBW = /push.?up|pull.?up|\bdip\b|plank|crunch|sit.?up|burpee|mountain climber|jumping jack/i.test(raw)

    && !hasDumbbell && !hasBarbell && !/cable|machine/i.test(raw);

  let name = raw.replace(/dumbbell\s*/gi,'').replace(/barbell\s*/gi,'').replace(/\s+/g,' ').trim();

  const cap = titleCase(name);

  if (hasDumbbell) return `${cap} (DB)`;

  if (hasBarbell)  return `${cap} (Barbell)`;

  if (hasCable)    return `${cap} (Cable)`;

  if (isBW)        return `${cap} (BW)`;

  return cap;

}



export function splitTextByLinks(text = '') {

  const parts = [];

  const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

  let lastIndex = 0;

  String(text).replace(linkRegex, (match, _unused, offset) => {

    if (offset > lastIndex) parts.push({ type: 'text', value: String(text).slice(lastIndex, offset) });

    parts.push({ type: 'link', value: match });

    lastIndex = offset + match.length;

    return match;

  });

  if (lastIndex < String(text).length) parts.push({ type: 'text', value: String(text).slice(lastIndex) });

  return parts;

}
export function getExerciseLink(exercise = {}) {
  return exercise.link || exercise.url || exercise.videoUrl || exercise.gifUrl || '';
}

export function normalizeHref(url = '') {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
}
