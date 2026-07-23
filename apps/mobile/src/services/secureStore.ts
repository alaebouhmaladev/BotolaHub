import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function saveSecureItem(
  key: string,
  value: string,
): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch {
      // web fallback
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch {
      // web fallback
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
