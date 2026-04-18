"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";

function generateStrongPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const symbols = "!@#$%^&*-_=+?";
  const all = upper + lower + numbers + symbols;
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    lower[Math.floor(Math.random() * lower.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  const remaining = Array.from({ length: 7 }, () => all[Math.floor(Math.random() * all.length)]);
  return [...required, ...remaining].sort(() => Math.random() - 0.5).join("");
}

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "taken" | "available">("idle");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const emailCheckTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current);
    if (!email || !email.includes("@")) { setEmailStatus("idle"); return; }
    setEmailStatus("checking");
    emailCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`);
        const data = await res.json();
        setEmailStatus(data.exists ? "taken" : "available");
      } catch { setEmailStatus("idle"); }
    }, 600);
    return () => { if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current); };
  }, [email]);

  const handleGeneratePassword = () => {
    const pwd = generateStrongPassword();
    setPassword(pwd); setRepeatPassword(pwd); setGeneratedPassword(pwd); setShowPassword(true); setCopied(false);
  };

  const handleCopy = async () => {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStatus === "taken") { setError("This email is already registered. Please sign in instead."); return; }
    const supabase = createClient();
    setIsLoading(true); setError(null);
    if (password !== repeatPassword) { setError("Passwords do not match"); setIsLoading(false); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); setIsLoading(false); return; }
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/member-portal`, data: { full_name: fullName.trim() } },
      });
      if (error) throw error;
      if (data.user && fullName.trim()) {
        await supabase.from("profiles").update({ full_name: fullName.trim(), updated_at: new Date().toISOString() }).eq("id", data.user.id);
      }
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally { setIsLoading(false); }
  };

  const getStrength = (pwd: string) => {
    if (!pwd) return { label: "", color: "#E8EDF3", width: "0%" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { label: "Weak", color: "#E74C6F", width: "33%" };
    if (score <= 3) return { label: "Fair", color: "#F0A500", width: "66%" };
    return { label: "Strong", color: "#2EC4B6", width: "100%" };
  };

  const strength = getStrength(password);

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create your bioERGOtech account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full Name *</Label>
                <Input id="full-name" type="text" placeholder="Dr. Maria Rossi" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <div style={{ position: "relative" }}>
                  <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ borderColor: emailStatus === "taken" ? "#E74C6F" : emailStatus === "available" ? "#2EC4B6" : undefined }} />
                  {emailStatus === "checking" && <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#8896A6" }}>Checking…</div>}
                </div>
                {emailStatus === "taken" && <p style={{ fontSize: 12, color: "#E74C6F", margin: 0 }}>✕ This email is already registered. <Link href="/auth/login" style={{ color: "#E74C6F", fontWeight: 700, textDecoration: "underline" }}>Sign in instead →</Link></p>}
                {emailStatus === "available" && <p style={{ fontSize: 12, color: "#2EC4B6", margin: 0 }}>✓ Email is available</p>}
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password *</Label>
                  <button type="button" onClick={handleGeneratePassword} style={{ fontSize: 12, color: "#2EC4B6", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 3 }}>Suggest strong password</button>
                </div>
                <div style={{ position: "relative" }}>
                  <Input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => { setPassword(e.target.value); setGeneratedPassword(null); }} style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#8896A6", fontSize: 12, padding: 0 }}>{showPassword ? "Hide" : "Show"}</button>
                </div>
                {password && (
                  <div>
                    <div style={{ height: 4, borderRadius: 2, background: "#E8EDF3", overflow: "hidden" }}><div style={{ height: "100%", width: strength.width, background: strength.color, borderRadius: 2, transition: "width 0.3s ease" }} /></div>
                    <div style={{ fontSize: 11, color: strength.color, fontWeight: 600, marginTop: 4 }}>{strength.label}</div>
                  </div>
                )}
                {generatedPassword && (
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "#E8F8F6", border: "1px solid #B2E8E2", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#1A9E92", fontWeight: 600, marginBottom: 3 }}>Generated password — save this somewhere safe</div>
                      <div style={{ fontSize: 13, color: "#1A2332", fontFamily: "monospace", letterSpacing: "0.05em" }}>{generatedPassword}</div>
                    </div>
                    <button type="button" onClick={handleCopy} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #2EC4B6", background: copied ? "#2EC4B6" : "#fff", color: copied ? "#fff" : "#2EC4B6", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, transition: "all 0.2s" }}>{copied ? "Copied!" : "Copy"}</button>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Repeat Password *</Label>
                <Input id="repeat-password" type={showPassword ? "text" : "password"} required value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} />
                {repeatPassword && password !== repeatPassword && <p style={{ fontSize: 12, color: "#E74C6F", margin: 0 }}>Passwords do not match</p>}
                {repeatPassword && password === repeatPassword && <p style={{ fontSize: 12, color: "#2EC4B6", margin: 0 }}>✓ Passwords match</p>}
              </div>

              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#F7F9FC", border: "1px solid #E8EDF3", fontSize: 12, color: "#8896A6", lineHeight: 1.5 }}>
                After signing up you can complete your profile — add your photo, organisation, research area, LinkedIn and more.
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading || emailStatus === "taken"}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}<Link href="/auth/login" className="underline underline-offset-4">Login</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
