// ─── Date Formatters ──────────────────────────────────────────────────────────
export const formatDateShort = (date) => {
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatDateFull = (date) => {
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const formatTime = (date) => {
  if (!date) return '—';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const startOfDay = (date) => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const dateFromLog = (log) => log.completedAt?.toDate?.() || null;

// ─── Text Formatters ──────────────────────────────────────────────────────────
export const titleCase = (str = '') => {
  return str
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\B\w/g, c => c.toLowerCase());
};

export const formatName = (raw = '') => {
  if (!raw) return '';
  const hasDumbbell = /dumbbell/i.test(raw);
  const hasBarbell = /barbell/i.test(raw);
  const hasCable = /cable/i.test(raw);
  const isBW = /push.?up|pull.?up|\bdip\b|plank|crunch|sit.?up|burpee|mountain climber|jumping jack/i.test(raw)
    && !hasDumbbell && !hasBarbell && !/cable|machine/i.test(raw);

  let name = raw
    .replace(/dumbbell\s*/gi, '')
    .replace(/barbell\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const cap = titleCase(name);
  if (hasDumbbell) return `${cap} (DB)`;
  if (hasBarbell) return `${cap} (Barbell)`;
  if (hasCable) return `${cap} (Cable)`;
  if (isBW) return `${cap} (BW)`;
  return cap;
};

// ─── Number Formatters ────────────────────────────────────────────────────────
export const formatWeight = (weight) => {
  if (!weight) return '—';
  const num = parseFloat(weight);
  return isNaN(num) ? '—' : `${num}kg`;
};

export const formatPercentage = (value, decimals = 0) => {
  if (typeof value !== 'number') return '—';
  return `${(value * 100).toFixed(decimals)}%`;
};

export const roundToHalf = (num) => {
  return Math.round((parseFloat(num) || 0) * 2) / 2;
};

// ─── URL/Link Formatters ──────────────────────────────────────────────────────
export const normalizeHref = (url = '') => {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
};

export const getExerciseLink = (exercise = {}) => {
  return exercise.link || exercise.url || exercise.videoUrl || exercise.gifUrl || '';
};

export const splitTextByLinks = (text = '') => {
  const parts = [];
  const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  let lastIndex = 0;

  String(text).replace(linkRegex, (match, _unused, offset) => {
    if (offset > lastIndex) {
      parts.push({ type: 'text', value: String(text).slice(lastIndex, offset) });
    }
    parts.push({ type: 'link', value: match });
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < String(text).length) {
    parts.push({ type: 'text', value: String(text).slice(lastIndex) });
  }

  return parts;
};

// ─── Array/List Formatters ────────────────────────────────────────────────────
export const formatArrayAsString = (arr = [], separator = ', ') => {
  if (!Array.isArray(arr)) return '—';
  const filtered = arr.filter(Boolean);
  return filtered.length ? filtered.join(separator) : '—';
};

export const removeDuplicates = (arr = []) => {
  return [...new Set(arr)];
};

// ─── RPE and Intensity Formatters ─────────────────────────────────────────────
export const formatRPE = (rpe) => {
  const num = Number(rpe);
  if (isNaN(num)) return '—';
  if (num <= 6) return 'Easy (RPE 1-6)';
  if (num <= 7) return 'Moderate (RPE 7)';
  if (num <= 8) return 'Hard (RPE 8)';
  if (num <= 9) return 'Very Hard (RPE 9)';
  return 'Maximum (RPE 10)';
};

// ─── File Size Formatter ──────────────────────────────────────────────────────
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
