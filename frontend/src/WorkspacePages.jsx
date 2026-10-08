import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { ArrowRight, Award, Bookmark, BookOpen, Brain, Check, CheckCircle2, ChevronRight, Clock3, Flame, Lightbulb, Network, Play, Rocket, Sparkles, Target, TrendingUp } from 'lucide-react'

const studyDays = [
  { title: 'Understand Loops', duration: 45, dimension: 'understanding', objective: 'Explain iteration and choose between for and while loops.', phase: 'learn', threshold: 1 },
  { title: 'Practice Basic Problems', duration: 45, dimension: 'application', objective: 'Trace loop state and solve a small counting problem.', phase: 'practice', threshold: 1 },
  { title: 'Connect Lists + Loops', duration: 40, dimension: 'connections', objective: 'Describe how iteration processes items in a collection.', phase: 'conceptMap', threshold: 1 },
  { title: 'Loops with Conditions', duration: 40, dimension: 'connections', objective: 'Use a condition to decide what happens during each iteration.', phase: 'conceptMap', threshold: 45 },
  { title: 'Nested Loops', duration: 45, dimension: 'application', objective: 'Reason about an outer and inner loop working together.', phase: 'practice', threshold: 45 },
  { title: 'Real-world Challenge', duration: 45, dimension: 'application', objective: 'Apply loops to a realistic task and refine your approach.', phase: 'practice', threshold: 70 },
  { title: 'Assessment + Reflection', duration: 30, dimension: 'mastery', objective: 'Review your progress and explain what you can now do.', phase: 'learn', threshold: 75 },
]

function daysForTopic(topic) {
  const normalized = topic.toLowerCase()
  let titles
  let objectives
  if (normalized.includes('sql')) {
    titles = ['Understand SQL Queries', 'Practice Filtering Rows', 'Connect Tables + Queries', 'Group and Summarize Data', 'Combine Query Patterns', 'Real-world Data Challenge', 'Assessment + Reflection']
    objectives = ['Explain how SELECT, FROM, and WHERE answer a data question.', 'Filter records with clear conditions and check the returned rows.', 'Describe how a query connects related tables and fields.', 'Summarize records with grouping and aggregate functions.', 'Combine filters, groups, and joins into a useful query.', 'Use a query to answer a realistic question about a dataset.', 'Review your SQL reasoning and reflect on what the results show.']
  } else if (normalized.includes('machine learning')) {
    titles = ['Understand Model Learning', 'Practice with Training Data', 'Connect Features + Labels', 'Evaluate Model Results', 'Compare Learning Patterns', 'Real-world Prediction Challenge', 'Assessment + Reflection']
    objectives = ['Explain how a model learns patterns from examples.', 'Separate examples into training and evaluation data.', 'Describe how features and labels guide a prediction.', 'Use evaluation results to reason about model performance.', 'Compare learning approaches and identify likely trade-offs.', 'Apply a model prediction to a realistic scenario.', 'Review what the model learned and where it may fail.']
  } else if (!normalized.includes('loop')) {
    titles = [`Understand ${topic}`, `Practice ${topic} Basics`, `Connect Related Concepts`, 'Build on the Core Idea', 'Combine Learning Patterns', 'Real-world Challenge', 'Assessment + Reflection']
    objectives = [`Explain the core idea behind ${topic}.`, `Practice the key steps and check your reasoning.`, 'Describe how this topic connects to related concepts.', 'Apply the idea in a slightly more complex case.', 'Combine concepts to solve a multi-step problem.', 'Apply your learning to a realistic situation.', 'Review your progress and explain what you can now do.']
  }
  return titles ? studyDays.map((day, index) => ({ ...day, title: titles[index], objective: objectives[index] })) : studyDays
}

const dimensions = [
  { key: 'understanding', label: 'Understanding', icon: Lightbulb, color: 'violet', weight: 25 },
  { key: 'connections', label: 'Connections', icon: Network, color: 'blue', weight: 20 },
  { key: 'application', label: 'Application', icon: Rocket, color: 'orange', weight: 35 },
  { key: 'thinking', label: 'Thinking', icon: Brain, color: 'green', weight: 20 },
]

function PageHeading({ eyebrow, title, description, action }) {
  return <div className="workspace-page-heading">
    <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    {action}
  </div>
}

