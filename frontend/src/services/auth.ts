import axios from "axios";

export interface AuthSession {
  emojiId: string;
}

export interface SignupResult {
  emojiId: string;
  recoveryCodes: string[];
  message: string;
}

export interface RecoverResult {
  emojiId: string;
  remainingRecoveryCodes: number;
  warning?: string;
}

/** Fetch a single suggested unique Emoji ID for the signup form. */
export async function suggestEmojiId(): Promise<string> {
  const resp = await axios.get<{ emojiId: string }>("/api/auth/suggest");
  return resp.data.emojiId;
}

/** Fetch multiple suggested unique Emoji IDs in a single request. */
export async function suggestEmojiIds(count: number): Promise<string[]> {
  const resp = await axios.get<{ suggestions: string[] }>(
    `/api/auth/suggest?count=${count}`
  );
  return resp.data.suggestions;
}

/** Create a new account with an iCal URL and optional Emoji ID. */
export async function signup(
  icalUrl: string,
  emojiId?: string
): Promise<SignupResult> {
  const resp = await axios.post<SignupResult>("/api/auth/signup", {
    icalUrl,
    emojiId,
  });
  return resp.data;
}

/** Sign in with an Emoji ID and iCal URL. */
export async function signin(
  emojiId: string,
  icalUrl: string
): Promise<AuthSession> {
  const resp = await axios.post<AuthSession>("/api/auth/signin", {
    emojiId,
    icalUrl,
  });
  return resp.data;
}

/** Recover access using a recovery code. Optionally set a new iCal URL. */
export async function recover(
  emojiId: string,
  recoveryCode: string,
  newIcalUrl?: string
): Promise<RecoverResult> {
  const resp = await axios.post<RecoverResult>("/api/auth/recover", {
    emojiId,
    recoveryCode,
    newIcalUrl,
  });
  return resp.data;
}

/** Sign out the current session. */
export async function signout(): Promise<void> {
  await axios.post("/api/auth/signout");
}

/** Check the current session. Returns null if not authenticated. */
export async function getMe(): Promise<AuthSession | null> {
  try {
    const resp = await axios.get<AuthSession>("/api/auth/me");
    return resp.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      return null;
    }
    throw err;
  }
}
