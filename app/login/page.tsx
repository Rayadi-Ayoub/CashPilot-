import Link from "next/link";
import { login } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="brand"><span className="brand-mark">C</span> CashPilot</Link>
        <div className="auth-heading"><p className="eyebrow">WELCOME BACK</p><h1>Sign in</h1><p>Open your company workspace.</p></div>
        {error && <div className="form-message error">{error}</div>}
        <form action={login} className="form-stack">
          <label>Email<input type="email" name="email" autoComplete="email" required /></label>
          <label>Password<input type="password" name="password" autoComplete="current-password" required /></label>
          <SubmitButton>Sign in</SubmitButton>
        </form>
        <p className="auth-footer">New to CashPilot? <Link href="/register">Create a company</Link></p>
      </section>
    </main>
  );
}