function scoreFor(day, sessions, topic) {
  const topicSessions = sessions.filter((session) => session.topic?.toLowerCase() === topic.toLowerCase())
  if (topicSessions.length === 0) return 0
  return Math.max(...topicSessions.map((session) => day.dimension === 'mastery' ? session.mastery || 0 : session[day.dimension] || 0))
}

function getDayStatuses(days, sessions, topic) {
  const statuses = []
  days.forEach((day) => {
    const previousDaysComplete = statuses.length === 0 || statuses[statuses.length - 1]
    statuses.push(previousDaysComplete && scoreFor(day, sessions, topic) >= day.threshold)
  })
  return statuses
}

export function StudyPlanPage({ progress, sessionDetails, topic, onStart }) {
  const [selectedTopic, setSelectedTopic] = useState(topic)
  useEffect(() => setSelectedTopic(topic), [topic])
  const days = daysForTopic(selectedTopic)
  const topicSessions = sessionDetails.filter((session) => session.topic?.toLowerCase() === selectedTopic.toLowerCase())
  const latestTopicSession = topicSessions[0]
  const statuses = getDayStatuses(days, sessionDetails, selectedTopic)
  const totalMinutes = days.reduce((total, day) => total + day.duration, 0)
  const nextDay = statuses.findIndex((complete) => !complete)
  const currentDay = nextDay < 0 ? days.length : nextDay
  const needsReview = (progress?.challenge_accuracy ?? 78) < 65 || ((progress?.hints_used ?? 0) >= 8 && (latestTopicSession?.application ?? 0) < 50)
  const learningTopics = [...new Set(['Python Loops', 'SQL Basics', 'Machine Learning Basics', topic])]

  return <motion.div className="page-content workspace-page study-plan-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeading eyebrow="YOUR NEXT STEPS" title={<>Your personalized <span>study plan.</span></>} description="A focused seven-day path that adjusts to the skills you are building." action={<div className="plan-streak"><Flame size={16} />{progress?.streak ?? 7}<span>day streak</span></div>} />
    <section className="plan-overview panel">
      <div className="plan-overview-copy"><div className="panel-kicker">CURRENT LEARNING PATH</div><h2>{selectedTopic}</h2><p>Short, deliberate sessions turn a new idea into something you can use.</p>
        <div className="plan-topic-select" aria-label="Choose a study plan topic">{learningTopics.map((item) => <button className={selectedTopic === item ? 'selected' : ''} key={item} onClick={() => setSelectedTopic(item)}>{item}</button>)}</div>
      </div>
      <div className="plan-overview-stats"><div><b>{statuses.filter(Boolean).length}<small> / 7</small></b><span>days completed</span></div><div className="plan-progress-track"><i style={{ width: `${statuses.filter(Boolean).length / days.length * 100}%` }} /></div><small>{currentDay < 7 ? `Up next: Day ${currentDay + 1}` : 'All milestones complete — keep exploring!'}</small></div>
    </section>
    {needsReview && <div className="adaptive-note"><Sparkles size={16} /><span><b>Your plan is adapting.</b> We added extra practice because recent challenge results suggest a little more repetition will help.</span></div>}
    <div className="plan-section-heading"><div><span className="panel-kicker">THE 7-DAY PATH</span><h2>Build understanding, one session at a time</h2></div><span className="plan-time"><Clock3 size={14} />{Math.floor(totalMinutes / 60)} hr {totalMinutes % 60} min total</span></div>
    <div className="study-day-list">{days.map((day, index) => {
      const complete = statuses[index]
      const active = !complete && index === currentDay
      const Icon = index === 0 ? Lightbulb : index === 1 || index === 4 || index === 5 ? Rocket : index === 2 || index === 3 ? Network : Brain
      return <article className={`study-day panel ${complete ? 'day-complete' : active ? 'day-active' : ''}`} key={day.title}>
        <div className="study-day-number">{complete ? <Check size={17} /> : `0${index + 1}`}</div>
        <div className={`study-day-icon day-icon-${index % 4}`}><Icon size={18} /></div>
        <div className="study-day-info"><div className="study-day-title"><h3>{day.title}</h3><span className={`day-status ${complete ? 'complete' : active ? 'current' : ''}`}>{complete ? 'Completed' : active ? 'Up next' : 'Planned'}</span></div><p>{day.objective}</p><div className="study-day-meta"><span><Clock3 size={13} />{day.duration} min</span><span>{day.dimension === 'mastery' ? 'Reflection' : dimensions.find((item) => item.key === day.dimension)?.label}</span><span>Day {index + 1}</span></div></div>
        <button className={active ? 'primary-button study-day-action' : 'study-day-link'} onClick={() => onStart(selectedTopic, day.phase)}>{complete ? 'Review' : active ? 'Continue' : 'Start'} <ArrowRight size={15} /></button>
      </article>
    })}</div>
  </motion.div>
}

