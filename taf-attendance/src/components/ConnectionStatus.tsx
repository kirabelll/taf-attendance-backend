import { useConnectionTest } from "@/hooks/useAttendanceData";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function ConnectionStatus() {
  const { data, isLoading, error } = useConnectionTest();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Checking connection...</span>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <XCircle className="w-4 h-4" />
        <span>Backend Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle className="w-4 h-4" />
      <span>Backend Connected</span>
    </div>
  );
}