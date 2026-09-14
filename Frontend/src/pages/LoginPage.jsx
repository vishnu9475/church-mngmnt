import { useState } from "react";
import { ArrowLeft, Church, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { confirmPasswordReset, login, requestPasswordReset } from "../services/authService";

export default function LoginPage({ onLogin }) {
  const query = new URLSearchParams(window.location.search);
  const resetUid = query.get("reset_uid") || "";
  const resetToken = query.get("reset_token") || "";
  const hasResetLink = Boolean(resetUid && resetToken);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetHelp, setShowResetHelp] = useState(hasResetLink);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      await onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openResetRequest = () => {
    setResetMessage("");
    setResetError("");
    setShowResetHelp(true);
  };

  const closeReset = () => {
    if (hasResetLink) window.history.replaceState({}, document.title, window.location.pathname);
    setResetError("");
    setResetMessage("");
    setShowResetHelp(false);
  };

  const submitResetRequest = async (event) => {
    event.preventDefault();
    setResetError("");
    setResetLoading(true);
    try {
      const response = await requestPasswordReset(resetEmail.trim());
      setResetMessage(response.detail);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const submitNewPassword = async (event) => {
    event.preventDefault();
    setResetError("");
    if (newPassword !== confirmPassword) {
      setResetError("The passwords do not match.");
      return;
    }
    setResetLoading(true);
    try {
      const response = await confirmPasswordReset(resetUid, resetToken, newPassword);
      setResetMessage(response.detail);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 font-sans text-slate-900">
      <div className="relative min-h-screen lg:grid lg:grid-cols-2">
        <section className="relative hidden overflow-hidden bg-emerald-950 px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative flex items-center gap-3 text-lg font-semibold tracking-tight"><span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20"><Church size={24} /></span>Church Management</div>
          <div className="relative max-w-lg"><p className="mb-5 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">Financial records system</p><h1 className="text-5xl font-semibold leading-[1.1] tracking-tight">Stewardship made simpler.</h1><p className="mt-6 max-w-md text-lg leading-8 text-emerald-50/80">Securely manage your church families, collections, expenses, dues, and financial reports from one place.</p></div>
          <div className="relative flex items-center gap-3 text-sm text-emerald-100/75"><ShieldCheck size={20} className="text-emerald-300" /> Protected access for authorized church staff</div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10 sm:px-8">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
          <div className="relative w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden"><span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-700 text-white shadow-lg shadow-emerald-900/15"><Church size={23} /></span><span className="text-lg font-bold tracking-tight text-slate-900">Church Management</span></div>
            <div className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xl shadow-slate-900/8 sm:p-9">
              <div className="mb-8"><span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><LockKeyhole size={22} /></span><h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in with your staff account to continue.</p></div>
              <form onSubmit={submit} className="space-y-5">
                <label className="block text-sm font-semibold text-slate-700">Username<span className="relative mt-2 block"><UserRound size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" placeholder="Enter your username" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10" /></span></label>
                <label className="block text-sm font-semibold text-slate-700"><span className="flex items-center justify-between">Password<button type="button" onClick={openResetRequest} className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-900 hover:underline">Forgot password?</button></span><span className="relative mt-2 block"><LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" placeholder="Enter your password" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-emerald-700" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
                {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-700">{error}</div>}
                <button disabled={loading} className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-800/20 transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-70">{loading ? "Signing in..." : "Sign in securely"}</button>
              </form>
            </div>
            <p className="mt-6 text-center text-xs text-slate-400">Church Management System · Authorized users only</p>
          </div>

          {showResetHelp && <div className="fixed inset-0 z-50 grid place-items-center p-5"><button type="button" aria-label="Close password reset" onClick={closeReset} className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" /><div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="relative w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl"><button type="button" onClick={closeReset} className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-emerald-700"><ArrowLeft size={16} /> Back to sign in</button><span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Mail size={22} /></span>{hasResetLink ? <><h3 id="reset-title" className="text-xl font-bold text-slate-900">Choose a new password</h3><p className="mt-2 text-sm leading-6 text-slate-600">Choose a strong new password for your staff account.</p><form onSubmit={submitNewPassword} className="mt-5 space-y-4"><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required autoComplete="new-password" placeholder="New password" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" placeholder="Confirm new password" className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /><ResetMessage message={resetMessage} error={resetError} /><button disabled={resetLoading || Boolean(resetMessage)} className="h-11 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{resetLoading ? "Resetting..." : "Reset password"}</button></form></> : <><h3 id="reset-title" className="text-xl font-bold text-slate-900">Reset your password</h3><p className="mt-2 text-sm leading-6 text-slate-600">Enter the email address registered for your staff account. We will email a secure reset link.</p><form onSubmit={submitResetRequest} className="mt-5 space-y-4"><label className="block text-sm font-semibold text-slate-700">Registered email<input type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} required autoComplete="email" placeholder="name@example.com" className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-normal outline-none focus:border-emerald-600" /></label><ResetMessage message={resetMessage} error={resetError} /><button disabled={resetLoading} className="h-11 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{resetLoading ? "Sending..." : "Send reset link"}</button></form></>}</div></div>}
        </section>
      </div>
    </main>
  );
}

function ResetMessage({ message, error }) {
  if (error) return <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (message) return <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>;
  return null;
}
