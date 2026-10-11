import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowLeft, BarChart3, Check, ChevronRight, CirclePause, CirclePlay,
  Clock3, Dumbbell, Flame, HeartPulse, Home, Library, ListPlus, Pause, Play,
  Plus, RotateCcw, Search, Settings2, SkipForward, Sparkles, TimerReset, Trash2,
  Trophy, X
} from 'lucide-react'
import { exercises, templates } from './data'
import type { Category, Exercise, SessionItem, WorkoutLog, WorkoutTemplate } from './types'

type Tab = 'today' | 'library' | 'builder' | 'history'
type Phase = 'work' | 'rest'

const LS = {
  custom: 'sport.customWorkouts.v1',
  logs: 'sport.logs.v1',
  active: 'sport.activeTemplate.v1'
}

function readJSON<T>(key:string, fallback:T):T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}

function formatSec(value:number) {
  const m = Math.floor(value / 60)
  const s = value % 60
  return `${m}:${String(s).padStart(2,'0')}`
}

function estimateItemSeconds(item:SessionItem, ex:Exercise) {
  if ((item.duration ?? ex.duration)) return item.duration ?? ex.duration ?? 0
  const sets = item.sets ?? ex.sets
  const rest = item.rest ?? ex.rest
  return Math.max(90, sets * 45 + Math.max(0, sets - 1) * rest)
}

function exerciseById(id:string) {
  return exercises.find(e => e.id === id)!
}

function MuscleMap({ exercise, compact=false }:{exercise:Exercise, compact?:boolean}) {
  const p = new Set(exercise.primary)
  const s = new Set(exercise.secondary)
  const active = (m:string) => p.has(m as never) ? 'primary' : s.has(m as never) ? 'secondary' : ''
  return (
    <div className={'muscle-map '+(compact?'compact':'')} aria-label={'Muscles: '+[...exercise.primary,...exercise.secondary].join(', ')}>
      <svg viewBox="0 0 120 190" role="img">
        <circle cx="60" cy="18" r="12" className="body-part"/>
        <path d="M43 34 Q60 28 77 34 L82 82 Q74 92 70 110 H50 Q46 92 38 82Z" className="body-part"/>
        <rect x="28" y="38" width="15" height="58" rx="8" className="body-part"/>
        <rect x="77" y="38" width="15" height="58" rx="8" className="body-part"/>
        <rect x="43" y="108" width="15" height="70" rx="9" className="body-part"/>
        <rect x="62" y="108" width="15" height="70" rx="9" className="body-part"/>
        <ellipse cx="51" cy="49" rx="11" ry="8" className={'muscle '+active('Pectoraux')}/>
        <ellipse cx="69" cy="49" rx="11" ry="8" className={'muscle '+active('Pectoraux')}/>
        <ellipse cx="35" cy="44" rx="8" ry="9" className={'muscle '+active('Épaules')}/>
        <ellipse cx="85" cy="44" rx="8" ry="9" className={'muscle '+active('Épaules')}/>
        <rect x="29" y="54" width="11" height="22" rx="5" className={'muscle '+active('Biceps')}/>
        <rect x="80" y="54" width="11" height="22" rx="5" className={'muscle '+active('Triceps')}/>
        <path d="M46 60 H74 L70 96 H50Z" className={'muscle '+active('Abdominaux')}/>
        <path d="M42 40 Q60 33 78 40 L76 66 Q60 74 44 66Z" className={'muscle '+active('Dos')}/>
        <ellipse cx="52" cy="111" rx="10" ry="8" className={'muscle '+active('Fessiers')}/>
        <ellipse cx="68" cy="111" rx="10" ry="8" className={'muscle '+active('Fessiers')}/>
        <rect x="44" y="116" width="13" height="31" rx="6" className={'muscle '+active('Quadriceps')}/>
        <rect x="63" y="116" width="13" height="31" rx="6" className={'muscle '+active('Quadriceps')}/>
        <rect x="44" y="130" width="13" height="25" rx="6" className={'muscle '+active('Ischio-jambiers')}/>
        <rect x="63" y="130" width="13" height="25" rx="6" className={'muscle '+active('Ischio-jambiers')}/>
        <rect x="45" y="151" width="12" height="24" rx="6" className={'muscle '+active('Mollets')}/>
        <rect x="63" y="151" width="12" height="24" rx="6" className={'muscle '+active('Mollets')}/>
        <rect x="52" y="84" width="16" height="20" rx="7" className={'muscle '+active('Lombaires')}/>
      </svg>
      {!compact && <div className="muscle-legend">
        {exercise.primary.map(m => <span key={m}><i className="dot primary"/>{m}</span>)}
        {exercise.secondary.map(m => <span key={m}><i className="dot secondary"/>{m}</span>)}
      </div>}
    </div>
  )
}

