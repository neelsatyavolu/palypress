import AsyncStorage from "@react-native-async-storage/async-storage";
import { commentAuthorKey } from "@shared/moderation";

const BLOCKS_KEY = "palypress.blockedAuthors";
const REPORTS_KEY = "palypress.reportedComments";

export { commentAuthorKey };

export async function getLocalBlockedKeys(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(BLOCKS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export async function addLocalBlockedKey(key: string): Promise<void> {
  const keys = await getLocalBlockedKeys();
  if (keys.includes(key)) return;
  await AsyncStorage.setItem(BLOCKS_KEY, JSON.stringify([...keys, key]));
}

export async function removeLocalBlockedKey(key: string): Promise<void> {
  const keys = await getLocalBlockedKeys();
  await AsyncStorage.setItem(
    BLOCKS_KEY,
    JSON.stringify(keys.filter((value) => value !== key)),
  );
}

export async function getLocalReportedCommentIds(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(REPORTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "number")
      : [];
  } catch {
    return [];
  }
}

export async function addLocalReportedCommentId(id: number): Promise<void> {
  const ids = await getLocalReportedCommentIds();
  if (ids.includes(id)) return;
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify([...ids, id]));
}
