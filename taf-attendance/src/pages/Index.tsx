import { Link } from "react-router-dom";
import { Fingerprint } from "lucide-react";

export default function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-primary">
            <Fingerprint className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground">AttendMS</h1>
        <p className="text-muted-foreground mt-2">Attendance Management System</p>
        <Link
          to="/"
          className="mt-6 inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-primary hover:opacity-90 transition-opacity"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
