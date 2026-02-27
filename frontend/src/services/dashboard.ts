import axios from "axios";

export interface DashboardPage {
  id: string;
  slug: string;
  title: string | null;
  ownerName: string;
  bio: string | null;
  calendarUrls: string[];
  defaultDurationMinutes: number;
  bufferMinutes: number;
  dateRangeDays: number;
  minNoticeHours: number;
  includeWeekends: boolean;
  hasNotificationEmail: boolean;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface PagesListResponse {
  pages: DashboardPage[];
  activeCount: number;
  maxPages: number;
}

export interface CreatePageInput {
  title?: string;
  ownerName: string;
  bio?: string;
  notificationEmail?: string;
  calendarUrls: string[];
  defaultDurationMinutes?: number;
  bufferMinutes?: number;
  dateRangeDays?: number;
  minNoticeHours?: number;
  includeWeekends?: boolean;
  expiryDays?: number;
}

export interface CreatePageResult {
  id: string;
  slug: string;
  title: string | null;
  ownerName: string;
  expiresAt: string;
  isActive: boolean;
}

export interface UpdatePageInput {
  title?: string;
  ownerName?: string;
  bio?: string;
  notificationEmail?: string | null;
  calendarUrls?: string[];
  defaultDurationMinutes?: number;
  bufferMinutes?: number;
  dateRangeDays?: number;
  minNoticeHours?: number;
  includeWeekends?: boolean;
}

export interface AppointmentRequest {
  id: string;
  requesterName: string;
  requesterEmail: string;
  reason: string;
  notes: string | null;
  startTime: string;
  endTime: string;
  timezone: string | null;
  createdAt: string;
}

/** List the authenticated user's pages. */
export async function listPages(): Promise<PagesListResponse> {
  const resp = await axios.get<PagesListResponse>("/api/dashboard/pages");
  return resp.data;
}

/** Create a new scheduling page. */
export async function createPage(
  input: CreatePageInput
): Promise<CreatePageResult> {
  const resp = await axios.post<CreatePageResult>(
    "/api/dashboard/pages",
    input
  );
  return resp.data;
}

/** Update a page's settings. */
export async function updatePage(
  pageId: string,
  input: UpdatePageInput
): Promise<void> {
  await axios.patch(`/api/dashboard/pages/${pageId}`, input);
}

/** Delete a page. */
export async function deletePage(pageId: string): Promise<void> {
  await axios.delete(`/api/dashboard/pages/${pageId}`);
}

/** List appointment requests for a page. */
export async function listRequests(
  pageId: string
): Promise<AppointmentRequest[]> {
  const resp = await axios.get<{ requests: AppointmentRequest[] }>(
    `/api/dashboard/pages/${pageId}/requests`
  );
  return resp.data.requests;
}
