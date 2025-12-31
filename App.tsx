import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { 
  Plus, Check, Trash2, Edit3, Send, Moon, Sun, 
  Flame, Calendar, ChevronRight, ChevronLeft, X, RefreshCw, Sparkles,
  ArrowLeft, Trophy, Activity, Copy, Eraser, MessageSquare, Info,
  Stethoscope, Book, PlusCircle, Bell, Clock, AlertCircle, HeartHandshake,
  Flag, AlarmClock, ListFilter
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { Chat } from "@google/genai";
import ReactMarkdown from 'react-markdown';

import { Habit, Note, ChatMessage, AppSettings, TabView, Task } from './types';
import { TRANSLATIONS, APP_NAME } from './constants';
import { getEthiopianDate, formatEthiopianDate } from './utils/ethiopianDate';
import { generateDailyAdvice, createChatSession, sendMessageToAI, analyzeUserInput, AnalyzedHabit } from './services/geminiService';
import { Button, Card, Input, Toggle } from './components/ui';
import { Navigation } from './components/Navigation';

// --- Custom Calendar Component ---
const CalendarPicker: React.FC<{
  selectedDate: string | null;
  onSelect: (date: string) => void;
  onClose: () => void;
  settings: AppSettings;
}> = ({ selectedDate, onSelect, onClose, settings }) => {
  const t = TRANSLATIONS[settings.language];
  const [viewDate, setViewDate] = useState(() => selectedDate ? new Date(selectedDate) : new Date());
  
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const startDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay(); // 0 (Sun) - 6 (Sat)
  
  // Generate grid
  const days = [];
  // Empty slots for start of month
  for (let i = 0; i < startDay; i++) {
    days.push(null);
  }
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));
  }

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="animate-in zoom-in-95 duration-200 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 p-4 shadow-xl">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h3 className="font-bold text-lg font-serif">
            {viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h3>
          {/* Show the Ethiopian Month roughly corresponding to this view */}
          <p className="text-xs text-gold-600 dark:text-gold-500 font-medium">
            {formatEthiopianDate(getEthiopianDate(viewDate), settings.language).split(',')[0]}
          </p>
        </div>
        <button onClick={handleNextMonth} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 mb-2">
        {t.weekDays.map((d, i) => (
          <div key={i} className="text-center text-xs font-bold text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1" key={viewDate.toISOString()}> 
        {days.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;

          const dateStr = date.toISOString().split('T')[0];
          const isSelected = selectedDate === dateStr;
          const isToday = todayStr === dateStr;
          const ethDate = getEthiopianDate(date);
          const isPast = date < new Date(new Date().setHours(0,0,0,0));

          return (
            <button
              key={dateStr}
              onClick={() => {
                  onSelect(dateStr);
                  onClose();
              }}
              disabled={isPast}
              className={`
                relative h-12 sm:h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-200
                ${isSelected 
                  ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/30 scale-105 z-10' 
                  : isToday 
                    ? 'bg-stone-100 dark:bg-stone-700 border-2 border-gold-500 text-stone-900 dark:text-white'
                    : 'hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
                }
                ${isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className={`text-sm font-bold ${isSelected ? 'text-white' : ''}`}>
                {date.getDate()}
              </span>
              {/* Ethiopian Date Subtitle */}
              <span className={`text-[10px] ${isSelected ? 'text-gold-100' : 'text-gold-600 dark:text-gold-500'}`}>
                {ethDate.date}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- Sub-components for specific pages to keep file clean ---

// 1. Home Page
const HomeView: React.FC<{
  settings: AppSettings;
  dailyAdvice: string;
  refreshAdvice: () => void;
  habits: Habit[];
  onCheckHabit: (id: string) => void;
  onSelectHabit: (habit: Habit) => void;
  onOpenNotifications: () => void;
  hasNotification: boolean;
}> = ({ settings, dailyAdvice, refreshAdvice, habits, onCheckHabit, onSelectHabit, onOpenNotifications, hasNotification }) => {
  const t = TRANSLATIONS[settings.language];
  const eDate = getEthiopianDate();
  const formattedDate = formatEthiopianDate(eDate, settings.language);
  const todayISO = new Date().toISOString().split('T')[0];

  const pendingHabits = habits.filter(h => !h.completedDates.includes(todayISO));

  return (
    <div className="p-6 pb-24 space-y-6 animate-in fade-in duration-500">
      {/* Header / Date */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-stone-500 dark:text-stone-400 text-sm font-medium uppercase tracking-wider">{t.greeting}</h2>
          <h1 className="text-3xl font-serif font-bold text-stone-900 dark:text-stone-100 mt-1">{formattedDate}</h1>
        </div>
        <div className="flex gap-2 items-center">
          <div className="bg-gold-100 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 px-3 py-1 rounded-full text-xs font-bold font-mono">
            {eDate.year} EC
          </div>
          <button 
            onClick={onOpenNotifications}
            className={`relative p-2 rounded-full transition-all duration-500 ${
              hasNotification 
                ? "bg-red-50 dark:bg-red-900/20 text-red-500" 
                : "bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:text-gold-600"
            } shadow-sm border border-stone-200 dark:border-stone-700`}
          >
            <Bell size={20} className={hasNotification ? "animate-swing" : ""} />
            {hasNotification && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-stone-800 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Nesha (Wisdom) Card */}
      <Card className="bg-gradient-to-br from-stone-900 to-stone-800 text-white dark:border-stone-700 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <SparklesIcon size={100} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gold-400 text-xs font-bold tracking-widest uppercase">{t.dailyWisdom}</span>
            <button onClick={refreshAdvice} className="text-stone-400 hover:text-white transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          <p className="text-lg font-serif leading-relaxed opacity-90 italic">"{dailyAdvice}"</p>
        </div>
      </Card>

      {/* Quick Habits */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          {t.today} <span className="text-stone-400 text-sm font-normal">({pendingHabits.length} {t.pending})</span>
        </h3>
        {habits.length === 0 ? (
          <div className="text-center py-10 text-stone-400 bg-stone-100 dark:bg-stone-800/50 rounded-2xl border-dashed border-2 border-stone-200 dark:border-stone-700">
            <p>{t.addHabit}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map(habit => {
              const isCompleted = habit.completedDates.includes(todayISO);
              return (
                <div key={habit.id} 
                  className="flex items-center justify-between bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-sm hover:border-gold-500/30 transition-colors cursor-pointer"
                  onClick={() => onSelectHabit(habit)}
                >
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onCheckHabit(habit.id); }}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isCompleted 
                          ? 'bg-gold-500 border-gold-500 text-white' 
                          : 'border-stone-300 dark:border-stone-600'
                      }`}
                    >
                      {isCompleted && <Check size={14} strokeWidth={3} />}
                    </button>
                    <div>
                      <h4 className={`font-medium ${isCompleted ? 'text-stone-400 line-through' : ''}`}>{habit.title}</h4>
                      {habit.frequency === 'weekly' && <span className="text-xs text-stone-400">{t.weekly}</span>}
                    </div>
                  </div>
                  {habit.streak > 0 && (
                    <div className="flex items-center gap-1 text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg text-xs font-bold">
                      <Flame size={12} fill="currentColor" />
                      <span>{habit.streak}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Notification Modal Component ---
const NotificationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  confessionDate: string | null;
  setConfessionDate: (date: string | null) => void;
  lastConfessionDate: string | null;
  setLastConfessionDate: (date: string) => void;
  tasks: Task[];
}> = ({ isOpen, onClose, settings, confessionDate, setConfessionDate, lastConfessionDate, setLastConfessionDate, tasks }) => {
  const t = TRANSLATIONS[settings.language];
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempDate, setTempDate] = useState<string | null>(null);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const daysSinceLast = lastConfessionDate 
    ? Math.floor((today.getTime() - new Date(lastConfessionDate).getTime()) / (1000 * 3600 * 24))
    : null;
  
  const isOverdue = daysSinceLast !== null && daysSinceLast > 30;

  // Find tasks that are incomplete AND (due today/past OR reminder is set for today/past)
  const dueTasks = tasks.filter(task => {
    if (task.completed) return false;
    if (!task.reminder) return false;
    if (!task.dueDate) return false;
    return task.dueDate <= todayStr;
  });

  if (!isOpen) return null;

  let daysLeft = null;
  let ethConfessionDateStr = "";
  
  if (confessionDate) {
    const target = new Date(confessionDate);
    const diff = target.getTime() - today.getTime();
    daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
    const eConfession = getEthiopianDate(target);
    ethConfessionDateStr = formatEthiopianDate(eConfession, settings.language);
  }

  const handleClearDate = () => {
      setConfessionDate(null);
      setTempDate(null);
      setShowCalendar(false);
  };

  const handleMarkAsDone = () => {
      const now = new Date().toISOString().split('T')[0];
      setLastConfessionDate(now);
      setConfessionDate(null);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-stone-50 dark:bg-stone-900 w-full max-w-md h-[90vh] sm:h-auto sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 duration-500 border-t border-white/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-stone-200 dark:border-stone-800 flex justify-between items-center">
            <h2 className="text-xl font-bold font-serif flex items-center gap-2">
                <Bell className="text-gold-500 fill-gold-500" size={20} />
                {t.notifications}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Task Reminders Section */}
            {dueTasks.length > 0 && (
                <div className="space-y-3 mb-4">
                    <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t.taskReminders}</h3>
                    {dueTasks.map(task => (
                        <div key={task.id} className="bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm flex items-center gap-3">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full">
                                <AlarmClock size={16} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm">{task.title}</h4>
                                <p className="text-xs text-stone-400">{t.dueTasks}: {task.dueDate}</p>
                            </div>
                            {task.priority === 'high' && <div className="w-2 h-2 rounded-full bg-red-500"/>}
                        </div>
                    ))}
                </div>
            )}

            {/* Overdue Alert - Only show if not already scheduled */}
            {isOverdue && !confessionDate && (
               <div className="relative overflow-hidden rounded-2xl p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                  <div className="flex items-start gap-4">
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400 animate-pulse">
                          <AlertCircle size={24} />
                      </div>
                      <div className="flex-1 z-10 relative">
                          <h3 className="font-bold text-lg text-red-700 dark:text-red-400 mb-1">{t.spiritualHealth}</h3>
                          <p className="text-sm text-red-600 dark:text-red-300 mb-3 leading-relaxed">
                              {t.timeToRepent} <br/>
                              <span className="font-semibold">{t.monthAlert}</span>
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 mt-2">
                             <div className="flex items-center gap-2 text-xs font-mono text-red-500/70 mb-2 sm:mb-0">
                                <span>{t.lastConfession}: {daysSinceLast} {t.daysSince}</span>
                             </div>
                             <Button onClick={() => setShowCalendar(true)} variant="danger" className="text-xs py-2 h-8 px-4 w-full sm:w-auto">
                                {t.setConfessionDate}
                             </Button>
                          </div>
                      </div>
                  </div>
                   <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
                       <Flame size={120} className="text-red-500 animate-[bounce_4s_infinite]" />
                   </div>
               </div>
            )}

            {confessionDate ? (
                <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-stone-900 to-stone-800 text-white shadow-xl shadow-gold-900/20 border border-stone-700 transition-all duration-700">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                            <SparklesIcon size={120} />
                    </div>
                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center mb-2 animate-[pulse_3s_ease-in-out_infinite]">
                            <Flame size={32} className="text-gold-500 fill-gold-500 animate-[bounce_2s_infinite]" />
                        </div>
                        <div>
                            <span className="text-gold-400 text-xs font-bold uppercase tracking-[0.2em] mb-2 block">{t.upcoming}</span>
                            <h3 className="text-2xl font-serif font-bold text-white mb-1">{t.confessionTitle}</h3>
                            <p className="text-gold-100 font-medium">{ethConfessionDateStr}</p>
                            <p className="text-stone-500 text-xs mt-1">
                                {new Date(confessionDate).toDateString()} (Gregorian)
                            </p>
                        </div>
                        <div className="py-2">
                                <div className="text-4xl font-bold font-mono text-gold-400 tabular-nums">
                                {daysLeft && daysLeft > 0 ? daysLeft : 0}
                                </div>
                                <div className="text-xs text-stone-500 uppercase tracking-widest mt-1">{t.daysLeft}</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 w-full">
                            <p className="text-sm font-serif italic opacity-90 leading-relaxed">"{t.confessionVerse}"</p>
                        </div>
                        <div className="flex gap-3 w-full pt-2">
                            <Button variant="ghost" onClick={handleClearDate} className="flex-1 text-stone-400 hover:text-white text-xs">
                                {t.cancel}
                            </Button>
                            <Button onClick={handleMarkAsDone} className="flex-[2] bg-gold-600 hover:bg-gold-500 text-white border-none">
                                <Check size={16} /> {t.markAsDone}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-2xl border border-stone-200 dark:border-stone-700 p-5 bg-white dark:bg-stone-800 transition-all duration-300">
                     <div className="flex items-center gap-3 mb-2">
                         <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                            <Clock size={20} />
                         </div>
                         <h3 className="font-bold text-lg">{t.confessionTitle}</h3>
                     </div>
                     {!showCalendar ? (
                        <>
                           <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
                              {t.confessionPrompt}
                           </p>
                           <div className="flex flex-col gap-2">
                             <Button 
                               onClick={() => setShowCalendar(true)} 
                               className="w-full bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-white border border-stone-200 dark:border-stone-700 !justify-between"
                             >
                               <span className="text-sm font-medium">{t.setConfessionDate}</span>
                               <Calendar size={18} />
                             </Button>
                             {/* Allow simple logging of confession without scheduling */}
                             <Button 
                               onClick={handleMarkAsDone} 
                               variant="ghost"
                               className="w-full text-xs text-stone-400"
                             >
                               <Check size={14} /> {t.markAsDone} ({t.today})
                             </Button>
                           </div>
                        </>
                     ) : (
                        <div className="mt-2">
                           <CalendarPicker 
                             selectedDate={tempDate}
                             onSelect={setTempDate}
                             onClose={() => {
                               if (tempDate) setConfessionDate(tempDate);
                               setShowCalendar(false);
                               setTempDate(null);
                             }}
                             settings={settings}
                           />
                           <div className="mt-2 text-center">
                             <button 
                               onClick={() => setShowCalendar(false)}
                               className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 underline"
                             >
                               {t.cancel}
                             </button>
                           </div>
                        </div>
                     )}
                </div>
            )}
            <div className="text-center space-y-2 py-4">
                 <p className="text-xs text-stone-400 uppercase tracking-widest">{t.lastConfession}</p>
                 <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                    {lastConfessionDate 
                       ? formatEthiopianDate(getEthiopianDate(new Date(lastConfessionDate)), settings.language)
                       : t.untracked
                    }
                 </p>
            </div>
        </div>
      </div>
    </div>
  );
};


// 2. Habits & Tasks Management View
const HabitsView: React.FC<{
  settings: AppSettings;
  habits: Habit[];
  tasks: Task[];
  addHabit: (title: string, freq: 'daily'|'weekly') => void;
  deleteHabit: (id: string) => void;
  onSelectHabit: (habit: Habit) => void;
  addTask: (title: string, priority: 'low' | 'medium' | 'high', dueDate?: string, reminder?: boolean) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
}> = ({ settings, habits, tasks, addHabit, deleteHabit, onSelectHabit, addTask, toggleTask, deleteTask }) => {
  const t = TRANSLATIONS[settings.language];
  const [activeSection, setActiveSection] = useState<'habits' | 'tasks'>('habits');
  const [isAdding, setIsAdding] = useState(false);
  
  // Sorting State
  const [sortBy, setSortBy] = useState<'creation' | 'dueDate' | 'priority'>('creation');

  // Habit Form State
  const [newTitle, setNewTitle] = useState('');
  const [freq, setFreq] = useState<'daily'|'weekly'>('daily');

  // Task Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'low'|'medium'|'high'>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskReminder, setTaskReminder] = useState(false);
  const [showTaskCalendar, setShowTaskCalendar] = useState(false);

  const handleAdd = () => {
    if (activeSection === 'habits') {
       if(!newTitle.trim()) return;
       addHabit(newTitle, freq);
       setNewTitle('');
    } else {
       if(!taskTitle.trim()) return;
       addTask(taskTitle, taskPriority, taskDueDate || undefined, taskReminder);
       setTaskTitle('');
       setTaskDueDate('');
       setTaskPriority('medium');
       setTaskReminder(false);
       setShowTaskCalendar(false);
    }
    setIsAdding(false);
  };

  const formattedTaskDueDate = taskDueDate 
    ? formatEthiopianDate(getEthiopianDate(new Date(taskDueDate)), settings.language)
    : "";

  // Mock data for streak chart
  const data = habits.map(h => ({ name: h.title.substring(0,5), streak: h.streak }));

  // --- Sorting Logic ---
  const getSortedTasks = () => {
    return [...tasks].sort((a, b) => {
        // First by completion status (completed last)
        if (a.completed !== b.completed) return a.completed ? 1 : -1;

        if (sortBy === 'priority') {
            const priorityWeight = { high: 3, medium: 2, low: 1 };
            const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
            if (diff !== 0) return diff;
        } else if (sortBy === 'dueDate') {
            // Nulls last
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (diff !== 0) return diff;
        }
        
        // Fallback / Default to creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };
  
  const visibleTasks = getSortedTasks();

  return (
    <div className="p-6 pb-24 space-y-6 flex flex-col h-full">
      {/* Top Header & Switcher */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold font-serif">{t.habits}</h1>
        <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-xl flex relative">
           <button 
             onClick={() => setActiveSection('habits')}
             className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all z-10 ${activeSection === 'habits' ? 'text-stone-900 dark:text-white' : 'text-stone-500'}`}
           >
             {t.habits}
           </button>
           <button 
             onClick={() => setActiveSection('tasks')}
             className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all z-10 ${activeSection === 'tasks' ? 'text-stone-900 dark:text-white' : 'text-stone-500'}`}
           >
             {t.tasks}
           </button>
           
           {/* Slider Background */}
           <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-stone-700 shadow-sm rounded-lg transition-transform duration-300 ${activeSection === 'tasks' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-1'}`} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
         {/* Add Button */}
         {!isAdding && (
             <Button onClick={() => setIsAdding(true)} variant="primary" className="w-full">
               <Plus size={18} /> {activeSection === 'habits' ? t.addHabit : t.addTask}
             </Button>
         )}

         {/* Sorting Toolbar (Only for Tasks when not adding) */}
         {!isAdding && tasks.length > 0 && activeSection === 'tasks' && (
             <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                 <div className="bg-stone-100 dark:bg-stone-800 p-1.5 rounded-full text-stone-400">
                    <ListFilter size={14} />
                 </div>
                 {(['creation', 'dueDate', 'priority'] as const).map((key) => (
                     <button
                         key={key}
                         onClick={() => setSortBy(key)}
                         className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                             sortBy === key 
                                 ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900' 
                                 : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500 hover:border-stone-300'
                         }`}
                     >
                         {key === 'creation' ? t.newest : key === 'dueDate' ? t.dueDate : t.priority}
                     </button>
                 ))}
             </div>
         )}

         {/* Add Form */}
         {isAdding && (
            <Card className="animate-in slide-in-from-top-4 border-gold-500/50 shadow-xl shadow-gold-500/10">
              <h3 className="font-bold mb-3">{activeSection === 'habits' ? t.addHabit : t.addTask}</h3>
              
              {activeSection === 'habits' ? (
                // Habit Form
                <>
                  <Input 
                    placeholder={t.habitTitle} 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)} 
                    autoFocus
                  />
                  <div className="flex gap-2 mt-3 mb-4">
                    <button onClick={() => setFreq('daily')} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${freq === 'daily' ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-300'}`}>{t.daily}</button>
                    <button onClick={() => setFreq('weekly')} className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${freq === 'weekly' ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-300'}`}>{t.weekly}</button>
                  </div>
                </>
              ) : (
                // Task Form
                <div className="space-y-4">
                  <Input 
                    placeholder={t.taskTitle} 
                    value={taskTitle} 
                    onChange={e => setTaskTitle(e.target.value)} 
                    autoFocus
                  />
                  
                  {/* Modern Priority Selector */}
                  <div>
                    <label className="text-[10px] font-bold uppercase text-stone-400 mb-2 block">{t.priority}</label>
                    <div className="flex gap-2">
                        {(['low', 'medium', 'high'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setTaskPriority(p)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex flex-col items-center justify-center gap-1 transition-all duration-200 border-2 ${
                                    taskPriority === p 
                                        ? p === 'high' 
                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-600 dark:text-red-400'
                                            : p === 'medium'
                                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-600 dark:text-orange-400'
                                                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-600 dark:text-blue-400'
                                        : 'bg-stone-50 dark:bg-stone-900 border-stone-100 dark:border-stone-700 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                                }`}
                            >
                                <Flag size={14} fill={taskPriority === p ? "currentColor" : "none"} />
                                <span className="capitalize">{t[p]}</span>
                            </button>
                        ))}
                    </div>
                  </div>

                  {/* Date Picker Trigger & Reminder Toggle */}
                  <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase text-stone-400 mb-2 block">{t.dueDate}</label>
                        {!showTaskCalendar ? (
                            <button
                                onClick={() => setShowTaskCalendar(true)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                                    taskDueDate 
                                        ? 'bg-white dark:bg-stone-800 border-gold-500 text-stone-900 dark:text-white'
                                        : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-400'
                                }`}
                            >
                                <span className="text-sm font-medium">
                                    {taskDueDate ? formattedTaskDueDate : "Select Date"}
                                </span>
                                <Calendar size={18} className={taskDueDate ? "text-gold-500" : "text-stone-400"} />
                            </button>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-top-2 absolute z-10 bg-white dark:bg-stone-800 shadow-xl rounded-xl">
                                <CalendarPicker 
                                    selectedDate={taskDueDate || null}
                                    onSelect={(d) => {
                                        setTaskDueDate(d);
                                        setShowTaskCalendar(false);
                                    }}
                                    onClose={() => setShowTaskCalendar(false)}
                                    settings={settings}
                                />
                            </div>
                        )}
                      </div>

                      {/* Reminder Toggle */}
                      <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 flex flex-col items-center justify-center gap-1 h-[50px] min-w-[70px]">
                          <span className="text-[10px] font-bold uppercase text-stone-400">{t.reminder}</span>
                          <Toggle checked={taskReminder} onChange={setTaskReminder} />
                      </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setIsAdding(false)}>{t.cancel}</Button>
                <Button onClick={handleAdd}>{t.save}</Button>
              </div>
            </Card>
         )}

         {/* Content List */}
         {activeSection === 'habits' ? (
           // HABITS LIST
           <>
              {habits.length > 0 && (
                <Card className="h-40 flex flex-col justify-center mb-4">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">{t.streak} Overview</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Line type="monotone" dataKey="streak" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b'}} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}
              <div className="space-y-3 pb-4">
                {habits.map(habit => (
                  <Card key={habit.id} 
                    className="flex justify-between items-center group cursor-pointer hover:border-gold-500/30 transition-colors"
                    onClick={() => onSelectHabit(habit)}
                  >
                    <div>
                      <h3 className="font-bold">{habit.title}</h3>
                      <div className="text-xs text-stone-400 mt-1 flex gap-2">
                        <span className="capitalize">{habit.frequency === 'daily' ? t.daily : t.weekly}</span>
                        <span>•</span>
                        <span className="text-orange-500 font-bold">{habit.streak} {t.streak}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }} className="text-stone-300 hover:text-red-500 transition-colors p-2">
                      <Trash2 size={18} />
                    </button>
                  </Card>
                ))}
              </div>
           </>
         ) : (
           // TASKS LIST
           <div className="space-y-3 pb-4">
             {visibleTasks.length === 0 && (
                <div className="text-center py-12 opacity-50">
                    <Check size={48} className="mx-auto mb-2 text-stone-300" />
                    <p>{t.noTasks}</p>
                </div>
             )}
             
             {visibleTasks.map(task => {
               const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
               
               return (
                 <div 
                   key={task.id}
                   className={`bg-white dark:bg-stone-800 p-4 rounded-2xl border transition-all duration-300 group ${
                     task.completed 
                       ? 'opacity-60 border-stone-100 dark:border-stone-800' 
                       : 'border-stone-200 dark:border-stone-700 shadow-sm hover:border-gold-500/30'
                   }`}
                 >
                   <div className="flex items-start gap-3">
                     <button
                       onClick={() => toggleTask(task.id)}
                       className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 flex-shrink-0 ${
                         task.completed
                           ? 'bg-green-500 border-green-500 text-white'
                           : 'border-stone-300 dark:border-stone-600 hover:border-gold-500'
                       }`}
                     >
                       {task.completed && <Check size={14} strokeWidth={3} />}
                     </button>
                     
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                           <h3 className={`font-medium break-words ${task.completed ? 'text-stone-400 line-through' : ''}`}>
                             {task.title}
                           </h3>
                           <div className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 mt-1.5 ${
                             task.priority === 'high' ? 'bg-red-500' :
                             task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-400'
                           }`} />
                        </div>
                        
                        {(task.dueDate || isOverdue) && (
                           <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
                              <AlarmClock size={12} />
                              <span>
                                {task.dueDate 
                                  ? formatEthiopianDate(getEthiopianDate(new Date(task.dueDate)), settings.language)
                                  : ''
                                }
                              </span>
                              {isOverdue && <span className="bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">Late</span>}
                              {task.reminder && !task.completed && <Bell size={10} className="text-gold-500 ml-1" />}
                           </div>
                        )}
                     </div>

                     <button 
                       onClick={() => deleteTask(task.id)}
                       className="text-stone-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                     >
                       <Trash2 size={16} />
                     </button>
                   </div>
                 </div>
               );
             })}
           </div>
         )}
      </div>
    </div>
  );
};

// ... (ChatView, NotesView, ProfileView, HabitDetailView, etc. remain the same) ...
// 3. AI Chat View (Updated)
const ChatView: React.FC<{
    settings: AppSettings;
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
    onClearChat: () => void;
    isTyping: boolean;
  }> = ({ settings, messages, onSendMessage, onClearChat, isTyping }) => {
    // ... existing implementation ...
    const t = TRANSLATIONS[settings.language];
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Character limit constant
  const MAX_CHARS = 500;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if(!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestions = [t.suggestion1, t.suggestion2, t.suggestion3];

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-stone-50 dark:bg-stone-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 font-serif">
            <Sparkles size={18} className="text-gold-500 fill-gold-500" />
            {t.chat}
          </h2>
          <span className="text-[10px] text-stone-400 uppercase tracking-widest font-medium">Nesha AI</span>
        </div>
        {messages.length > 0 && (
          <button 
            onClick={onClearChat}
            className="text-stone-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800"
            title={t.clearChat}
          >
            <Eraser size={18} />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {messages.length === 0 && (
          <div className="mt-10 flex flex-col items-center justify-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-gold-100 to-white dark:from-stone-800 dark:to-stone-700 flex items-center justify-center shadow-lg shadow-gold-500/10">
              <Sparkles className="text-gold-500" size={40} strokeWidth={1.5} />
            </div>
            <div className="text-center max-w-xs space-y-2">
              <p className="text-stone-600 dark:text-stone-300 font-medium">{t.aiIntro}</p>
            </div>
            
            {/* Suggestion Chips */}
            <div className="w-full max-w-sm space-y-3 px-4">
              <p className="text-xs text-center text-stone-400 uppercase tracking-widest font-bold">{t.suggestions}</p>
              <div className="flex flex-col gap-2">
                {suggestions.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => onSendMessage(s)}
                    className="text-sm bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-4 py-3 rounded-xl text-left hover:border-gold-400 hover:text-gold-600 dark:hover:text-gold-400 transition-all shadow-sm active:scale-95"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {messages.map(msg => (
          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] relative group ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            } flex flex-col`}>
              
              <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded-tr-none' 
                  : 'bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 rounded-tl-none'
              }`}>
                {msg.role === 'model' ? (
                   <div className="prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-headings:text-gold-600 prose-strong:text-stone-900 dark:prose-strong:text-stone-100 prose-ul:list-disc prose-ul:pl-4">
                     <ReactMarkdown 
                       components={{
                         strong: ({node, ...props}) => <span className="font-bold text-stone-900 dark:text-white" {...props} />,
                         h1: ({node, ...props}) => <h1 className="text-lg font-bold font-serif text-gold-600 mb-2 mt-1" {...props} />,
                         h2: ({node, ...props}) => <h2 className="text-base font-bold font-serif text-gold-600 mb-2 mt-1" {...props} />,
                         h3: ({node, ...props}) => <h3 className="text-sm font-bold font-serif text-gold-600 mb-1" {...props} />,
                         ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                         li: ({node, ...props}) => <li className="marker:text-gold-500" {...props} />,
                       }}
                     >
                       {msg.text}
                     </ReactMarkdown>
                   </div>
                ) : (
                  msg.text
                )}
              </div>

              {/* Message Actions (only for AI) */}
              {msg.role === 'model' && (
                <div className="flex items-center gap-2 mt-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={() => handleCopy(msg.text, msg.id)}
                     className="p-1 text-stone-400 hover:text-gold-500 transition-colors"
                     title={t.copy}
                   >
                     {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                   </button>
                   {copiedId === msg.id && <span className="text-[10px] text-gold-500">{t.copied}</span>}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start w-full">
             <div className="bg-white dark:bg-stone-800 px-5 py-4 rounded-2xl rounded-tl-none border border-stone-100 dark:border-stone-700 shadow-sm flex items-center gap-2">
               <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
               <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
               <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
             </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area - Enhanced */}
      <div className="p-4 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-100 dark:border-stone-800 sticky bottom-0 z-20 pb-4">
        <div className="relative">
          <div className={`flex items-end gap-2 bg-stone-100 dark:bg-stone-800 p-1.5 rounded-[28px] border transition-all shadow-sm ${
            input.length > 0 ? 'border-gold-500/30 ring-2 ring-gold-500/10' : 'border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-gold-500/20 focus-within:border-gold-500/50'
          }`}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              maxLength={MAX_CHARS}
              placeholder={t.typeMessage}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full bg-transparent border-none outline-none text-sm text-stone-800 dark:text-stone-100 placeholder:text-stone-400 px-4 py-3 min-h-[52px] max-h-32 resize-none leading-relaxed"
              rows={1}
              style={{ minHeight: '52px' }}
            />
            <button
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className={`p-3 rounded-full flex-shrink-0 transition-all duration-300 mb-[2px] ${
                input.trim() 
                ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/30 hover:bg-gold-600 transform hover:scale-105 active:scale-95' 
                : 'bg-stone-200 dark:bg-stone-700 text-stone-400 cursor-not-allowed'
              }`}
            >
              <Send size={20} strokeWidth={2.5} className={input.trim() ? "translate-x-0.5 translate-y-px" : ""} />
            </button>
          </div>
          {input.length > 0 && (
             <div className={`absolute -top-6 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm transition-colors ${
               input.length > MAX_CHARS * 0.9 
                 ? 'bg-red-100 text-red-500 dark:bg-red-900/40 dark:text-red-400' 
                 : 'bg-stone-100/80 text-stone-400 dark:bg-stone-800/80'
             }`}>
                {input.length} / {MAX_CHARS}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. Notes View (Updated with Analyzer)
const NotesView: React.FC<{
    settings: AppSettings;
    notes: Note[];
    addNote: (content: string) => void;
    deleteNote: (id: string) => void;
    onAddHabit: (title: string, freq: 'daily' | 'weekly', desc: string) => void;
  }> = ({ settings, notes, addNote, deleteNote, onAddHabit }) => {
    // ... existing implementation ...
    const t = TRANSLATIONS[settings.language];
  const [activeTab, setActiveTab] = useState<'notes' | 'analyzer'>('notes');
  
  // Note State
  const [content, setContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Analyzer State
  const [analyzerInput, setAnalyzerInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalyzedHabit[]>([]);
  const [addedIndices, setAddedIndices] = useState<number[]>([]);

  const handleSaveNote = () => {
    if (!content.trim()) return;
    addNote(content);
    setContent('');
    setIsAdding(false);
  };

  const handleAnalyze = async () => {
    if (!analyzerInput.trim()) return;
    setIsAnalyzing(true);
    setAnalysisResults([]);
    setAddedIndices([]);
    
    const results = await analyzeUserInput(analyzerInput, settings.language);
    setAnalysisResults(results);
    setIsAnalyzing(false);
  };

  const handleAddSuggestedHabit = (item: AnalyzedHabit, index: number) => {
    onAddHabit(item.title, item.frequency, item.advice);
    setAddedIndices(prev => [...prev, index]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Toggle Switch */}
      <div className="px-6 pt-4 pb-2">
        <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-xl flex">
          <button 
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notes' 
                ? 'bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-stone-100' 
                : 'text-stone-500'
            }`}
          >
            {t.myNotes}
          </button>
          <button 
            onClick={() => setActiveTab('analyzer')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'analyzer' 
                ? 'bg-white dark:bg-stone-700 shadow-sm text-stone-900 dark:text-stone-100' 
                : 'text-stone-500'
            }`}
          >
            <Stethoscope size={14} />
            {t.analyzer}
          </button>
        </div>
      </div>

      {activeTab === 'notes' ? (
        // --- Standard Notes View ---
        <div className="p-6 pb-24 space-y-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold font-serif">{t.notes}</h1>
            <Button onClick={() => setIsAdding(true)} variant="primary" className="!py-2 !px-3">
              <Plus size={18} />
            </Button>
          </div>

          {isAdding && (
            <Card className="animate-in slide-in-from-top-4">
              <textarea 
                className="w-full h-32 bg-transparent resize-none outline-none text-stone-800 dark:text-stone-200"
                placeholder={t.writeNote}
                value={content}
                onChange={e => setContent(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="ghost" onClick={() => setIsAdding(false)}>{t.cancel}</Button>
                <Button onClick={handleSaveNote}>{t.save}</Button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.map(note => (
              <Card key={note.id} className="group relative min-h-[120px] flex flex-col justify-between hover:border-gold-400/50 transition-colors">
                <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-300 whitespace-pre-wrap">{note.content}</p>
                <div className="flex justify-between items-end mt-4">
                  <span className="text-[10px] text-stone-400">{new Date(note.createdAt).toLocaleDateString()}</span>
                  <button onClick={() => deleteNote(note.id)} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        // --- Spiritual Analyzer View ---
        <div className="p-6 pb-24 space-y-6 flex-1 overflow-y-auto animate-in fade-in slide-in-from-right-4">
           <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-stone-800 dark:to-stone-900 border-indigo-100 dark:border-stone-700">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={20} />
                </div>
                <h3 className="font-bold text-lg">{t.analyzer}</h3>
             </div>
             <p className="text-sm text-stone-600 dark:text-stone-400 mb-4 leading-relaxed">
               {t.analyzerDesc}
             </p>
             <textarea 
               className="w-full h-28 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-stone-900 dark:text-stone-100 placeholder:text-stone-400 resize-none mb-4"
               placeholder={t.analyzePlaceholder}
               value={analyzerInput}
               onChange={e => setAnalyzerInput(e.target.value)}
             />
             <div className="flex justify-end">
               <Button 
                  onClick={handleAnalyze} 
                  isLoading={isAnalyzing}
                  className="!bg-indigo-600 hover:!bg-indigo-700 !shadow-indigo-500/20"
               >
                 {isAnalyzing ? t.analyzing : t.analyzeBtn}
               </Button>
             </div>
           </Card>

           {analysisResults.length > 0 && (
             <div className="space-y-4 animate-in slide-in-from-bottom-6">
                <h3 className="font-bold text-stone-500 text-xs uppercase tracking-widest">{t.recommendations}</h3>
                {analysisResults.map((item, index) => (
                  <div key={index} className="bg-white dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 p-5 shadow-sm hover:border-gold-500/30 transition-all relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                       <h4 className="font-bold text-lg text-stone-900 dark:text-stone-100">{item.title}</h4>
                       <span className="text-[10px] font-bold uppercase bg-stone-100 dark:bg-stone-700 px-2 py-1 rounded text-stone-500">
                         {item.frequency === 'daily' ? t.daily : t.weekly}
                       </span>
                    </div>
                    <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-4">
                      {item.advice}
                    </p>
                    <button 
                      onClick={() => handleAddSuggestedHabit(item, index)}
                      disabled={addedIndices.includes(index)}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                        addedIndices.includes(index)
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 cursor-default'
                          : 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 hover:opacity-90 active:scale-95'
                      }`}
                    >
                      {addedIndices.includes(index) ? (
                        <><Check size={16} /> {t.added}</>
                      ) : (
                        <><PlusCircle size={16} /> {t.addToHabit}</>
                      )}
                    </button>
                  </div>
                ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

// ... (ProfileView, HabitDetailView remain same) ...
const ProfileView: React.FC<{
    settings: AppSettings;
    updateSettings: (s: Partial<AppSettings>) => void;
  }> = ({ settings, updateSettings }) => {
    // ... existing implementation ...
    const t = TRANSLATIONS[settings.language];
  return (
    <div className="p-6 pb-24 space-y-8">
      <h1 className="text-2xl font-bold font-serif">{t.settings}</h1>
      
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gold-100 dark:bg-gold-900/20 flex items-center justify-center text-gold-600 dark:text-gold-400 font-bold text-2xl">
            N
          </div>
          <div>
            <h3 className="font-bold text-lg">{APP_NAME} User</h3>
            <p className="text-stone-400 text-sm">Free Account</p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-white dark:bg-stone-800 rounded-2xl">
          <div className="flex items-center gap-3 text-stone-600 dark:text-stone-300">
            <span className="font-medium">{t.language} (አማ/En)</span>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => updateSettings({ language: 'am' })}
               className={`px-3 py-1 rounded-lg text-sm ${settings.language === 'am' ? 'bg-gold-500 text-white' : 'text-stone-500'}`}
             >
               አማ
             </button>
             <button 
               onClick={() => updateSettings({ language: 'en' })}
               className={`px-3 py-1 rounded-lg text-sm ${settings.language === 'en' ? 'bg-gold-500 text-white' : 'text-stone-500'}`}
             >
               En
             </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white dark:bg-stone-800 rounded-2xl">
          <div className="flex items-center gap-3 text-stone-600 dark:text-stone-300">
            {settings.darkMode ? <Moon size={20} /> : <Sun size={20} />}
            <span className="font-medium">{t.theme}</span>
          </div>
          <Toggle checked={settings.darkMode} onChange={(v) => updateSettings({ darkMode: v })} />
        </div>
      </div>

      <div className="text-center text-stone-400 text-xs mt-10">
        <p>Nesha v1.0.0</p>
        <p>Built with ❤️ for Ethiopia</p>
      </div>
    </div>
  );
};

const HabitDetailView: React.FC<{
    habit: Habit;
    onClose: () => void;
    onUpdate: (id: string, updates: Partial<Habit>) => void;
    onDelete: (id: string) => void;
    settings: AppSettings;
  }> = ({ habit, onClose, onUpdate, onDelete, settings }) => {
    // ... existing implementation ...
    const t = TRANSLATIONS[settings.language];
  const [title, setTitle] = useState(habit.title);
  const [description, setDescription] = useState(habit.description || '');
  const [frequency, setFrequency] = useState(habit.frequency);

  const handleSave = () => {
    onUpdate(habit.id, { title, description, frequency });
    onClose();
  };
  
  // Calculate stats
  const totalCompletions = habit.completedDates.length;
  
  // Simple calendar visualization (last 28 days)
  const today = new Date();
  
  // Create a 5-week grid ending on next Saturday to align columns
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const offset = 6 - dayOfWeek; // Days until next Saturday
  
  const last35Days = Array.from({length: 35}, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + offset - (34 - i));
    return d;
  });

  return (
    <div className="p-6 pb-24 space-y-6 animate-in slide-in-from-right duration-300 fixed inset-0 bg-stone-50 dark:bg-stone-900 z-[60] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold font-serif">{t.editHabit}</h1>
      </div>

      {/* Edit Form */}
      <Card className="space-y-4">
        <div>
          <label className="text-xs font-bold text-stone-400 uppercase mb-1 block">{t.habitTitle}</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        
        <div>
           <label className="text-xs font-bold text-stone-400 uppercase mb-1 block">{t.frequency}</label>
           <div className="flex gap-2">
            {(['daily', 'weekly'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                  frequency === f 
                    ? 'bg-stone-800 text-white border-stone-800 dark:bg-stone-100 dark:text-stone-900' 
                    : 'border-stone-200 dark:border-stone-700 text-stone-500'
                }`}
              >
                {f === 'daily' ? t.daily : t.weekly}
              </button>
            ))}
           </div>
        </div>

        <div>
          <label className="text-xs font-bold text-stone-400 uppercase mb-1 block">{t.habitDesc}</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all text-stone-900 dark:text-stone-100 placeholder:text-stone-400 min-h-[80px] resize-none"
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center justify-center p-4">
          <Trophy className="text-gold-500 mb-2" size={24} />
          <span className="text-2xl font-bold">{habit.streak}</span>
          <span className="text-xs text-stone-400 uppercase">{t.streak}</span>
        </Card>
        <Card className="flex flex-col items-center justify-center p-4">
          <Activity className="text-blue-500 mb-2" size={24} />
          <span className="text-2xl font-bold">{totalCompletions}</span>
          <span className="text-xs text-stone-400 uppercase">{t.total} {t.completed}</span>
        </Card>
      </div>

      {/* Streak Info Section */}
      <Card className="bg-gradient-to-br from-stone-100 to-white dark:from-stone-800 dark:to-stone-800/50 border-stone-200 dark:border-stone-700">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-gold-100 dark:bg-gold-900/30 text-gold-600 dark:text-gold-400 mt-1">
             <Info size={20} />
          </div>
          <div>
            <h3 className="font-bold font-serif text-stone-800 dark:text-stone-200 mb-1">{t.streakInfoTitle}</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-3">
              {t.streakInfoDesc}
            </p>
            <p className="text-xs font-medium text-gold-600 dark:text-gold-500 italic">
              {t.streakInfoTip}
            </p>
          </div>
        </div>
      </Card>

      {/* History Grid */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-stone-400" />
          <h3 className="text-sm font-bold uppercase text-stone-500">{t.last30Days}</h3>
        </div>
        
        {/* Weekday Header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {t.weekDays.map((d, i) => (
             <div key={i} className="text-center text-[10px] font-bold text-stone-400">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {last35Days.map((dateObj, i) => {
            const dateStr = dateObj.toISOString().split('T')[0];
            const isCompleted = habit.completedDates.includes(dateStr);
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isFuture = dateObj > new Date();
            
            // Convert to Ethiopic if Amharic selected
            let dayDisplay = dateObj.getDate();
            if (settings.language === 'am') {
                const eDate = getEthiopianDate(dateObj);
                dayDisplay = eDate.date;
            }

            return (
              <div 
                key={dateStr}
                className={`aspect-square rounded-md flex items-center justify-center text-[10px] relative font-medium transition-all ${
                  isFuture 
                    ? 'opacity-30 text-stone-300'
                    : isCompleted 
                      ? 'bg-gold-500 text-white shadow-sm shadow-gold-500/30' 
                      : isToday 
                        ? 'border-2 border-gold-500 text-gold-600 font-bold bg-gold-50 dark:bg-transparent'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-600'
                }`}
              >
                {dayDisplay}
                {isCompleted && <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-white/50" />}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
         <Button variant="danger" className="flex-1" onClick={() => { onDelete(habit.id); onClose(); }}>
           <Trash2 size={18} /> {t.delete}
         </Button>
         <Button variant="primary" className="flex-1" onClick={handleSave}>
           {t.save}
         </Button>
      </div>
    </div>
  );
};


// --- Helper Icon ---
const SparklesIcon = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
);


// --- Main App Component ---

const App: React.FC = () => {
  // --- State ---
  const [currentTab, setCurrentTab] = useState<TabView>('home');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('nesha-settings');
    return saved ? JSON.parse(saved) : { language: 'am', darkMode: false };
  });
  
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('nesha-habits');
    return saved ? JSON.parse(saved) : [];
  });
  
  // New Task State
  const [tasks, setTasks] = useState<Task[]>(() => {
      const saved = localStorage.getItem('nesha-tasks');
      return saved ? JSON.parse(saved) : [];
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('nesha-notes');
    return saved ? JSON.parse(saved) : [];
  });

  const [dailyAdvice, setDailyAdvice] = useState<string>('');
  
  // Selection State for Habit Details
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  
  // Confession State
  const [confessionDate, setConfessionDate] = useState<string | null>(() => {
    return localStorage.getItem('nesha-confession-date');
  });
  
  const [lastConfessionDate, setLastConfessionDate] = useState<string | null>(() => {
    return localStorage.getItem('nesha-last-confession-date');
  });

  // Notification Modal State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);

  // --- Effects ---

  // Persistence
  useEffect(() => localStorage.setItem('nesha-settings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('nesha-habits', JSON.stringify(habits)), [habits]);
  useEffect(() => localStorage.setItem('nesha-tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('nesha-notes', JSON.stringify(notes)), [notes]);
  useEffect(() => {
    if(confessionDate) localStorage.setItem('nesha-confession-date', confessionDate);
    else localStorage.removeItem('nesha-confession-date');
  }, [confessionDate]);
  
  useEffect(() => {
    if(lastConfessionDate) localStorage.setItem('nesha-last-confession-date', lastConfessionDate);
    else localStorage.removeItem('nesha-last-confession-date');
  }, [lastConfessionDate]);

  // Dark Mode
  useEffect(() => {
    if (settings.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.darkMode]);

  // Initial Data
  useEffect(() => {
    const loadAdvice = async () => {
      const storedAdvice = localStorage.getItem(`nesha-advice-${new Date().toDateString()}`);
      if (storedAdvice) {
        setDailyAdvice(storedAdvice);
      } else {
        const newAdvice = await generateDailyAdvice(settings.language);
        setDailyAdvice(newAdvice);
        localStorage.setItem(`nesha-advice-${new Date().toDateString()}`, newAdvice);
      }
    };
    loadAdvice();
    chatSessionRef.current = createChatSession();
  }, []);

  // Language Change effect for advice
  useEffect(() => {
     if(!dailyAdvice) {
       generateDailyAdvice(settings.language).then(setDailyAdvice);
     }
  }, [settings.language]);

  // --- Actions ---

  const handleRefreshAdvice = async () => {
    setDailyAdvice(TRANSLATIONS[settings.language].loading);
    const newAdvice = await generateDailyAdvice(settings.language);
    setDailyAdvice(newAdvice);
    localStorage.setItem(`nesha-advice-${new Date().toDateString()}`, newAdvice);
  };

  const handleAddHabit = (title: string, frequency: 'daily' | 'weekly', description: string = '') => {
    const newHabit: Habit = {
      id: Date.now().toString(),
      title,
      description,
      frequency,
      streak: 0,
      completedDates: [],
      createdAt: new Date().toISOString()
    };
    setHabits([...habits, newHabit]);
  };

  const handleDeleteHabit = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
  };

  const handleUpdateHabit = (id: string, updates: Partial<Habit>) => {
    setHabits(habits.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const handleCheckHabit = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    setHabits(habits.map(h => {
      if (h.id !== id) return h;
      if (h.completedDates.includes(today)) {
        // Uncheck logic
        return {
          ...h,
          completedDates: h.completedDates.filter(d => d !== today),
          streak: Math.max(0, h.streak - 1)
        };
      } else {
        // Check logic
        return {
          ...h,
          completedDates: [...h.completedDates, today],
          streak: h.streak + 1
        };
      }
    }));
  };
  
  // Task Actions
  const handleAddTask = (title: string, priority: 'low' | 'medium' | 'high', dueDate?: string, reminder?: boolean) => {
      const newTask: Task = {
          id: Date.now().toString(),
          title,
          priority,
          dueDate,
          reminder,
          completed: false,
          createdAt: new Date().toISOString()
      };
      setTasks([...tasks, newTask]);
  };
  
  const handleToggleTask = (id: string) => {
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };
  
  const handleDeleteTask = (id: string) => {
      setTasks(tasks.filter(t => t.id !== id));
  };

  const handleAddNote = (content: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setNotes([newNote, ...notes]);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession();
    }
    
    if (chatSessionRef.current) {
        const responseText = await sendMessageToAI(chatSessionRef.current, text);
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: responseText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, aiMsg]);
    } else {
         const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: "System Error: AI not initialized.",
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
    }
    setIsTyping(false);
  };
  
  const handleClearChat = () => {
      setMessages([]);
      // Reset chat session to clear history
      chatSessionRef.current = createChatSession();
  };

  // --- Calculations for Notification Icon ---
  const calculateNotificationState = () => {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // Check for overdue confession
      if (lastConfessionDate) {
          const days = Math.floor((new Date().getTime() - new Date(lastConfessionDate).getTime()) / (1000 * 3600 * 24));
          if (days > 30) return true;
      }
      
      // Check for active confession appointment
      if (confessionDate) {
          const today = new Date();
          const confDate = new Date(confessionDate);
          const diffDays = Math.ceil((confDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          
          // Notify if date is today (0), tomorrow (1), or in the past (<0)
          if (diffDays <= 1) return true;
          // Otherwise, don't show red dot just for having an appointment next month
      }

      // Check for due tasks with reminders
      const dueTasks = tasks.some(t => !t.completed && t.reminder && t.dueDate && t.dueDate <= todayStr);
      if (dueTasks) return true;

      return false;
  };

  const hasNotification = calculateNotificationState();

  // --- Rendering ---
  
  const selectedHabit = habits.find(h => h.id === selectedHabitId);

  return (
    <HashRouter>
      <div className="min-h-screen font-sans selection:bg-gold-500/30">
        
        <main className="max-w-md mx-auto min-h-screen bg-stone-50 dark:bg-stone-900 shadow-2xl overflow-hidden relative">
          
          {selectedHabit && (
            <HabitDetailView 
              habit={selectedHabit}
              settings={settings}
              onClose={() => setSelectedHabitId(null)}
              onUpdate={handleUpdateHabit}
              onDelete={handleDeleteHabit}
            />
          )}

          <NotificationModal 
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            settings={settings}
            confessionDate={confessionDate}
            setConfessionDate={setConfessionDate}
            lastConfessionDate={lastConfessionDate}
            setLastConfessionDate={setLastConfessionDate}
            tasks={tasks}
          />

          {currentTab === 'home' && (
            <HomeView 
              settings={settings} 
              dailyAdvice={dailyAdvice}
              refreshAdvice={handleRefreshAdvice}
              habits={habits}
              onCheckHabit={handleCheckHabit}
              onSelectHabit={(h) => setSelectedHabitId(h.id)}
              onOpenNotifications={() => setIsNotificationOpen(true)}
              hasNotification={hasNotification}
            />
          )}

          {currentTab === 'habits' && (
            <HabitsView 
              settings={settings}
              habits={habits}
              tasks={tasks}
              addHabit={handleAddHabit}
              deleteHabit={handleDeleteHabit}
              onSelectHabit={(h) => setSelectedHabitId(h.id)}
              addTask={handleAddTask}
              toggleTask={handleToggleTask}
              deleteTask={handleDeleteTask}
            />
          )}

          {currentTab === 'chat' && (
            <ChatView 
              settings={settings}
              messages={messages}
              onSendMessage={handleSendMessage}
              onClearChat={handleClearChat}
              isTyping={isTyping}
            />
          )}

          {currentTab === 'notes' && (
            <NotesView 
              settings={settings}
              notes={notes}
              addNote={handleAddNote}
              deleteNote={handleDeleteNote}
              onAddHabit={handleAddHabit}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileView 
              settings={settings}
              updateSettings={(newS) => setSettings({...settings, ...newS})}
            />
          )}

          <Navigation 
            currentTab={currentTab} 
            onTabChange={setCurrentTab} 
            lang={settings.language}
          />

        </main>
      </div>
    </HashRouter>
  );
};

export default App;