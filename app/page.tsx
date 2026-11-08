export default function HomePage() {
  return (
    <main className="welcome-page">
      <section className="welcome-card">
        <div className="brand brand-large"><span className="brand-mark">C</span> CashPilot</div>
        <p className="eyebrow">CASH FLOW, CLEARLY AHEAD</p>
        <h1>Know what your business can pay.</h1>
        <p className="lead">
          Bring invoices, customer payments, expenses and forecasts together in one simple workspace.
        </p>
        <div className="feature-row" aria-label="Main features">
          <span>Real cash balance</span>
          <span>30, 60 & 90-day forecasts</span>
          <span>Safe what-if scenarios</span>
        </div>
      </section>
    </main>
  );
}
