import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { storage } from '../lib/storage';

export type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeType;
  colorScheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  colorScheme: 'light',
  setThemeMode: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colorScheme: nativewindScheme, setColorScheme } = useNativewindColorScheme();
  const deviceScheme = useDeviceColorScheme() || 'light';
  
  // Read persisted theme, defaulting to 'light'
  const [themeMode, setThemeModeState] = useState<ThemeType>(() => {
    const saved = storage.getItem('user-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'light';
  });

  // Keep Nativewind engine synchronized with the chosen themeMode
  useEffect(() => {
    if (themeMode === 'system') {
      setColorScheme('system');
    } else {
      setColorScheme(themeMode);
    }
  }, [themeMode, setColorScheme]);

  // Determine the final active visual scheme (light or dark)
  const activeScheme = themeMode === 'system' ? deviceScheme : themeMode;

  const setThemeMode = (mode: ThemeType) => {
    setThemeModeState(mode);
    storage.setItem('user-theme', mode);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, colorScheme: activeScheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
