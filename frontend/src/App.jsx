import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Atom, Award, BarChart3, BookOpen, Bookmark, Brain, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, Code2, Compass, Flame, GraduationCap, Home, Lightbulb, LoaderCircle, Map, Menu, MessageCircle, Network, PanelLeftClose, Play, Plus, Rocket, Send, Sparkles, Target, TrendingUp, X, Zap } from 'lucide-react'
import { api } from './services/api'
import { ProgressPage, SavedPage, StudyPlanPage } from './WorkspacePages'

const chartData = Array.from({ length: 7 }, (_, index) => {
  const day = new Date()
  day.setDate(day.getDate() - (6 - index))
  return { day: new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(day), value: 0 }
})
const dashboardDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: '2-digit' }).format(new Date()).toUpperCase()
const defaultSkills = { Python: 82, SQL: 61, 'Machine Learning': 42 }
const quickTopics = ['Python Loops', 'Python Lists', 'Python Functions', 'SQL Basics', 'Machine Learning Basics']
const phases = [{ key: 'understand', title: 'Understand', icon: Lightbulb, color: 'violet' }, { key: 'connect', title: 'Connect', icon: Network, color: 'blue' }, { key: 'apply', title: 'Apply', icon: Rocket, color: 'orange' }, { key: 'think', title: 'Think', icon: Brain, color: 'green' }]
const destinations = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: Home },
  { id: 'learn', path: '/learning', label: 'Learning Studio', icon: BookOpen },
  { id: 'conceptMap', path: '/concept-map', label: 'Concept Map', icon: Network },
  { id: 'practice', path: '/practice', label: 'Practice', icon: Target },
  { id: 'studyPlan', path: '/study-plan', label: 'Study Plan', icon: Compass },
  { id: 'progress', path: '/progress', label: 'Progress', icon: TrendingUp },
  { id: 'saved', path: '/saved', label: 'Saved Topics', icon: Bookmark },
]
const destinationByPath = Object.fromEntries(destinations.map((item) => [item.path, item.id]))
const destinationPath = Object.fromEntries(destinations.map((item) => [item.id, item.path]))
const pageTitles = Object.fromEntries(destinations.map((item) => [item.id, item.label]))

