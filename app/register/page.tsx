import Link from "next/link";
import { register } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card auth-card-wide">
        <Link href="/" className="brand"><span className="brand-mark">C</span> CashPilot</Link>
        <div className="auth-heading"><p className="eyebrow">GET STARTED</p><h1>Create your company</h1><p>You will be the owner of this workspace.</p></div>
        {error && <div className="form-message error">{error}</div>}
        <form action={register} className="form-stack">
          <div className="form-grid">
            <label>Your name<input name="name" autoComplete="name" required /></label>
            <label>Company name<input name="companyName" required /></label>
          </div>
          <label>Email<input type="email" name="email" autoComplete="email" required /></label>
          <label>Password <span className="field-hint">At least 8 characters</span><input type="password" name="password" autoComplete="new-password" minLength={8} required /></label>
          <SubmitButton>Create company</SubmitButton>
        </form>
        <p className="auth-footer">Already registered? <Link href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
