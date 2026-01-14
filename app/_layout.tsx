import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AppProvider, useApp } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { configureNotifications, scheduleReminders } from '@/utils/notifications';
import { formatDate, getCurrentDateET } from '@/utils/date';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

// Configure notifications on app load
configureNotifications();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

// Component to handle notification scheduling based on app state
function NotificationScheduler() {
  const { logs, notificationSettings, isLoading } = useApp();

  useEffect(() => {
    if (isLoading) return;

    // Check if today's log is complete
    const today = formatDate(getCurrentDateET());
    const isTodayComplete = !!logs[today];

    // Schedule or cancel reminders based on current state
    scheduleReminders(notificationSettings, isTodayComplete);
  }, [logs, notificationSettings, isLoading]);

  return null;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AppProvider>
      <NotificationScheduler />
      <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </NavigationThemeProvider>
    </AppProvider>
  );
}