function ExerciseArt({ex}:{ex:Exercise}) {
  return (
    <div className={'exercise-art '+ex.category.toLowerCase().replace('é','e')}>
      <span className="exercise-emoji">{ex.icon}</span>
      <MuscleMap exercise={ex} compact />
    </div>
  )
}

function App() {
  const [tab,setTab] = useState<Tab>('today')
  const [query,setQuery] = useState('')
  const [category,setCategory] = useState<'Tous'|Category>('Tous')
  const [selected,setSelected] = useState<Exercise|null>(null)
  const [custom,setCustom] = useState<WorkoutTemplate[]>(()=>readJSON(LS.custom,[]))
  const [logs,setLogs] = useState<WorkoutLog[]>(()=>readJSON(LS.logs,[]))
  const [activeId,setActiveId] = useState<string>(()=>localStorage.getItem(LS.active)||'a')
  const [builderName,setBuilderName] = useState('Ma séance')
  const [builder,setBuilder] = useState<SessionItem[]>([])
  const [player,setPlayer] = useState<WorkoutTemplate|null>(null)

  const allTemplates = [...templates,...custom]
  const active = allTemplates.find(t=>t.id===activeId) ?? templates[0]

  useEffect(()=>localStorage.setItem(LS.custom,JSON.stringify(custom)),[custom])
  useEffect(()=>localStorage.setItem(LS.logs,JSON.stringify(logs)),[logs])
  useEffect(()=>localStorage.setItem(LS.active,activeId),[activeId])

  const filtered = useMemo(()=>exercises.filter(ex=>{
    const q=query.trim().toLowerCase()
    return (category==='Tous'||ex.category===category) &&
      (!q || ex.name.toLowerCase().includes(q) || ex.primary.join(' ').toLowerCase().includes(q) || ex.equipment.toLowerCase().includes(q))
  }),[query,category])

  const totalSeconds = (t:WorkoutTemplate) => t.items.reduce((sum,item)=>sum+estimateItemSeconds(item,exerciseById(item.exerciseId)),0)

  function addToBuilder(ex:Exercise) {
    if(builder.some(i=>i.exerciseId===ex.id)) return
    setBuilder(v=>[...v,{exerciseId:ex.id,sets:ex.sets,reps:ex.reps,rest:ex.rest,duration:ex.duration}])
  }

  function saveBuilder(){
    if(!builder.length)return
    const t:WorkoutTemplate={id:'custom-'+Date.now(),name:builderName.trim()||'Ma séance',color:'#a78bfa',items:builder}
    setCustom(v=>[...v,t]); setBuilder([]); setBuilderName('Ma séance'); setActiveId(t.id); setTab('today')
  }

  function finishWorkout(log:WorkoutLog){
    setLogs(v=>[log,...v].slice(0,60)); setPlayer(null); setTab('history')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><Dumbbell size={21}/></div>
        <div><strong>SPORT</strong><span>coach de salle</span></div>
        <button className="icon-btn" aria-label="Réglages"><Settings2 size={20}/></button>
      </header>

      <main className="main">
        {tab==='today' && <Today
          active={active} templates={allTemplates} onSelect={id=>setActiveId(id)}
          onStart={()=>setPlayer(active)} totalSeconds={totalSeconds} logs={logs}
        />}
        {tab==='library' && <LibraryView
          exercises={filtered} query={query} setQuery={setQuery} category={category}
          setCategory={setCategory} onOpen={setSelected} onAdd={addToBuilder}
        />}
        {tab==='builder' && <Builder
          items={builder} name={builderName} setName={setBuilderName}
          setItems={setBuilder} onBrowse={()=>setTab('library')} onSave={saveBuilder}
        />}
        {tab==='history' && <History logs={logs}/>}
      </main>

      <nav className="bottom-nav">
        <NavButton active={tab==='today'} onClick={()=>setTab('today')} icon={<Home/>} label="Aujourd’hui"/>
        <NavButton active={tab==='library'} onClick={()=>setTab('library')} icon={<Library/>} label="Exercices"/>
        <NavButton active={tab==='builder'} onClick={()=>setTab('builder')} icon={<ListPlus/>} label="Créer"/>
        <NavButton active={tab==='history'} onClick={()=>setTab('history')} icon={<BarChart3/>} label="Historique"/>
      </nav>

      {selected && <ExerciseSheet ex={selected} onClose={()=>setSelected(null)} onAdd={()=>{addToBuilder(selected);setSelected(null);setTab('builder')}}/>}
      {player && <WorkoutPlayer template={player} onClose={()=>setPlayer(null)} onFinish={finishWorkout}/>}
    </div>
  )
}

