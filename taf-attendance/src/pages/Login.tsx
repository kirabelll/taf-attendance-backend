import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fingerprint, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiService } from "@/lib/api";

export default function Login() {
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [registerMode, setRegisterMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = registerMode
        ? await apiService.register(name, email, password)
        : await apiService.login(email, password);
      localStorage.setItem("attendance_access_token", result.access);
      localStorage.setItem("attendance_user", JSON.stringify(result.user));
      navigate("/");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-sidebar p-12 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full bg-primary-glow blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-primary">
              <Fingerprint className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold text-sidebar-accent-foreground">AttendMS</p>
              <p className="text-xs text-sidebar-foreground">Attendance Management System</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold text-sidebar-accent-foreground leading-tight">
            Smart Attendance<br />
            <span className="text-gradient">Management</span>
          </h2>
          <p className="text-sidebar-foreground text-base leading-relaxed max-w-sm">
            Monitor employee attendance in real-time, manage check-ins and check-outs, and generate comprehensive reports.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: "Employees", value: "12+" },
              { label: "Devices", value: "5" },
              { label: "Uptime", value: "99.9%" },
            ].map(item => (
              <div key={item.label} className="bg-sidebar-accent rounded-xl p-4 border border-sidebar-border">
                <p className="text-2xl font-bold text-sidebar-accent-foreground">{item.value}</p>
                <p className="text-xs text-sidebar-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-success" />
          <span className="text-xs text-sidebar-foreground">Secured with expiring access tokens · Django API</span>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-primary">
              <Fingerprint className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground">AttendMS</p>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground">{registerMode ? "Create your account" : "Welcome back"}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{registerMode ? "Register to access attendance management" : "Sign in to your attendance account"}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {registerMode && <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">Full name</Label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="pl-10 h-11" placeholder="Your name" autoComplete="name" required />
              </div>
            </div>}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  placeholder="admin@company.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  placeholder="Enter your password"
                  autoComplete={registerMode ? "new-password" : "current-password"}
                  minLength={registerMode ? 8 : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

            <Button
              type="submit"
              className="w-full h-11 bg-primary text-primary-foreground font-semibold shadow-primary hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : registerMode ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {registerMode ? "Already have an account?" : "Need an account?"}{" "}
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setRegisterMode(!registerMode); setError(""); }}>
              {registerMode ? "Sign in" : "Register"}
            </button>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            Attendance API access requires a valid sign-in
          </p>
        </div>
      </div>
    </div>
  );
}
