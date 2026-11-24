// The notification API is not available yet; start with no fabricated alerts.
export const notifications: Array<{
  id: string;
  type: "error" | "warning" | "success" | "info";
  title: string;
  message: string;
  time: string;
}> = [];