function ScoreBar({ item, value }) {
  const Icon = item.icon
  return <div className="dimension-row">
    <div className={`dimension-icon dimension-${item.color}`}><Icon size={16} /></div>
    <div className="dimension-info"><div><b>{item.label}</b><span>{Math.round(value)}%</span></div><div className="dimension-track"><i className={`dimension-fill fill-${item.color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div><small>{item.weight}% of mastery</small></div>
  </div>
}

export function ProgressPage({ progress, session, sessionDetails, onStart }) {
  const mastery = progress?.mastery ?? 68
  const scores = Object.fromEntries(dimensions.map((item) => [item.key, session?.[item.key] ?? 0]))
  const weightedMastery = Math.round(dimensions.reduce((total, item) => total + scores[item.key] * item.weight / 100, 0))
  const activity = progress?.activity_by_day || []
  const topicScores = progress?.skill_breakdown || { Python: 82, SQL: 61, 'Machine Learning': 42 }
  const achievements = progress?.achievements || []

  return <motion.div className="page-content workspace-page progress-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeading eyebrow="YOUR LEARNING, MADE VISIBLE" title={<>Progress that reflects <span>understanding.</span></>} description="Mastery grows through understanding, connections, application, and thoughtful reflection." action={<button className="primary-button" onClick={() => onStart('Python Loops')}><Play size={15} fill="currentColor" />Continue learning</button>} />
    <section className="progress-hero panel"><div className="progress-hero-score"><div className="progress-ring" style={{ '--score': `${mastery}%` }}><div><b>{mastery}%</b><small>overall mastery</small></div></div><div><span className="panel-kicker">YOUR MASTERY</span><h2>Knowledge you can use.</h2><p>Your overall score combines all four learning dimensions.</p></div></div><div className="mastery-formula">{dimensions.map((item, index) => <span key={item.key}>{item.label}{index < dimensions.length - 1 && <i>+</i>}</span>)}<b>{weightedMastery}%</b></div></section>
    <div className="progress-detail-grid">
      <section className="panel dimension-panel"><div className="panel-heading"><div><span className="panel-kicker">MASTERY BREAKDOWN</span><h3>Four dimensions, one strong foundation</h3></div><span className="current-topic-pill">{session?.topic || 'Across your learning'}</span></div><div className="dimension-list">{dimensions.map((item) => <ScoreBar key={item.key} item={item} value={scores[item.key]} />)}</div><div className="dimension-footnote"><CheckCircle2 size={14} />Scores reflect your latest learning session.</div></section>
      <section className="panel topic-mastery-panel"><div className="panel-heading"><div><span className="panel-kicker">TOPIC MASTERY</span><h3>Skills in motion</h3></div><TrendingUp size={17} /></div><div className="topic-mastery-list">{Object.entries(topicScores).map(([name, score], index) => <div className="topic-mastery-row" key={name}><div><span className={`topic-mastery-dot topic-dot-${index % 3}`} /><b>{name}</b><strong>{score}%</strong></div><div className="dimension-track"><i style={{ width: `${score}%` }} className={`dimension-fill fill-${['violet', 'blue', 'orange'][index % 3]}`} /></div></div>)}</div><div className="practice-stats"><div><Target size={15} /><b>{progress?.challenge_accuracy ?? 78}%</b><span>practice accuracy</span></div><div><Flame size={15} /><b>{progress?.streak ?? 7} days</b><span>current streak</span></div></div></section>
    </div>
    <div className="progress-detail-grid progress-lower-grid">
      <section className="panel progress-activity-panel"><div className="panel-heading"><div><span className="panel-kicker">WEEKLY IMPROVEMENT</span><h3>Learning activity</h3></div><span className="activity-total">{activity.reduce((sum, item) => sum + item.value, 0)} moments</span></div><div className="progress-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={activity} margin={{ top: 12, right: 10, left: -22, bottom: 0 }}><defs><linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9977ff" stopOpacity={0.28} /><stop offset="100%" stopColor="#9977ff" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#ffffff0c" vertical={false} /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#838594', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#191b27', border: '1px solid #303242', borderRadius: 12, color: '#fff' }} /><Area type="monotone" dataKey="value" stroke="#ac91ff" strokeWidth={2.5} fill="url(#progressFill)" /></AreaChart></ResponsiveContainer></div></section>
      <section className="panel achievements-panel"><div className="panel-heading"><div><span className="panel-kicker">MILESTONES</span><h3>Recent achievements</h3></div><Award size={17} /></div>{achievements.length ? <div className="achievement-list">{achievements.map((achievement) => <div className="achievement-row" key={achievement.title}><span><Award size={16} /></span><div><b>{achievement.title}</b><small>{achievement.description}</small></div></div>)}</div> : <div className="empty-inline"><Sparkles size={17} />Your achievements will appear here as you learn.</div>}</section>
    </div>
    <div className="progress-next-step"><div><span className="panel-kicker">KEEP YOUR MOMENTUM</span><h3>Small steps add up to real mastery.</h3></div><button className="text-link" onClick={() => onStart('Python Loops')}>Continue your path <ArrowRight size={15} /></button></div>
  </motion.div>
}

export function SavedPage({ items, recentSessions, onStart, onRemove }) {
  const savedTopics = items.filter((item) => item.type === 'topic')
  const concepts = items.filter((item) => item.type === 'concept')
  const recentTopics = [...new Map(recentSessions.filter((session) => session.topic).map((session) => [session.topic, session])).values()]
  return <motion.div className="page-content workspace-page saved-page" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeading eyebrow="YOUR PERSONAL LIBRARY" title={<>Saved for your <span>next aha.</span></>} description="Keep useful topics and connected concepts close at hand." />
    <div className="saved-section-heading"><div><span className="panel-kicker">YOUR BOOKMARKS</span><h2>Saved topics <span>{savedTopics.length}</span></h2></div></div>
    {savedTopics.length ? <div className="saved-card-grid">{savedTopics.map((item) => <article className="saved-card panel" key={`topic-${item.topic}`}><div className="saved-card-icon"><BookOpen size={18} /></div><div><span className="panel-kicker">LEARNING TOPIC</span><h3>{item.topic}</h3><p>Continue building understanding across all four stages.</p></div><div className="saved-card-actions"><button className="small-primary" onClick={() => onStart(item.topic)}>Open path <ArrowRight size={14} /></button><button className="saved-remove" onClick={() => onRemove(item)} aria-label={`Remove ${item.topic} from saved topics`}>Remove</button></div></article>)}</div> : <div className="saved-empty panel"><div><Bookmark size={20} /></div><h3>Your library starts with curiosity.</h3><p>Save a topic from Learning Studio to keep it here for your next session.</p><button className="text-link" onClick={() => onStart('Python Loops')}>Explore Python Loops <ArrowRight size={14} /></button></div>}
    <div className="saved-section-heading saved-subheading"><div><span className="panel-kicker">CONNECTED IDEAS</span><h2>Bookmarked concepts <span>{concepts.length}</span></h2></div></div>
    {concepts.length ? <div className="saved-concept-list">{concepts.map((item) => <article className="saved-concept panel" key={`concept-${item.topic}-${item.name}`}><span><Network size={16} /></span><div><h3>{item.name}</h3><p>{item.description}</p><small>Connected to {item.topic}</small></div><button className="saved-remove" onClick={() => onRemove(item)}>Remove</button></article>)}</div> : <div className="saved-empty compact panel"><Network size={18} /><span>Bookmark a concept from a lesson map to find it here.</span></div>}
    <div className="saved-section-heading saved-subheading"><div><span className="panel-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Recently studied</h2></div></div>
    {recentTopics.length ? <div className="recent-topic-list">{recentTopics.map((item) => <button className="recent-topic-row panel" key={item.topic} onClick={() => onStart(item.topic)}><span className="recent-topic-icon"><Clock3 size={15} /></span><span><b>{item.topic}</b><small>{item.status === 'completed' ? 'Completed learning path' : 'Continue this learning path'}</small></span><strong>{Math.round(item.mastery || 0)}% mastery</strong><ChevronRight size={16} /></button>)}</div> : <div className="saved-empty compact panel"><BookOpen size={18} /><span>Your recent learning paths will appear here.</span></div>}
  </motion.div>
}