function NavButton({active,onClick,icon,label}:{active:boolean,onClick:()=>void,icon:React.ReactNode,label:string}){
  return <button onClick={onClick} className={active?'active':''}>{icon}<span>{label}</span></button>
}

function Today({active,templates,onSelect,onStart,totalSeconds,logs}:{active:WorkoutTemplate,templates:WorkoutTemplate[],onSelect:(id:string)=>void,onStart:()=>void,totalSeconds:(t:WorkoutTemplate)=>number,logs:WorkoutLog[]}){
  return <section className="page">
    <div className="hero">
      <div className="eyebrow"><Sparkles size={15}/> PROGRAMME DU JOUR</div>
      <h1>Prêt pour ta séance ?</h1>
      <p>Simple, guidé et pensé pour être utilisé d’une main à la salle.</p>
    </div>

    <div className="template-strip">
      {templates.map(t=><button key={t.id} onClick={()=>onSelect(t.id)} className={active.id===t.id?'selected':''}>
        <i style={{background:t.color}}/>{t.name}
      </button>)}
    </div>

    <article className="session-card featured">
      <div className="session-head">
        <div><span className="pill">FULL BODY</span><h2>{active.name}</h2></div>
        <div className="time-badge"><Clock3 size={16}/>{Math.ceil(totalSeconds(active)/60)} min</div>
      </div>
      <div className="mini-stats">
        <span><Dumbbell size={17}/><b>{active.items.length}</b> exercices</span>
        <span><TimerReset size={17}/><b>{active.items.reduce((s,i)=>s+(i.sets??1),0)}</b> blocs</span>
        <span><Flame size={17}/><b>RIR 2</b> cible</span>
      </div>
      <div className="session-list">
        {active.items.map((item,i)=>{
          const ex=exerciseById(item.exerciseId)
          return <div className="session-row" key={ex.id}>
            <div className="order">{i+1}</div>
            <ExerciseArt ex={ex}/>
            <div className="session-row-copy"><b>{ex.name}</b><span>{item.duration?Math.round(item.duration/60)+' min':`${item.sets??ex.sets} × ${item.reps??ex.reps}`} · repos {item.rest??ex.rest}s</span></div>
            <MuscleMap exercise={ex} compact/>
          </div>
        })}
      </div>
      <button className="primary big" onClick={onStart}><Play fill="currentColor"/> Démarrer la séance</button>
    </article>

    <div className="dashboard-grid">
      <article className="glass stat-card"><Trophy/><div><b>{logs.length}</b><span>séances terminées</span></div></article>
      <article className="glass stat-card"><HeartPulse/><div><b>8–10k</b><span>pas / jour</span></div></article>
    </div>
  </section>
}

