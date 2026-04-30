export function titleCase(str = '') {
  return str.replace(/\b\w/g, c => c.toUpperCase()).replace(/\B\w/g, c => c.toLowerCase());
}

export function formatName(raw = '') {
  if (!raw) return '';
  const hasDumbbell = /dumbbell/i.test(raw);
  const hasBarbell  = /barbell/i.test(raw);
  const hasCable    = /cable/i.test(raw);
  const isBW = /push.?up|pull.?up|\bdip\b|plank|crunch|sit.?up|burpee|mountain climber|jumping jack/i.test(raw)
    && !hasDumbbell && !hasBarbell && !/cable|machine/i.test(raw);
  let name = raw.replace(/dumbbell\s*/gi, '').replace(/barbell\s*/gi, '').replace(/\s+/g, ' ').trim();
  const cap = titleCase(name);
  if (hasDumbbell) return `${cap} (DB)`;
  if (hasBarbell)  return `${cap} (Barbell)`;
  if (hasCable)    return `${cap} (Cable)`;
  if (isBW)        return `${cap} (BW)`;
  return cap;
}

export const CATEGORIES = ['WARM-UP','ACTIVATION','SKILL','RESISTANCE','CARDIO','COOL-DOWN'];
export const APP_ID = "gofit-production";
export const TRAINER_MAIL = "admin@gofit.com";