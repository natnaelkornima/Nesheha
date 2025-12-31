import React from 'react';
import { Home, ListChecks, Sparkles, NotebookPen, User } from 'lucide-react';
import { TabView } from '../types';
import { NAV_ITEMS, TRANSLATIONS } from '../constants';

interface NavigationProps {
  currentTab: TabView;
  onTabChange: (tab: TabView) => void;
  lang: 'am' | 'en';
}

const Icons = {
  Home,
  ListChecks,
  Sparkles,
  NotebookPen,
  User
};

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onTabChange, lang }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-stone-900 border-t border-stone-100 dark:border-stone-800 pb-safe pt-2 px-6 h-20 flex justify-between items-center z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
      {NAV_ITEMS.map((item) => {
        const Icon = Icons[item.icon as keyof typeof Icons];
        const isActive = currentTab === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${
              isActive 
                ? 'text-gold-600 dark:text-gold-500 -translate-y-1' 
                : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
            }`}
          >
            <Icon size={isActive ? 26 : 24} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-0'}`}>
              {TRANSLATIONS[lang][item.labelKey]}
            </span>
          </button>
        );
      })}
    </div>
  );
};