function LibraryView({exercises:items,query,setQuery,category,setCategory,onOpen,onAdd}:{exercises:Exercise[],query:string,setQuery:(v:string)=>void,category:'Tous'|Category,setCategory:(v:'Tous'|Category)=>void,onOpen:(e:Exercise)=>void,onAdd:(e:Exercise)=>void}){
  const cats:Array<'Tous'|Category>=['Tous','Musculation','Cardio','HIIT','Mobilité']
  return <section className="page">
    <div className="page-title"><div><span className="eyebrow">BIBLIOTHÈQUE</span><h1>Exercices</h1></div><span className="count-chip">{items.length}</span></div>
    <div className="search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Machine, muscle, exercice…"/></div>
    <div className="chips">{cats.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    <div className="exercise-grid">
      {items.map(ex=><article className="exercise-card" key={ex.id} onClick={()=>onOpen(ex)}>
        <ExerciseArt ex={ex}/>
        <div className="exercise-content">
          <div className="exercise-meta"><span>{ex.category}</span><span>{ex.level}</span></div>
          <h3>{ex.name}</h3>
          <p>{ex.primary.join(' · ')}</p>
          <div className="exercise-prescription">
            <b>{ex.duration?Math.round(ex.duration/60)+' min':`${ex.sets} × ${ex.reps}`}</b>
            {ex.rest>0&&<span>repos {ex.rest}s</span>}
          </div>
        </div>
        <button className="add-mini" onClick={e=>{e.stopPropagation();onAdd(ex)}} aria-label="Ajouter"><Plus/></button>
      </article>)}
    </div>
  </section>
}

function Builder({items,name,setName,setItems,onBrowse,onSave}:{items:SessionItem[],name:string,setName:(v:string)=>void,setItems:React.Dispatch<React.SetStateAction<SessionItem[]>>,onBrowse:()=>void,onSave:()=>void}){
  const total=items.reduce((sum,i)=>sum+estimateItemSeconds(i,exerciseById(i.exerciseId)),0)
  return <section className="page">
    <div className="page-title"><div><span className="eyebrow">CONSTRUCTEUR</span><h1>Créer une séance</h1></div></div>
    <label className="field-label">Nom de la séance<input value={name} onChange={e=>setName(e.target.value)}/></label>
    <div className="builder-summary">
      <div><Clock3/><b>{Math.ceil(total/60)} min</b><span>temps estimé</span></div>
      <div><Dumbbell/><b>{items.length}</b><span>exercices</span></div>
    </div>
    {!items.length && <div className="empty-state"><ListPlus size={42}/><h3>Ta séance est vide</h3><p>Choisis des exercices dans la bibliothèque.</p><button className="secondary" onClick={onBrowse}><Plus/> Ajouter des exercices</button></div>}
    <div className="builder-list">
      {items.map((item,idx)=>{
        const ex=exerciseById(item.exerciseId)
        return <article key={ex.id} className="builder-item">
          <div className="drag">{idx+1}</div><ExerciseArt ex={ex}/>
          <div className="builder-copy"><b>{ex.name}</b><span>{ex.primary.join(' · ')}</span>
            {!item.duration && <div className="stepper-row">
              <label>Séries <input type="number" min="1" max="8" value={item.sets??ex.sets} onChange={e=>setItems(v=>v.map(x=>x.exerciseId===ex.id?{...x,sets:+e.target.value}:x))}/></label>
              <label>Repos <input type="number" min="15" max="300" step="15" value={item.rest??ex.rest} onChange={e=>setItems(v=>v.map(x=>x.exerciseId===ex.id?{...x,rest:+e.target.value}:x))}/></label>
            </div>}
          </div>
          <button className="icon-btn danger" onClick={()=>setItems(v=>v.filter(x=>x.exerciseId!==ex.id))}><Trash2 size={18}/></button>
        </article>
      })}
    </div>
    {items.length>0&&<div className="builder-actions"><button className="secondary" onClick={onBrowse}><Plus/>Ajouter</button><button className="primary" onClick={onSave}><Check/>Enregistrer</button></div>}
  </section>
}

function History({logs}:{logs:WorkoutLog[]}){
  const mins=logs.reduce((s,l)=>s+l.duration,0)
  return <section className="page">
    <div className="page-title"><div><span className="eyebrow">PROGRESSION</span><h1>Historique</h1></div></div>
    <div className="dashboard-grid">
      <article className="glass stat-card"><Trophy/><div><b>{logs.length}</b><span>séances</span></div></article>
      <article className="glass stat-card"><Clock3/><div><b>{Math.round(mins/60)}</b><span>minutes</span></div></article>
    </div>
    {!logs.length?<div className="empty-state"><BarChart3 size={42}/><h3>Pas encore d’historique</h3><p>Termine une séance pour voir ta progression ici.</p></div>:
      <div className="history-list">{logs.map(l=><article key={l.id}><div className="history-icon"><Check/></div><div><b>{l.name}</b><span>{new Date(l.date).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})}</span></div><div className="history-right"><b>{Math.round(l.duration/60)} min</b><span>{l.completed}/{l.total}</span></div></article>)}</div>}
  </section>
}

function ExerciseSheet({ex,onClose,onAdd}:{ex:Exercise,onClose:()=>void,onAdd:()=>void}){
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="sheet">
      <div className="sheet-handle"/>
      <button className="sheet-close" onClick={onClose}><X/></button>
      <ExerciseArt ex={ex}/>
      <span className="pill">{ex.category} · {ex.equipment}</span>
      <h2>{ex.name}</h2>
      <MuscleMap exercise={ex}/>
      <div className="prescription-box">
        <div><b>{ex.sets}</b><span>séries</span></div><div><b>{ex.reps||'—'}</b><span>répétitions</span></div><div><b>{ex.rest}s</b><span>repos</span></div>
      </div>
      <h3>Comment faire</h3>
      <ol className="instructions">{ex.instructions.map(x=><li key={x}>{x}</li>)}</ol>
      <div className="coach-tip"><Sparkles size={18}/><span><b>Conseil :</b> {ex.tip}</span></div>
      <button className="primary big" onClick={onAdd}><Plus/>Ajouter à ma séance</button>
    </div>
  </div>
}

