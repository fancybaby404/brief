// Event reminders as LOCAL notifications scheduled on this phone. No push token, no server.
// expo-notifications is imported lazily so a build without the native module loses reminders, not the app.
import { Platform } from 'react-native';
import type { Event } from '../types';
import { kindInfo, kindOf, reminderAt } from './events';

const CHANNEL = 'reminders';
type N = typeof import('expo-notifications');
let lib: Promise<N> | null = null;
function notifications() {
  return lib ??= import('expo-notifications').then(async n => {
    // Show reminders that fire while Brief is open, too.
    n.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });
    if (Platform.OS === 'android') await n.setNotificationChannelAsync(CHANNEL, { name: 'Event reminders', importance: n.AndroidImportance.DEFAULT });
    return n;
  }).catch(e => { lib = null; throw e; });
}

/** Asks only when the user picks a reminder. false = notifications are off for Brief (or unavailable). */
export async function allowReminders() {
  try {
    const n = await notifications();
    const now = await n.getPermissionsAsync();
    if (now.granted) return true;
    if (!now.canAskAgain) return false;
    return (await n.requestPermissionsAsync()).granted;
  } catch { return false; }
}

export type ReminderResult = 'set' | 'none' | 'passed' | 'blocked' | 'failed';
/** Replaces the event's reminder. Returns the new notification id (if any) and what happened, for honest copy. */
export async function syncReminder(e: Event, previousId: string | undefined, time: string): Promise<{ notificationId?: string; result: ReminderResult }> {
  if (previousId) await cancelReminder(previousId);
  if (e.reminderMinutes == null) return { result: 'none' };
  const at = reminderAt(e);
  if (!at) return { result: 'passed' };
  if (!(await allowReminders())) return { result: 'blocked' };
  const n = await notifications();
  // Lock-screen text: title, kind and time only. Private notes never leave the app.
  const notificationId = await n.scheduleNotificationAsync({
    content: { title: e.title, body: `${kindInfo(kindOf(e)).label} · ${time}${e.location ? ' · ' + e.location : ''}`, data: { eventId: e.id } },
    trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
  });
  return { notificationId, result: 'set' };
}

export async function cancelReminder(id?: string) {
  if (!id) return;
  try { await (await notifications()).cancelScheduledNotificationAsync(id); } catch { /* already fired or module unavailable */ }
}
