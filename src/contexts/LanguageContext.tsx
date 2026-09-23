import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'so';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (en: string, so: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('so'); // Default to Somali

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved) setLanguage(saved);
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'so' : 'en';
    setLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const t = (en: string, so: string) => {
    return language === 'en' ? en : so;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