function WorkoutPlayer({template,onClose,onFinish}:{template:WorkoutTemplate,onClose:()=>void,onFinish:(l:WorkoutLog)=>void}){
  const [index,setIndex]=useState(0)
  const [setNo,setSetNo]=useState(1)
  const [phase,setPhase]=useState<Phase>('work')
  const [running,setRunning]=useState(false)
  const [elapsed,setElapsed]=useState(0)
  const [restLeft,setRestLeft]=useState(0)
  const started=useRef(Date.now())
  const item=template.items[index]
  const ex=exerciseById(item.exerciseId)
  const sets=item.sets??ex.sets
  const rest=item.rest??ex.rest
  const isTimed=Boolean(item.duration??ex.duration)
  const workDuration=item.duration??ex.duration??0

  useEffect(()=>{
    const id=window.setInterval(()=>setElapsed(Math.floor((Date.now()-started.current)/1000)),1000)
    return()=>clearInterval(id)
  },[])

  useEffect(()=>{
    if(!running)return
    const id=window.setInterval(()=>{
      if(phase==='rest') setRestLeft(v=>{
        if(v<=1){setRunning(false);setPhase('work');return 0}
        return v-1
      })
    },1000)
    return()=>clearInterval(id)
  },[running,phase])

  const completeSet=()=>{
    if(isTimed){ nextExercise(); return }
    if(setNo<sets){
      setSetNo(s=>s+1); setPhase('rest'); setRestLeft(rest); setRunning(true)
      if('vibrate' in navigator) navigator.vibrate?.([80,50,80])
    } else nextExercise()
  }
  const nextExercise=()=>{
    if(index<template.items.length-1){setIndex(i=>i+1);setSetNo(1);setPhase('work');setRunning(false);setRestLeft(0)}
    else onFinish({id:'log-'+Date.now(),name:template.name,date:new Date().toISOString(),duration:elapsed,completed:template.items.length,total:template.items.length})
  }

  return <div className="player">
    <header><button onClick={onClose}><ArrowLeft/></button><div><span>EN COURS</span><b>{template.name}</b></div><div className="elapsed"><Clock3/>{formatSec(elapsed)}</div></header>
    <div className="player-progress"><i style={{width:`${((index+(setNo/Math.max(1,sets)))/template.items.length)*100}%`}}/></div>

    <div className="player-main">
      <div className="player-counter">Exercice {index+1} / {template.items.length}</div>
      <ExerciseArt ex={ex}/>
      <h1>{ex.name}</h1>
      <p className="muscle-line">{ex.primary.join(' · ')}{ex.secondary.length?' + '+ex.secondary.join(' · '):''}</p>
      <MuscleMap exercise={ex}/>

      {phase==='rest' ? <div className="rest-panel">
        <span>RÉCUPÉRATION</span><strong>{formatSec(restLeft)}</strong>
        <div className="timer-ring" style={{'--progress':`${Math.max(0,restLeft/rest)*360}deg`} as React.CSSProperties}/>
        <button className="secondary" onClick={()=>{setRestLeft(0);setRunning(false);setPhase('work')}}><SkipForward/>Passer le repos</button>
      </div> : <div className="set-panel">
        {isTimed ? <>
          <span>DURÉE CIBLE</span><strong>{formatSec(workDuration)}</strong>
        </> : <>
          <span>SÉRIE</span><strong>{setNo}<small> / {sets}</small></strong>
          <div className="rep-target">{item.reps??ex.reps} <small>répétitions</small></div>
        </>}
      </div>}

      <div className="player-instructions">{ex.instructions.slice(0,3).map((x,i)=><span key={x}><i>{i+1}</i>{x}</span>)}</div>
    </div>

    <div className="player-controls">
      {phase==='work' && <button className="complete-btn" onClick={completeSet}><Check/> {isTimed?'Exercice terminé':'Série terminée'}</button>}
      {phase==='rest' && <button className="round-btn" onClick={()=>setRunning(r=>!r)}>{running?<Pause/>:<Play/>}</button>}
      <button className="ghost-skip" onClick={nextExercise}>Exercice suivant <ChevronRight/></button>
    </div>
  </div>
}

export default App
