import { useTheme } from '@/context/ThemeContext';

export function useColorScheme(): 'light' | 'dark' {
  const { effectiveTheme } = useTheme();
  return effectiveTheme;
}
