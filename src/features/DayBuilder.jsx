import React, { useState, useMemo } from 'react';
import { addDoc, updateDoc, deleteDoc, doc, collection } from 'firebase/firestore';
import { NASM_OPT_PHASES } from '../constants/nasm';
import { CATEGORIES, MUSCLE_GROUPS } from '../services/firebase/config';
import { getExerciseMuscle, formatName, getMuscleGroup } from '../utils/formatters';
import { normalizeAlternatives, getFilledAlternatives, getAlternativeOptions, applySuggestedAlternatives, makeDefaultAlternatives, suggestAlternatives } from '../utils/validators';
import { useBackButton } from '../hooks/useBackButton';
import { LinkifiedText } from '../components/shared/LinkifiedText';

export function DayTemplateModal({ onClose, db, appId, libraryData, targetClient, sessionName, selectedWeek }) {

  const [selected, setSelected] = useState([]);

  const [saving, setSaving]     = useState(false);

  const [search, setSearch]     = useState('');

  const [catFilter, setCatFilter] = useState('ALL');

  useBackButton(true, onClose);

  const filtered = useMemo(() =>

    libraryData.filter(ex => {

      const matchCat = catFilter === 'ALL' || ex.category === catFilter;

      const matchQ   = !search || ex.name.toLowerCase().includes(search.toLowerCase());

      return matchCat && matchQ;

    }), [libraryData, catFilter, search]);

  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleAssign = async () => {

    if (!selected.length) return;

    if (!targetClient || !sessionName) { alert('Please select a client and day first'); return; }

    setSaving(true);

    const base = Date.now();

    for (let i = 0; i < selected.length; i++) {

      const ex = libraryData.find(l => l.id === selected[i]);

      if (ex) await addDoc(collection(db,'artifacts',appId,'public','data','workouts'), {

        name: ex.name, category: ex.category, muscleGroup: getExerciseMuscle(ex), gifUrl: ex.gifUrl||'',

        sets:'3', reps:'10', tempo:'', coachNote:'', alternatives: getFilledAlternatives(ex.alternatives?.length ? ex.alternatives : suggestAlternatives(ex)),

        assignedTo: targetClient, week: selectedWeek || 'Week 1', day: sessionName, orderIndex: base + i

      });

    }

    onClose();

    alert(`✅ Assigned ${selected.length} exercises`);

  };

  return (

    <div className="fixed inset-0 z-[998] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">

      <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight:'85vh' }}>

        <div className="bg-slate-900 p-5 flex justify-between items-center shrink-0">

          <button onClick={onClose} className="text-slate-400 font-black text-sm hover:text-white">✕ Cancel</button>

          <span className="text-emerald-400 font-black text-sm uppercase">Assign Full Day ({selected.length})</span>

        </div>

        <div className="p-4 border-b border-slate-100 shrink-0 space-y-2">

          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises..." className="w-full p-2.5 border-2 border-slate-200 rounded-xl font-black text-sm outline-none focus:border-emerald-500 bg-slate-50" />

          <div className="flex flex-wrap gap-1">

            {['ALL',...CATEGORIES].map(cat => (

              <button key={cat} onClick={() => setCatFilter(cat)} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${catFilter===cat?'bg-emerald-500 text-white':'bg-slate-100 text-slate-500'}`}>{cat}</button>

            ))}

          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">

          {filtered.map(ex => {

            const isSel = selected.includes(ex.id);

            return (

              <div key={ex.id} onClick={() => toggle(ex.id)} className={`flex items-center justify-between p-3 rounded-2xl border-2 cursor-pointer transition-all ${isSel?'border-emerald-500 bg-emerald-50':'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>

                <div className="text-left">

                  <span className="font-black text-sm text-slate-900 capitalize">{formatName(ex.name)}</span>

                  <p className="text-[10px] font-black text-emerald-500 uppercase">{getExerciseMuscle(ex)} · {ex.category}</p>

                </div>

                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSel?'bg-emerald-500 border-emerald-500 text-white':'border-slate-300'}`}>

                  {isSel && <span className="text-[10px] font-black">✓</span>}

                </div>

              </div>

            );

          })}

        </div>

        <div className="p-4 border-t border-slate-100 shrink-0">

          <button onClick={handleAssign} disabled={saving||!selected.length} className="w-full bg-slate-900 text-emerald-400 py-4 rounded-2xl font-black text-sm uppercase shadow-xl active:scale-95 transition-all disabled:opacity-40">

            {saving ? 'Assigning...' : `Assign ${selected.length} Exercises ✅`}

          </button>

        </div>

      </div>

    </div>

  );

}


export function ExerciseEditRow({ exercise, idx, arr, db, appId, libraryData = [] }) {

  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({

    ...exercise,

    alternatives: normalizeAlternatives(exercise.alternatives)

  });

  const [saving, setSaving] = useState(false);

  const rowbg = 'bg-slate-50 border-slate-100';

  const tx = 'text-slate-900';

  const sub = 'text-slate-500';



  const handleSave = async () => {

    setSaving(true);

    try {

      await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id),{

        name: formData.name,

        sets: formData.sets,

        reps: formData.reps,

        tempo: formData.tempo,

        coachNote: formData.coachNote,

        category: formData.category,

        muscleGroup: formData.muscleGroup || getExerciseMuscle(formData),

        alternatives: getFilledAlternatives(formData.alternatives),

      });

      setEditMode(false);

    } catch(e) { console.error(e); }

    setSaving(false);

  };



  return (

    <>

      {editMode?(

        <div className={`p-4 rounded-2xl border-2 gap-3 ${rowbg} space-y-2`}>

          <input type="text" value={formData.name} onChange={e=>setFormData({...formData,name:e.target.value})} placeholder="Exercise name" className="w-full p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white"/>

          <div className="grid grid-cols-3 gap-2">

            <input type="number" value={formData.sets} onChange={e=>setFormData({...formData,sets:e.target.value})} placeholder="Sets" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>

            <input type="text" value={formData.reps} onChange={e=>setFormData({...formData,reps:e.target.value})} placeholder="Reps" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>

            <input type="text" value={formData.tempo||''} onChange={e=>setFormData({...formData,tempo:e.target.value})} placeholder="Tempo" className="p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white text-center"/>

          </div>

          <input type="text" value={formData.coachNote||''} onChange={e=>setFormData({...formData,coachNote:e.target.value})} placeholder="Coach note" className="w-full p-2 border-2 border-slate-200 rounded-lg font-black text-xs outline-none focus:border-emerald-500 bg-white"/>



          {/* Alternatives */}

          <div className="border-t border-slate-200 pt-2 space-y-1.5">

            <div className="flex items-center justify-between gap-2">

              <p className="text-[9px] font-black text-blue-600 uppercase">البدائل (3 كحد أقصى)</p>

              <button

                type="button"

                onClick={()=>setFormData({...formData, alternatives: applySuggestedAlternatives(formData, formData.alternatives, libraryData)})}

                className="bg-blue-100 text-blue-600 px-2 py-1 rounded-lg font-black text-[9px] uppercase hover:bg-blue-500 hover:text-white transition-all"

              >

                Suggest

              </button>

            </div>

            {formData.alternatives.map((alt, i) => (

              <div key={alt.id} className="grid grid-cols-2 gap-1">

                {i < 2 ? (

                  <select

                    value={alt.name}

                    onChange={e => {

                      const selected = getAlternativeOptions(formData, alt.name, libraryData).find(option => option.name === e.target.value);

                      const newAlts = [...formData.alternatives];

                      newAlts[i] = {...newAlts[i], name: e.target.value, reason: selected?.reason || newAlts[i].reason};

                      setFormData({...formData, alternatives: newAlts});

                    }}

                    className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-400 bg-white"

                  >

                    <option value="">{`بديل مقترح ${i+1}`}</option>

                    {getAlternativeOptions(formData, alt.name, libraryData).map(option => (

                      <option key={`${i}-${option.name}`} value={option.name}>{option.name}</option>

                    ))}

                  </select>

                ) : (

                  <input

                    type="text"

                    placeholder="بديل يدوي"

                    value={alt.name}

                    onChange={e => {

                      const newAlts = [...formData.alternatives];

                      newAlts[i] = {...newAlts[i], name: e.target.value};

                      setFormData({...formData, alternatives: newAlts});

                    }}

                    className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-400 bg-white"

                  />

                )}

                <input

                  type="text"

                  placeholder="السبب"

                  value={alt.reason}

                  onChange={e => {

                    const newAlts = [...formData.alternatives];

                    newAlts[i] = {...newAlts[i], reason: e.target.value};

                    setFormData({...formData, alternatives: newAlts});

                  }}

                  className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-400 bg-white"

                />

              </div>

            ))}

          </div>



          <div className="flex gap-2">

            <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-500 text-white px-3 py-2 rounded-lg font-black text-xs uppercase transition-all disabled:opacity-40">Save</button>

            <button onClick={()=>{setEditMode(false);setFormData({...exercise, alternatives: normalizeAlternatives(exercise.alternatives)});}} className="flex-1 bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-black text-xs uppercase transition-all">Cancel</button>

          </div>

        </div>

      ):(

        <div className={`flex items-center p-3 rounded-2xl border-2 gap-2 ${rowbg} group`}>

          <div className="flex flex-col gap-1 shrink-0">

            <button 

              disabled={idx===0} 

              onClick={async()=>{

                const prev=arr[idx-1];

                const tmp=exercise.orderIndex;

                await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id),{orderIndex:prev.orderIndex});

                await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',prev.id),{orderIndex:tmp});

              }} 

              className={`text-xs font-black px-2 py-1 rounded-lg transition-all ${idx===0?'opacity-20 cursor-not-allowed':'bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}

              title="Move up"

            >

              ▲

            </button>

            <button 

              disabled={idx===arr.length-1} 

              onClick={async()=>{

                const next=arr[idx+1];

                const tmp=exercise.orderIndex;

                await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id),{orderIndex:next.orderIndex});

                await updateDoc(doc(db,'artifacts',appId,'public','data','workouts',next.id),{orderIndex:tmp});

              }} 

              className={`text-xs font-black px-2 py-1 rounded-lg transition-all ${idx===arr.length-1?'opacity-20 cursor-not-allowed':'bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}

              title="Move down"

            >

              ▼

            </button>

          </div>

          <div className="flex-1 text-left min-w-0">

            <span className="font-black text-sm text-slate-900 truncate block">{formatName(exercise.name)}</span>

            <p className="text-[10px] font-bold text-slate-500">{exercise.sets}x{exercise.reps}{exercise.tempo?` · ${exercise.tempo}`:''}</p>

            {exercise.coachNote&&<p className="text-[10px] text-emerald-500 font-bold truncate">💬 <LinkifiedText text={exercise.coachNote}/></p>}

            {getFilledAlternatives(exercise.alternatives).length>0&&(

              <p className="text-[9px] font-black text-blue-500">⇄ {getFilledAlternatives(exercise.alternatives).length} بديل</p>

            )}

          </div>

          <div className="flex gap-1 shrink-0">

            <button onClick={()=>setEditMode(true)} className="bg-blue-100 text-blue-600 font-black text-[10px] px-3 py-1.5 rounded-lg hover:bg-blue-500 hover:text-white transition-all">Edit</button>

            <button onClick={()=>deleteDoc(doc(db,'artifacts',appId,'public','data','workouts',exercise.id))} className="text-red-400 font-black text-[10px] bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-all">Del</button>

          </div>

        </div>

      )}

    </>

  );

}


export function ProgramBuilder({ onClose }) {

  const [step, setStep] = useState('assessment'); // assessment, review, program

  const [formData, setFormData] = useState({

    name: '',

    age: '',

    gender: '',

    fitnessLevel: 'Beginner',

    goal: 'General Fitness',

    daysPerWeek: 3,

    equipment: [],

    injuries: '',

  });

  const [generatedProgram, setGeneratedProgram] = useState(null);

 

  const EXERCISES_BY_PHASE = {

    1: {

      Chest: ['Push-ups (BW)', 'Dumbbell Bench Press'],

      Back: ['Bodyweight Rows', 'Dumbbell Rows'],

      Legs: ['Bodyweight Squats', 'Dumbbell Lunges'],

      Shoulders: ['Dumbbell Shoulder Press', 'Lateral Raises (DB)'],

      Core: ['Plank', 'Bird Dog', 'Dead Bug']

    },

    2: {

      Chest: ['Barbell Bench Press', 'Incline Dumbbell Press'],

      Back: ['Barbell Rows', 'Pull-ups', 'Lat Pulldown'],

      Legs: ['Barbell Squats', 'Romanian Deadlifts'],

      Shoulders: ['Barbell Shoulder Press', 'Dumbbell Shoulder Press'],

      Core: ['Plank Variations', 'Anti-Rotation Press']

    },

    3: {

      Chest: ['Barbell Incline Press', 'Dumbbell Flyes', 'Machine Press'],

      Back: ['Weighted Pull-ups', 'T-Bar Rows', 'Seal Rows'],

      Legs: ['Barbell Squats (heavy)', 'Leg Press', 'Leg Curls'],

      Shoulders: ['Heavy Dumbbell Press', 'Machine Shoulder Press'],

      Core: ['Weighted Planks', 'Hanging Leg Raises']

    },

    4: {

      Chest: ['Heavy Barbell Bench', '1RM Test'],

      Back: ['Heavy Deadlifts', 'Heavy Rows'],

      Legs: ['Heavy Squats', 'Heavy Deadlifts'],

      Shoulders: ['Heavy Military Press'],

      Core: ['Heavy Core Movements']

    },

    5: {

      Chest: ['Plyometric Push-ups', 'Medicine Ball Chest Pass'],

      Back: ['Explosive Pull-ups', 'Explosive Rows'],

      Legs: ['Jump Squats', 'Box Jumps', 'Explosive Lunges'],

      Shoulders: ['Medicine Ball Throws'],

      Core: ['Explosive Core Work']

    }

  };

 

  const determineStartingPhase = () => {

    if (formData.fitnessLevel === 'Beginner') return 1;

    if (formData.fitnessLevel === 'Intermediate') return 2;

    return 3;

  };

 

  const generateWeeklyPlan = (phase, daysPerWeek) => {

    const muscleGroups = ['Chest', 'Back', 'Legs', 'Shoulders', 'Core'];

    const plan = {};

    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    

    for (let i = 0; i < daysPerWeek; i++) {

      const muscleGroup = muscleGroups[i % muscleGroups.length];

      plan[dayLabels[i]] = {

        muscleGroup,

        exercises: EXERCISES_BY_PHASE[phase][muscleGroup] || [],

        sets: NASM_OPT_PHASES[phase].reps,

        reps: NASM_OPT_PHASES[phase].reps,

        intensity: NASM_OPT_PHASES[phase].intensity,

        rest: NASM_OPT_PHASES[phase].rest

      };

    }

    

    return plan;

  };

 

  const handleFormChange = (e) => {

    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {

      setFormData(prev => ({

        ...prev,

        equipment: checked 

          ? [...prev.equipment, value]

          : prev.equipment.filter(item => item !== value)

      }));

    } else {

      setFormData(prev => ({ ...prev, [name]: value }));

    }

  };

 

  const handleGenerateProgram = () => {

    const startingPhase = determineStartingPhase();

    const weeklyPlan = generateWeeklyPlan(startingPhase, parseInt(formData.daysPerWeek));

    

    const program = {

      ...formData,

      startingPhase,

      phaseInfo: NASM_OPT_PHASES[startingPhase],

      weeklyPlan,

      createdAt: new Date().toLocaleDateString('ar-SA'),

      duration: NASM_OPT_PHASES[startingPhase].duration

    };

    

    setGeneratedProgram(program);

    setStep('program');

  };

 

  if (step === 'assessment') {

    return (

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-8">

          <div className="flex justify-between items-center mb-6">

            <h2 className="text-3xl font-black text-slate-900">NASM OPT Builder</h2>

            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-600">×—</button>

          </div>

 

          <form className="space-y-5">

            {/* Personal Info */}

            <div className="grid grid-cols-2 gap-3">

              <input

                type="text"

                name="name"

                placeholder="الاسم"

                value={formData.name}

                onChange={handleFormChange}

                className="col-span-2 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"

              />

              <input

                type="number"

                name="age"

                placeholder="العمر"

                value={formData.age}

                onChange={handleFormChange}

                className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"

              />

              <select

                name="gender"

                value={formData.gender}

                onChange={handleFormChange}

                className="px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"

              >

                <option value="">الجنس</option>

                <option value="Male">ذكر</option>

                <option value="Female">أنثى</option>

              </select>

            </div>

 

            {/* Fitness Level */}

            <div>

              <label className="block text-sm font-black text-slate-700 mb-2">مستوى اللياقة</label>

              <select

                name="fitnessLevel"

                value={formData.fitnessLevel}

                onChange={handleFormChange}

                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"

              >

                <option value="Beginner">مبتدئ</option>

                <option value="Intermediate">متوسط</option>

                <option value="Advanced">متقدم</option>

              </select>

            </div>

 

            {/* Goal */}

            <div>

              <label className="block text-sm font-black text-slate-700 mb-2">الهدف</label>

              <select

                name="goal"

                value={formData.goal}

                onChange={handleFormChange}

                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"

              >

                <option value="General Fitness">اللياقة العامة</option>

                <option value="Weight Loss">خسارة الوزن</option>

                <option value="Muscle Gain">بناء العضلات</option>

                <option value="Strength">القوة</option>

                <option value="Endurance">التحمل</option>

              </select>

            </div>

 

            {/* Days Per Week */}

            <div>

              <label className="block text-sm font-black text-slate-700 mb-2">أيام التمرين في الأسبوع</label>

              <select

                name="daysPerWeek"

                value={formData.daysPerWeek}

                onChange={handleFormChange}

                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"

              >

                {[2, 3, 4, 5, 6].map(day => <option key={day} value={day}>{day} أيام</option>)}

              </select>

            </div>

 

            {/* Equipment */}

            <div>

              <label className="block text-sm font-black text-slate-700 mb-3">الأدوات المتاحة</label>

              <div className="grid grid-cols-2 gap-3">

                {['Dumbbells', 'Barbell', 'Cable', 'Bodyweight', 'Machines'].map(eq => (

                  <label key={eq} className="flex items-center gap-2 cursor-pointer">

                    <input

                      type="checkbox"

                      value={eq}

                      checked={formData.equipment.includes(eq)}

                      onChange={handleFormChange}

                      className="w-4 h-4 accent-emerald-500"

                    />

                    <span className="text-sm font-black text-slate-700">{eq}</span>

                  </label>

                ))}

              </div>

            </div>

 

            {/* Injuries */}

            <textarea

              name="injuries"

              placeholder="إصابات سابقة أو ملاحظات طبية"

              value={formData.injuries}

              onChange={handleFormChange}

              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none h-20 resize-none"

            />

 

            {/* Buttons */}

            <div className="flex gap-3 pt-4">

              <button

                type="button"

                onClick={onClose}

                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-black text-slate-700 hover:bg-slate-50"

              >

                إلغاء

              </button>

              <button

                type="button"

                onClick={handleGenerateProgram}

                className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-black hover:bg-emerald-600 transition-all"
              >

                إنشاء البرنامج
              </button>
            </div>

          </form>

        </div>

      </div>

    );

  }

 

  if (step === 'program' && generatedProgram) {

    return (

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">

          <div className="flex justify-between items-center mb-6">

            <h2 className="text-3xl font-black text-slate-900">برنامجك التدريبي</h2>

            <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-600">×—</button>

          </div>

 

          {/* Program Header */}

          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-6 mb-6 border-2 border-emerald-200">

            <h3 className="text-2xl font-black text-slate-900 mb-4">{generatedProgram.name}</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">

              <div>

                <p className="text-slate-600 font-black text-xs">المرحلة</p>

                <p className="text-lg font-black text-emerald-600">{generatedProgram.phaseInfo.level}</p>

              </div>

              <div>

                <p className="text-slate-600 font-black text-xs">المدة</p>

                <p className="text-lg font-black text-emerald-600">{generatedProgram.duration}</p>

              </div>

              <div>

                <p className="text-slate-600 font-black text-xs">مستوى اللياقة</p>

                <p className="text-lg font-black text-emerald-600">{generatedProgram.fitnessLevel}</p>

              </div>

              <div>

                <p className="text-slate-600 font-black text-xs">الهدف</p>

                <p className="text-lg font-black text-emerald-600">{generatedProgram.goal}</p>

              </div>

            </div>

          </div>

 

          {/* Phase Info */}

          <div className="bg-slate-900 text-white rounded-2xl p-6 mb-6">

            <h4 className="text-xl font-black mb-4">{generatedProgram.phaseInfo.phase}</h4>

            <p className="text-slate-300 mb-4">{generatedProgram.phaseInfo.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">

              <div className="bg-slate-800 p-3 rounded-lg">

                <p className="text-slate-400 font-black text-xs">التكرارات</p>

                <p className="text-emerald-400 font-black">{generatedProgram.phaseInfo.reps}</p>

              </div>

              <div className="bg-slate-800 p-3 rounded-lg">

                <p className="text-slate-400 font-black text-xs">الشدة</p>

                <p className="text-emerald-400 font-black">{generatedProgram.phaseInfo.intensity}</p>

              </div>

              <div className="bg-slate-800 p-3 rounded-lg">

                <p className="text-slate-400 font-black text-xs">الراحة</p>

                <p className="text-emerald-400 font-black text-xs">{generatedProgram.phaseInfo.rest}</p>

              </div>

              <div className="bg-slate-800 p-3 rounded-lg">

                <p className="text-slate-400 font-black text-xs">التركيز</p>

                <p className="text-emerald-400 font-black text-xs">{generatedProgram.phaseInfo.focus}</p>

              </div>

            </div>

          </div>

 

          {/* Weekly Plan */}
          <div className="mb-6">
            <h4 className="text-xl font-black text-slate-900 mb-4">جدول الأسبوع</h4>
            <div className="space-y-3">
              {Object.entries(generatedProgram.weeklyPlan).map(([day, info]) => (
                <div key={day} className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-black text-slate-900">{day}</h5>
                    <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-black">
                      {info.muscleGroup}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-black mb-2">التمارين:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {info.exercises.map(ex => <li key={ex}>{ex}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                const text = `برنامج التدريب NASM OPT\n\n${generatedProgram.name}\n\nالمرحلة: ${generatedProgram.phaseInfo.level}\nالمدة: ${generatedProgram.duration}\n\n${Object.entries(generatedProgram.weeklyPlan).map(([day, info]) => `${day}: ${info.muscleGroup}`).join('\n')}`;
                navigator.clipboard.writeText(text);
                alert('تم نسخ البرنامج!');
              }}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-black hover:bg-blue-600 transition-all"
            >
              نسخ البرنامج
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-black hover:bg-emerald-600 transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }
}