function readSavedItems() {
  try {
    const saved = JSON.parse(window.localStorage.getItem('learnforge:saved-items') || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

function App() {
  const [page, setPage] = useState(() => destinationByPath[window.location.pathname] || 'home')
  const [progress, setProgress] = useState(null)
  const [sessionDetails, setSessionDetails] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [savedItems, setSavedItems] = useState(readSavedItems)
  const [lesson, setLesson] = useState(null)
  const [topic, setTopic] = useState('Python Loops')
  const [level, setLevel] = useState('beginner')
  const [loading, setLoading] = useState(false)
  const [pathLoading, setPathLoading] = useState(false)
  const [error, setError] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedConcept, setSelectedConcept] = useState(null)
  const [hintIndex, setHintIndex] = useState(0)
  const [shownHints, setShownHints] = useState([])
  const [answer, setAnswer] = useState('')
  const [thinking, setThinking] = useState('')
  const [challengeResult, setChallengeResult] = useState(null)
  const [thinkResult, setThinkResult] = useState(null)
  const [toast, setToast] = useState('')
  const [apiReady, setApiReady] = useState(false)

  const refreshProgress = async () => {
    try {
      const nextProgress = await api.progress()
      setProgress(nextProgress)
      setSessionDetails((nextProgress.sessions || []).map((session) => ({ ...session, session_id: session.id })))
      setApiReady(true)
    } catch (err) {
      setApiReady(false)
      setError(err.message)
    }
  }
  useEffect(() => {
    refreshProgress()
    api.recommendations().then(setRecommendations).catch((err) => setError(err.message))
    const syncRoute = () => setPage(destinationByPath[window.location.pathname] || 'home')
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const navigate = (target) => {
    const nextPath = target === 'home' ? '/' : destinationPath[target]
    if (nextPath && window.location.pathname !== nextPath) window.history.pushState({}, '', nextPath)
    setPage(target)
    setMobileNav(false)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const startLesson = async (chosen = topic, targetPage = 'learn') => {
    setTopic(chosen); setLoading(true); setPathLoading(true); setError(''); setLesson(null); setChallengeResult(null); setThinkResult(null); setShownHints([]); setHintIndex(0); setAnswer(''); setThinking('')
    try {
      const data = await api.generate(chosen, level)
      const concepts = data.connect?.concepts || []
      if (concepts.length < 6 && !concepts.some((concept) => concept.name.toLowerCase() === 'real-world use')) {
        concepts.push({
          name: 'Real-world Use',
          description: 'Connect this idea to a practical situation and decide how it can help solve a real problem.',
          relation: `Apply ${data.topic} to the challenge rather than only describing it.`,
          use: data.apply.challenge,
        })
      }
      setLesson(data); setSelectedConcept(null); navigate(targetPage); await refreshProgress()
    }
    catch (err) { setError(err.message) } finally { setLoading(false); setPathLoading(false) }
  }
  const saveDimension = async (dimension, score = 78, completed = true) => {
    if (!lesson?.session_id) return
    try { await api.saveProgress(lesson.session_id, dimension, score, completed); await refreshProgress(); notify(`${dimension[0].toUpperCase() + dimension.slice(1)} progress saved`) }
    catch (err) { setError(err.message) }
  }
  const getHint = async () => {
    if (!lesson) return
    try { const result = await api.hint(lesson.topic, hintIndex, lesson.apply.hints, lesson.session_id); setShownHints((items) => [...items, result.hint]); setHintIndex((n) => n + 1); refreshProgress() }
    catch (err) { setError(err.message) }
  }
  const submitChallenge = async () => {
    if (!answer.trim()) return setError('Add a few lines about your approach before submitting.')
    setLoading(true); setError('')
    try { const result = await api.evaluate(lesson.topic, lesson.apply.challenge, answer, lesson.session_id); setChallengeResult(result); await refreshProgress() }
    catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  const submitThinking = async () => {
    if (!thinking.trim()) return setError('Share your reasoning before asking for feedback.')
    setLoading(true); setError('')
    try { const result = await api.think(lesson.topic, lesson.think.question, thinking, lesson.session_id); setThinkResult(result); await refreshProgress() }
    catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  const persistSavedItems = (items) => {
    setSavedItems(items)
    window.localStorage.setItem('learnforge:saved-items', JSON.stringify(items))
  }
  const toggleSavedTopic = (savedTopic) => {
    const exists = savedItems.some((item) => item.type === 'topic' && item.topic.toLowerCase() === savedTopic.toLowerCase())
    persistSavedItems(exists
      ? savedItems.filter((item) => !(item.type === 'topic' && item.topic.toLowerCase() === savedTopic.toLowerCase()))
      : [{ type: 'topic', topic: savedTopic, savedAt: new Date().toISOString() }, ...savedItems])
    notify(exists ? 'Topic removed from saved items' : 'Topic saved for later')
  }
  const saveConcept = (savedTopic, concept) => {
    const exists = savedItems.some((item) => item.type === 'concept' && item.topic === savedTopic && item.name === concept.name)
    persistSavedItems(exists
      ? savedItems.filter((item) => !(item.type === 'concept' && item.topic === savedTopic && item.name === concept.name))
      : [{ type: 'concept', topic: savedTopic, name: concept.name, description: concept.description, savedAt: new Date().toISOString() }, ...savedItems])
    notify(exists ? 'Concept removed from saved items' : 'Concept saved for later')
  }
  const isTopicSaved = (savedTopic) => savedItems.some((item) => item.type === 'topic' && item.topic.toLowerCase() === savedTopic.toLowerCase())
  const currentSession = sessionDetails.find((item) => item.session_id === lesson?.session_id) || sessionDetails[0] || null
  const handleStartLesson = (chosen, targetPage = 'learn') => {
    if (lesson?.topic.toLowerCase() === chosen.toLowerCase()) navigate(targetPage)
    else startLesson(chosen, targetPage)
  }

  return <div className="app-shell">
    <AnimatePresence>{page === 'home' ? <Landing key="landing" onStart={() => navigate('learn')} onExplore={() => navigate('studyPlan')} /> : <div key="workspace" className={`workspace ${sidebarCollapsed ? 'workspace-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <button className="brand" onClick={() => navigate('home')}><span className="brand-mark"><Atom size={19} /></span><span>learn<span className="brand-accent">forge</span><small>YOUR AI LEARNING STUDIO</small></span></button>
        <div className="side-label">WORKSPACE</div>
        <nav className="workspace-nav" aria-label="Workspace navigation">{destinations.map(({ id, label, icon: Icon }) => <button key={id} className={`side-link ${page === id ? 'active' : ''}`} onClick={() => navigate(id)}><Icon size={17} />{label}{id === 'saved' && savedItems.length > 0 && <span className="side-count">{savedItems.length}</span>}</button>)}</nav>
        <div className="side-label side-spaced">YOUR LEARNING</div>
        <div className="side-course"><span className="course-dot dot-violet" />Python <span>{progress?.skill_breakdown?.Python ?? defaultSkills.Python}%</span><div className="mini-progress"><i style={{ width: `${progress?.skill_breakdown?.Python ?? defaultSkills.Python}%` }} /></div></div>
        <div className="side-course"><span className="course-dot dot-blue" />SQL <span>{progress?.skill_breakdown?.SQL ?? defaultSkills.SQL}%</span><div className="mini-progress"><i style={{ width: `${progress?.skill_breakdown?.SQL ?? defaultSkills.SQL}%` }} /></div></div>
        <div className="side-course"><span className="course-dot dot-orange" />Machine Learning <span>{progress?.skill_breakdown?.['Machine Learning'] ?? defaultSkills['Machine Learning']}%</span><div className="mini-progress"><i style={{ width: `${progress?.skill_breakdown?.['Machine Learning'] ?? defaultSkills['Machine Learning']}%` }} /></div></div>
        <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-icon"><Sparkles size={16} /></div><b>Learning is a superpower.</b><p>Keep showing up. Your next breakthrough is closer than you think.</p><button onClick={() => startLesson('Python Loops')}>Continue learning <ArrowRight size={14} /></button></div><div className="profile-row"><div className="avatar">DL</div><div><b>Demo Learner</b><small>Curious mind · Level 4</small></div><button className="icon-button" title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => { if (window.innerWidth <= 820) setMobileNav(false); else setSidebarCollapsed((value) => !value) }}><PanelLeftClose size={16} /></button></div></div>
      </aside>
      {mobileNav && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19} /></button><div className="breadcrumb"><span>LearnForge</span><ChevronRight size={14} /><b>{pageTitles[page] || 'Dashboard'}</b></div><div className="top-right"><span className="streak-chip"><Flame size={15} /> {progress?.streak ?? 7} day streak</span><span className={`connection-pill ${apiReady ? 'connected' : ''}`}><i />{apiReady ? 'Synced' : 'Connecting'}</span><button className="profile-chip" onClick={() => navigate('progress')}><span className="avatar top-avatar">DL</span><span>Demo Learner</span><ChevronRight size={13} /></button></div></header>
        {error && <div className="error-banner"><CircleHelp size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}
        {page === 'dashboard' && <Dashboard progress={progress} recommendations={recommendations} onStart={startLesson} onNavigate={navigate} loading={loading} />}
        {page === 'studyPlan' && <StudyPlanPage progress={progress} sessionDetails={sessionDetails} topic={lesson?.topic || progress?.sessions?.[0]?.topic || 'Python Loops'} onStart={handleStartLesson} />}
        {page === 'progress' && <ProgressPage progress={progress} session={currentSession} onStart={startLesson} />}
        {page === 'saved' && <SavedPage items={savedItems} recentSessions={progress?.sessions || []} onStart={startLesson} onRemove={(item) => persistSavedItems(savedItems.filter((saved) => saved !== item))} />}
        {(page === 'learn' || page === 'conceptMap' || page === 'practice') && <LearningStudio topic={topic} setTopic={setTopic} level={level} setLevel={setLevel} lesson={lesson} loading={loading} pathLoading={pathLoading} onGenerate={(chosen) => startLesson(chosen, page)} selectedConcept={selectedConcept} setSelectedConcept={setSelectedConcept} saveDimension={saveDimension} getHint={getHint} shownHints={shownHints} canHint={!!lesson && hintIndex < lesson.apply.hints.length} answer={answer} setAnswer={setAnswer} submitChallenge={submitChallenge} challengeResult={challengeResult} thinking={thinking} setThinking={setThinking} submitThinking={submitThinking} thinkResult={thinkResult} onPickTopic={startLesson} viewMode={page === 'learn' ? 'all' : page === 'conceptMap' ? 'connect' : 'apply'} onNavigate={navigate} onToggleSaved={toggleSavedTopic} isTopicSaved={lesson ? isTopicSaved(lesson.topic) : false} onSaveConcept={saveConcept} />}
      </main>
    </div>}</AnimatePresence>
    <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><CheckCircle2 size={17} />{toast}</motion.div>}</AnimatePresence>
  </div>
}

function Landing({ onStart, onExplore }) {
  return <motion.div className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <nav className="landing-nav"><button className="brand" onClick={onStart}><span className="brand-mark"><Atom size={19} /></span><span>learn<span className="brand-accent">forge</span><small>YOUR AI LEARNING STUDIO</small></span></button><div className="landing-nav-links"><a href="#how">How it works</a><a href="#features">Why LearnForge</a><button className="nav-login" onClick={onExplore}>Open dashboard <ArrowRight size={15} /></button></div></nav>
    <section className="hero container"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-spark"><Sparkles size={13} /></span> THE NEXT CHAPTER OF LEARNING</div><h1>Don't just memorize.<br /><span>Learn to apply.</span></h1><p className="hero-sub">Turn what you study into what you <em>understand.</em> LearnForge helps you connect ideas, solve real problems, and think a little deeper.</p><div className="hero-actions"><button className="primary-button" onClick={onStart}>Start learning <ArrowRight size={17} /></button><button className="quiet-button" onClick={onExplore}><span className="play-circle"><Play size={12} fill="currentColor" /></span> Explore learning path</button></div><div className="hero-proof"><div className="proof-avatars"><span>J</span><span>M</span><span>A</span><span>+</span></div><p><b>Built for curious minds</b><br />Learn something that sticks.</p><span className="proof-sep" /><div className="proof-stat"><b>4.9</b><span>✦✦✦✦✦</span></div></div></div>
      <div className="hero-art"><div className="art-glow" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-center"><div className="center-icon"><Atom size={35} strokeWidth={1.5} /></div><span>LEARNFORGE AI</span><b>Ideas, connected.</b></div><div className="float-card float-understand"><div className="float-icon fi-violet"><Lightbulb size={16} /></div><div><b>Understand</b><small>Clear, simple explanations</small></div><Check size={15} className="float-check" /></div><div className="float-card float-connect"><div className="float-icon fi-blue"><Network size={16} /></div><div><b>Connect</b><small>See the bigger picture</small></div></div><div className="float-card float-apply"><div className="float-icon fi-orange"><Rocket size={16} /></div><div><b>Apply</b><small>Make knowledge useful</small></div></div><div className="float-card float-think"><div className="float-icon fi-green"><Brain size={16} /></div><div><b>Think deeper</b><small>Build lasting intuition</small></div></div><div className="art-star star-a">✦</div><div className="art-star star-b">✧</div></div>
    </section>
    <section className="stats-strip container"><div><b>One topic.</b><span>A whole new perspective.</span></div><div className="stats-divider" /><div className="stat-item"><b>4<span>×</span></b><small>ways to learn</small></div><div className="stat-item"><b>AI<span>+</span></b><small>built around you</small></div><div className="stat-item"><b>∞</b><small>connections to make</small></div><div className="stat-item"><b>1</b><small>curious you</small></div></section>
    <section className="cycle-section container" id="how"><div className="section-heading"><div className="eyebrow">A BETTER WAY TO LEARN</div><h2>From “I saw this” to <span>“I get it.”</span></h2><p>Four intentional steps turn new information into knowledge you can actually use.</p></div><div className="cycle-grid">{phases.map((item, i) => <div className={`cycle-card ${item.color}`} key={item.key}><div className="cycle-top"><span className="cycle-number">0{i + 1}</span><item.icon size={21} /></div><h3>{item.title}</h3><p>{['Get a clear explanation, built around your level and how you learn.','See how new ideas link to concepts you already know.','Work through a real challenge—with helpful hints, not spoilers.','Reflect, reason, and build understanding that lasts.'][i]}</p><div className="cycle-arrow">{i < 3 ? <ArrowRight size={16} /> : <Sparkles size={16} />}</div></div>)}</div></section>
    <section className="landing-cta container" id="features"><div><div className="eyebrow">YOUR NEXT “AHA!” MOMENT</div><h2>Learning should <span>go somewhere.</span></h2><p>Pick a topic. Forge your understanding. Keep the momentum.</p></div><button className="primary-button" onClick={onStart}>Start your learning path <ArrowRight size={17} /></button><div className="cta-orb" /></section>
    <footer className="landing-footer container"><button className="brand" onClick={onStart}><span className="brand-mark"><Atom size={17} /></span><span>learn<span className="brand-accent">forge</span></span></button><span>Understand. Connect. Apply. Think.</span><span>Made for curious minds <Sparkles size={13} /></span></footer>
  </motion.div>
}

function Dashboard({ progress, recommendations, onStart, onNavigate, loading }) {
  const skills = progress?.skill_breakdown || defaultSkills
  const activity = progress?.recent_activity || []
  const activityByDay = progress?.activity_by_day || chartData
  const activityTotal = activityByDay.reduce((total, item) => total + item.value, 0)
  const latestSession = progress?.sessions?.[0]
  const latestTopic = latestSession?.topic || 'Python Loops'
  return <motion.div className="page-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <div className="welcome-row"><div><div className="eyebrow">{dashboardDate}</div><h1>Good morning, <span>Demo Learner</span> <span className="wave">✦</span></h1><p>Small steps. Big understanding. Ready to keep your streak going?</p></div><button className="primary-button" onClick={() => onStart('Python Loops')}><Plus size={17} /> New learning path</button></div>
    <div className="metric-grid"><Metric icon={Flame} label="Learning streak" value={`${progress?.streak ?? 7} days`} meta="You're on a roll" color="orange" />
<Metric icon={BookOpen} label="Topics completed" value={progress?.topics_completed ?? 3} meta="Keep exploring" color="violet" />
<Metric icon={Target} label="Overall mastery" value={`${progress?.mastery ?? 68}%`} meta="Across all topics" color="green" />
<Metric icon={Zap} label="Challenge accuracy" value={`${progress?.challenge_accuracy ?? 78}%`} meta="Across attempts" color="blue" /></div>
    <div className="dashboard-grid"><section className="panel progress-panel"><div className="panel-heading"><div><span className="panel-kicker">YOUR MOMENTUM</span><h3>Learning activity</h3></div><button className="range-select">This week <ChevronRight size={14} /></button></div><div className="chart-summary"><b>{activityTotal} <small>{activityTotal === 1 ? 'moment' : 'moments'}</small></b><small>logged this week</small></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={activityByDay} margin={{ top: 12, right: 4, left: -26, bottom: 0 }}><defs><linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9b7bff" stopOpacity={0.25} /><stop offset="95%" stopColor="#9b7bff" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#ffffff0c" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6f7382', fontSize: 11 }} dy={10} /><Tooltip contentStyle={{ background: '#191b27', border: '1px solid #303242', borderRadius: 12, color: '#fff' }} formatter={(value) => [`${value} ${value === 1 ? 'moment' : 'moments'}`, 'Learning activity']} /><Area type="monotone" dataKey="value" stroke="#a58aff" strokeWidth={2.5} fill="url(#activityFill)" activeDot={{ r: 5, fill: '#bb9dff', stroke: '#211735', strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div><div className="chart-legend"><span><i />Learning activity</span><span>Events recorded <b>{activityTotal}</b></span></div></section>
      <section className="panel mastery-panel"><div className="panel-heading"><div><span className="panel-kicker">SKILL BREAKDOWN</span><h3>Growing your skills</h3></div><button className="more-button" aria-label="More options">···</button></div><div className="skill-list">{Object.entries(skills).map(([name, value], i) => <div className="skill-row" key={name}><div className="skill-title"><span className={`skill-icon skill-${i}`}><Code2 size={15} /></span><b>{name}</b><span>{value}%</span></div><div className="skill-bar"><i style={{ width: `${value}%` }} className={`bar-${i}`} /></div><small>{value > 75 ? 'Strong foundation' : value > 50 ? 'Building confidence' : 'Ready to explore'}</small></div>)}</div><button className="text-link" onClick={() => onStart('Python Loops')}>View learning path <ArrowRight size={14} /></button></section></div>
    <div className="dashboard-grid lower-grid"><section className="panel continue-panel"><div className="panel-heading"><div><span className="panel-kicker">PICK UP WHERE YOU LEFT OFF</span><h3>Continue learning</h3></div><button className="text-link" onClick={() => onNavigate('studyPlan')}>View study plan <ArrowRight size={14} /></button></div><div className="continue-card"><div className="continue-art"><div className="code-glyph">{'{ }'}</div><span className="art-spark">✦</span></div><div className="continue-info"><div className="tag tag-violet">YOUR LATEST LEARNING PATH</div><h4>{latestTopic}</h4><p>{latestSession ? 'Continue the path you were working on most recently.' : 'Iteration is the secret to doing more with less code.'}</p><div className="continue-progress"><div className="skill-bar"><i style={{ width: `${latestSession?.mastery ?? 68}%` }} /></div><small>{Math.round(latestSession?.mastery ?? 68)}% mastery</small></div><button className="small-primary" onClick={() => onStart(latestTopic)} disabled={loading}>{loading ? <LoaderCircle size={15} className="spin" /> : <Play size={13} fill="currentColor" />} Continue path</button></div><div className="continue-badge"><div className="ring"><span>{Math.round(latestSession?.mastery ?? 68)}<small>%</small></span></div><small>MASTERY</small></div></div></section>
      <section className="panel activity-panel"><div className="panel-heading"><div><span className="panel-kicker">YOUR RECENT WINS</span><h3>Recent activity</h3></div><button className="more-button" aria-label="More options">···</button></div><div className="activity-list">{activity.slice(0, 4).map((item, i) => <div className="activity-item" key={`${item.title}-${i}`}><div className={`activity-icon activity-${item.kind || 'start'}`}>{item.kind === 'complete' ? <Check size={14} /> : item.kind === 'hint' ? <Lightbulb size={14} /> : <BookOpen size={14} />}</div><div><b>{item.title}</b><small>{item.time}</small></div></div>)}{activity.length === 0 && <p className="muted">Your learning activity will appear here.</p>}</div></section></div>
    <div className="section-line"><div><span className="panel-kicker">CURATED FOR YOUR NEXT STEP</span><h3>Recommended for you</h3></div><button className="text-link" onClick={() => onStart('Python Lists')}>Explore topics <ArrowRight size={14} /></button></div><div className="recommend-grid">{(recommendations.length ? recommendations : [{ title: 'Python Lists', category: 'Programming', reason: 'Build on your loop skills by working with the collections they process.', level: 'Beginner', duration: '12 min', icon: 'brackets' }, { title: 'SQL Basics', category: 'Data', reason: 'Learn to ask powerful questions of your data.', level: 'Beginner', duration: '15 min', icon: 'database' }, { title: 'Machine Learning Basics', category: 'AI', reason: 'Connect algorithms, data, and real-world predictions.', level: 'Intermediate', duration: '18 min', icon: 'brain' }]).map((item, i) => <button className="recommend-card" key={item.title} onClick={() => onStart(item.title)}><div className={`recommend-icon ri-${i}`}><RecommendationIcon index={i} /></div><div className="recommend-meta"><span>{item.category}</span><span>·</span><span><Clock3 size={12} /> {item.duration}</span></div><h4>{item.title}</h4><p>{item.reason}</p><div className="recommend-bottom"><span className="difficulty">{item.level}</span><span className="round-arrow"><ArrowRight size={15} /></span></div></button>)}</div>
  </motion.div>
}

function Metric({ icon: Icon, label, value, meta, color }) { return <div className="metric-card"><div className={`metric-icon mi-${color}`}><Icon size={17} /></div><div className="metric-label">{label}</div><b className="metric-value">{value}</b><small>{meta}</small><div className={`metric-decoration deco-${color}`} /></div> }
function RecommendationIcon({ index }) { return index === 0 ? <Code2 size={20} /> : index === 1 ? <BarChart3 size={20} /> : <Brain size={20} /> }

function LearningStudio({ topic, setTopic, level, setLevel, lesson, loading, pathLoading, onGenerate, selectedConcept, setSelectedConcept, saveDimension, getHint, shownHints, canHint, answer, setAnswer, submitChallenge, challengeResult, thinking, setThinking, submitThinking, thinkResult, onPickTopic, viewMode = 'all', onNavigate, onToggleSaved, isTopicSaved, onSaveConcept }) {
  const [activePhase, setActivePhase] = useState('understand')
  useEffect(() => { if (lesson) setActivePhase('understand') }, [lesson?.session_id])
  const jumpTo = (key) => { setActivePhase(key); document.getElementById(`phase-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  return <motion.div className={`page-content learning-page ${lesson ? 'has-lesson' : ''} ${viewMode === 'connect' ? 'focus-connect' : viewMode === 'apply' ? 'focus-practice' : ''}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <div className="learning-head"><div><div className="eyebrow">{viewMode === 'connect' ? 'EXPLORE HOW IDEAS FIT TOGETHER' : viewMode === 'apply' ? 'TURN UNDERSTANDING INTO SKILL' : 'THE LEARNING STUDIO'}</div><h1>{viewMode === 'connect' ? <>Ideas <span>in relation.</span></> : viewMode === 'apply' ? <>Practice in the <span>real world.</span></> : <>Make it <span>make sense.</span></>}</h1><p>{viewMode === 'connect' ? `Explore the concepts connected to ${lesson?.topic || 'your topic'}.` : viewMode === 'apply' ? 'Work through a realistic challenge with progressive hints and thoughtful feedback.' : 'One topic at a time. Four ways to make it yours.'}</p></div><div className="studio-head-actions">{lesson && <div className="lesson-source"><span className="live-dot" />{lesson.source === 'ai' ? 'AI-PERSONALIZED' : 'DEMO LESSON'}<span className="lesson-dot">·</span>{lesson.level}</div>}{lesson && <button className={`save-topic-button ${isTopicSaved ? 'is-saved' : ''}`} onClick={() => onToggleSaved(lesson.topic)}><Bookmark size={15} fill={isTopicSaved ? 'currentColor' : 'none'} />{isTopicSaved ? 'Saved' : 'Save topic'}</button>}{viewMode !== 'all' && <button className="quiet-button" onClick={() => onNavigate('learn')}>Change topic <ArrowRight size={14} /></button>}</div></div>
    <section className="topic-entry panel"><div className="topic-entry-copy"><div className="input-label"><Sparkles size={15} /> WHAT ARE YOU CURIOUS ABOUT?</div><h2>Start with a topic.<br /><span>Leave with understanding.</span></h2><p>LearnForge builds a learning path that meets you where you are.</p><div className="topic-fields"><label className="topic-input-wrap"><span>TOPIC</span><input value={topic} maxLength={120} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onGenerate(topic)} placeholder="e.g. Python loops" /><BookOpen size={17} /></label><div className="level-select"><span>YOUR LEVEL</span><div>{['beginner', 'intermediate', 'advanced'].map((item) => <button type="button" className={level === item ? 'selected' : ''} key={item} onClick={() => setLevel(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div></div><button className="primary-button generate-button" onClick={() => onGenerate(topic)} disabled={loading || topic.trim().length < 2}>{pathLoading ? <><LoaderCircle size={17} className="spin" /> Building your path…</> : <>Build my learning path <ArrowRight size={17} /></>}</button></div><div className="quick-topics"><span>TRY A TOPIC</span>{quickTopics.map((item) => <button onClick={() => { setTopic(item); onGenerate(item) }} key={item}>{item}</button>)}</div></div><div className="topic-art"><div className="topic-orbit orbit-a" /><div className="topic-orbit orbit-b" /><div className="topic-hex"><Atom size={36} /></div><div className="topic-node tn-1"><Lightbulb size={17} /></div><div className="topic-node tn-2"><Network size={17} /></div><div className="topic-node tn-3"><Rocket size={17} /></div><div className="topic-node tn-4"><Brain size={17} /></div><div className="topic-art-caption"><span>YOUR LEARNING PATH</span><b>Curiosity → capability</b></div></div></section>
    {!lesson && !loading && <div className="empty-learning"><div className="empty-icon"><GraduationCap size={22} /></div><div><b>Your learning path is waiting.</b><p>Choose a topic above to reveal a guided experience with explanations, connections, challenges, and reflection.</p></div><div className="empty-stages">{phases.map((p, i) => <span key={p.key}><i>{i + 1}</i>{p.title}</span>)}</div></div>}
    {pathLoading && <div className="loading-path"><div className="loading-orb"><Sparkles size={24} /></div><b>Forging your learning path</b><p>Finding the right connections and a challenge for your level…</p><div className="skeleton-line" /><div className="skeleton-line short" /></div>}
    {lesson && <>
      <div className="journey-bar"><div className="journey-label"><span className="live-dot" /> YOUR LEARNING JOURNEY</div><div className="journey-steps">{phases.map((phase, i) => <button onClick={() => jumpTo(phase.key)} className={activePhase === phase.key ? `journey-active ${phase.color}` : ''} key={phase.key}><span>{i + 1}</span>{phase.title}{i < 3 && <i className="journey-connector" />}</button>)}</div></div>
      <section className="learn-section understand-section" id="phase-understand"><SectionHead phase={phases[0]} number="01" title="Let's make it click." description="A clear explanation, without the textbook fog." /><div className="understand-grid"><article className="understand-main panel"><div className="mini-eyebrow"><Lightbulb size={14} /> THE BIG IDEA</div><h3>{lesson.understand.explanation}</h3><div className="analogy-block"><span className="analogy-icon">✳</span><div><b>Think of it like this</b><p>{lesson.understand.analogy}</p></div></div>{lesson.understand.key_points?.length > 0 && <div className="key-points"><b>Keep in mind</b>{lesson.understand.key_points.map((point) => <span key={point}><CheckCircle2 size={14} />{point}</span>)}</div>}</article><aside className="example-card panel"><div className="example-head"><span><Code2 size={14} /> QUICK EXAMPLE</span><span className="language-pill">{lesson.understand.code ? 'PYTHON' : 'CONCEPT'}</span></div><div className="code-window"><div className="code-dots"><i /><i /><i /><span>example.py</span></div><pre>{lesson.understand.code || lesson.understand.example}</pre></div><p>{lesson.understand.example}</p>{lesson.understand.mistakes?.length > 0 && <div className="mistake-note"><CircleHelp size={14} /><span><b>Watch out:</b> {lesson.understand.mistakes[0]}</span></div>}</aside></div><div className="phase-action"><span>Got the gist? Take a moment to make the idea your own.</span><button onClick={() => saveDimension('understanding', 82)} className="subtle-button"><Check size={15} /> I understand this <ArrowRight size={14} /></button></div></section>
      <section className="learn-section connect-section" id="phase-connect"><SectionHead phase={phases[1]} number="02" title="Everything connects." description="New knowledge sticks when it has somewhere to land." /><div className="connect-layout panel"><div className="graph-wrap"><div className="graph-glow" /><svg className="graph-lines" viewBox="0 0 600 340" preserveAspectRatio="none" aria-hidden="true"><line x1="300" y1="170" x2="120" y2="70" /><line x1="300" y1="170" x2="480" y2="65" /><line x1="300" y1="170" x2="105" y2="270" /><line x1="300" y1="170" x2="495" y2="265" /><line x1="300" y1="170" x2="300" y2="40" /><line x1="300" y1="170" x2="300" y2="310" /></svg><div className="graph-center"><Atom size={19} /><span>{lesson.topic}</span></div>{(lesson.connect.concepts || []).slice(0, 6).map((concept, i) => <button className={`graph-node node-${i} ${selectedConcept?.name === concept.name ? 'node-selected' : ''}`} key={concept.name} onClick={() => { setSelectedConcept(concept); saveDimension('connections', 72, false) }}><span className={`node-dot nd-${i}`} />{concept.name}<ChevronRight size={13} /></button>)}<div className="graph-hint"><span className="graph-legend-dot" /> Click a concept to explore the connection</div></div><div className="concept-detail">{selectedConcept ? <motion.div key={selectedConcept.name} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}><div className="detail-overline"><Network size={14} /> CONNECTED CONCEPT</div><h3>{selectedConcept.name}</h3><p>{selectedConcept.description}</p><div className="relation-box"><span>WHY IT'S CONNECTED</span><b>{selectedConcept.relation}</b></div><div className="relation-box relation-use"><span>WHEN IT'S USEFUL</span><b>{selectedConcept.use}</b></div><div className="concept-detail-actions"><button className="text-link" onClick={() => saveDimension('connections', 85)}>I see the connection <ArrowRight size={14} /></button><button className="concept-save" onClick={() => onSaveConcept(lesson.topic, selectedConcept)}><Bookmark size={14} />Save concept</button></div></motion.div> : <div className="concept-prompt"><div className="prompt-icon"><Network size={19} /></div><b>Pick a connection.</b><p>Explore the ideas linked to {lesson.topic} and see how they work together.</p><div className="connection-count"><span>{lesson.connect.concepts?.length || 0}</span> connected concepts</div></div>}</div></div><div className="relationship-chips">{(lesson.connect.relationships || []).slice(0, 5).map((rel, i) => <span key={`${rel.to}-${i}`}><b>{rel.from}</b><ArrowRight size={12} />{rel.label}<ArrowRight size={12} /><b>{rel.to}</b></span>)}</div></section>
      <section className="learn-section apply-section" id="phase-apply"><SectionHead phase={phases[2]} number="03" title="Knowledge in the wild." description="A real-world challenge. Your brain does the building." /><div className="challenge-layout"><div className="challenge-card panel"><div className="challenge-card-top"><span className="challenge-label"><Target size={14} /> YOUR CHALLENGE</span><span className="difficulty"><i />{lesson.apply.difficulty || lesson.level}</span></div><h3>{lesson.apply.challenge}</h3><div className="thinking-prompt"><Lightbulb size={15} /><span>Before you type: what pieces of {lesson.topic} might help you here?</span></div><label className="answer-label" htmlFor="challenge-answer">YOUR APPROACH</label><textarea id="challenge-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your code, outline your steps, or explain how you'd approach this…" rows={5} maxLength={5000} /><div className="answer-footer"><span>{answer.length} / 5000</span><button className="primary-button submit-button" onClick={submitChallenge} disabled={loading || !answer.trim()}>{loading ? <LoaderCircle size={15} className="spin" /> : <Send size={14} />} Submit for feedback</button></div>{challengeResult && <FeedbackCard result={challengeResult} title="Challenge feedback" />}</div><aside className="hint-card panel"><div className="hint-heading"><div className="hint-icon"><Lightbulb size={17} /></div><div><b>Stuck? That's learning.</b><small>Hints nudge you forward—no spoilers.</small></div></div><div className="hint-progress">{lesson.apply.hints.map((_, i) => <span key={i} className={i < shownHints.length ? 'hint-used' : ''}><i>{i < shownHints.length ? <Check size={11} /> : i + 1}</i> Hint {i + 1}{i < lesson.apply.hints.length - 1 && <b />}</span>)}</div><div className="hints-list">{shownHints.map((hint, i) => <motion.div className="shown-hint" key={i} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}><span>{i + 1}</span>{hint}</motion.div>)}{shownHints.length === 0 && <div className="hint-empty"><Sparkles size={17} /><p>Try it yourself first. Your first nudge is right here when you need it.</p></div>}</div><button className="hint-button" onClick={getHint} disabled={!canHint}><Lightbulb size={15} />{canHint ? shownHints.length ? 'Get next hint' : 'Reveal a hint' : 'All hints revealed'}</button><small className="hint-footnote">You have {Math.max(0, lesson.apply.hints.length - shownHints.length)} hints remaining</small></aside></div><div className="phase-action"><span>Progress, not perfection. Every attempt counts.</span><button onClick={() => saveDimension('application', challengeResult?.score || 55, false)} className="subtle-button"><Check size={15} /> Mark as practiced <ArrowRight size={14} /></button></div></section>
      <section className="learn-section think-section" id="phase-think"><SectionHead phase={phases[3]} number="04" title="Now think a little deeper." description="The best understanding survives a good question." /><div className="think-card panel"><div className="think-illustration"><div className="think-orbit" /><div className="think-brain"><Brain size={30} /></div><span className="think-star ts-1">✦</span><span className="think-star ts-2">✧</span></div><div className="think-content"><div className="mini-eyebrow"><MessageCircle size={14} /> A QUESTION TO SIT WITH</div><h3>{lesson.think.question}</h3><label className="answer-label" htmlFor="think-response">YOUR REASONING</label><textarea id="think-response" value={thinking} onChange={(e) => setThinking(e.target.value)} placeholder="There's no single perfect answer. Show us how you're thinking about it…" rows={4} maxLength={3000} /><div className="answer-footer"><span>{thinking.length} / 3000</span><button className="primary-button submit-button" onClick={submitThinking} disabled={loading || !thinking.trim()}>{loading ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={14} />} Get AI feedback</button></div>{thinkResult && <FeedbackCard result={thinkResult} title="Reasoning review" />}</div></div><div className="complete-banner"><div className="complete-icon"><Award size={18} /></div><div><b>You've made it through the forge.</b><span>Understanding, connections, application, reflection—this is how knowledge sticks.</span></div><button onClick={() => { saveDimension('thinking', thinkResult?.score || 60, true); onPickTopic('Python Lists') }}>See what's next <ArrowRight size={14} /></button></div></section>
    </>}
  </motion.div>
}

function SectionHead({ phase, number, title, description }) { const Icon = phase.icon; return <div className="section-head"><div className={`section-index index-${phase.color}`}><span>{number}</span><Icon size={17} /></div><div><div className="section-kicker">{phase.title.toUpperCase()}</div><h2>{title}</h2><p>{description}</p></div></div> }
function FeedbackCard({ result, title }) { return <motion.div className="feedback-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><div className="feedback-score"><span>{Math.round(result.score)}</span><small>/ 100</small></div><div className="feedback-body"><div className="feedback-title"><CheckCircle2 size={16} />{title}<span className={`feedback-source ${result.source === 'ai' ? 'source-ai' : ''}`}>{result.source === 'ai' ? 'AI REVIEW' : 'DEMO REVIEW'}</span></div><p>{result.feedback || 'Good effort. Keep exploring your reasoning.'}</p>{result.strengths?.length > 0 && <div className="feedback-strength"><Check size={13} />{result.strengths.join(' ')}</div>}<div className="feedback-improve"><ArrowUpRight size={13} />{result.improvement}</div></div></motion.div> }

export default App
