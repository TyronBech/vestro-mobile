import { apiClient } from "../client";
import { Result, ok, err } from "../../../utils/result";
import { ApiResponse, AppNotification } from "../../../types";

export async function registerPushToken(params: {
  token: string;
  deviceType?: string | null;
  deviceName?: string | null;
}): Promise<Result<any, string>> {
  try {
    const response = await apiClient<ApiResponse<any>>("/notifications/register", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || "Failed to register push token");
  }
}

export async function unregisterPushToken(params: {
  token: string;
}): Promise<Result<any, string>> {
  try {
    const response = await apiClient<ApiResponse<any>>("/notifications/unregister", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || "Failed to unregister push token");
  }
}

export async function fetchNotifications(): Promise<Result<AppNotification[], string>> {
  try {
    const response = await apiClient<ApiResponse<AppNotification[]>>("/notifications");
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || "Failed to fetch notifications");
  }
}

export async function markNotificationAsRead(id: string): Promise<Result<AppNotification, string>> {
  try {
    const response = await apiClient<ApiResponse<AppNotification>>(`/notifications/${id}/read`, {
      method: "PATCH",
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || "Failed to mark notification as read");
  }
}

export async function markAllNotificationsAsRead(): Promise<Result<boolean, string>> {
  try {
    const response = await apiClient<ApiResponse<boolean>>("/notifications/mark-all-read", {
      method: "POST",
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || "Failed to mark all notifications as read");
  }
}

export async function testTriggerNotification(type?: string): Promise<Result<{ message: string }, string>> {
  try {
    const response = await apiClient<ApiResponse<{ message: string }>>("/notifications/test-trigger", {
      method: "POST",
      body: JSON.stringify({ type }),
    });
    return ok(response.data);
  } catch (error: any) {
    return err(error.message || "Failed to trigger test notification");
  }
}
