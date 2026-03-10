// frontend/src/components/pages/AboutPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import './AboutPage.css'; 
import { useNavigate } from "react-router-dom";

/* ── Google Fonts inject ── */
(function injectFonts() {
  if (document.getElementById('sm-fonts')) return;
  const link = document.createElement('link');
  link.id   = 'sm-fonts';
  link.rel  = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
})();

/* ── Intersection hook ── */
function useIntersect(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ── FadeIn component ── */
function FadeIn({ children, delay = 0, direction = 'up', className = '' }) {
  const [ref, visible] = useIntersect();
  const transforms = {
    up:    'translateY(40px)',
    left:  'translateX(-40px)',
    right: 'translateX(40px)',
    none:  'none',
  };
  return (
    <div
      ref={ref}
      className={`ap-fade-in ${className}`}
      style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translate(0)' : transforms[direction],
        transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Animated counter ── */
function Counter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const [ref, visible]    = useIntersect(0.5);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step  = target / 60;
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 20);
    return () => clearInterval(timer);
  }, [visible, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ── Data ── */
const VALUES = [
  {
    title: 'Verified Providers Only',
    body:  'Every professional on our platform submits a government ID and live photo. Our admin team manually reviews and approves each application before they appear in listings.',
    color: '#FF8C00',
    icon:  '✦',
  },
  {
    title: 'Smart Local Matching',
    body:  'We use your pincode and city to surface the most relevant, nearest service providers — saving you time and ensuring prompt service delivery.',
    color: '#FFC300',
    icon:  '◎',
  },
  {
    title: 'Transparent Reviews',
    body:  'Only users who have completed a booking can leave a review. No fake ratings. Every star is earned through real, completed service.',
    color: '#FFD400',
    icon:  '★',
  },
  {
    title: 'Zero Hidden Fees',
    body:  'The price listed by the provider is what you pay. Our platform connects you directly — no surprise charges, no booking commissions passed to users.',
    color: '#FF5F00',
    icon:  '⬡',
  },
];

const SERVICES = [
  { icon: '🔧', name: 'Plumbers',     desc: 'Pipe repairs, drain cleaning, fixture installation' },
  { icon: '⚡', name: 'Electricians', desc: 'Wiring, panel upgrades, safety inspections' },
  { icon: '📚', name: 'Tutors',       desc: 'School subjects, competitive exams, skill courses' },
  { icon: '🪚', name: 'Carpenters',   desc: 'Furniture, doors, custom woodwork' },
  { icon: '🧹', name: 'Cleaners',     desc: 'Home deep cleaning, office sanitization' },
  { icon: '🎨', name: 'Painters',     desc: 'Interior, exterior, waterproofing' },
  { icon: '🔩', name: 'Mechanics',    desc: 'Vehicle servicing, repairs, diagnostics' },
  { icon: '👨‍🍳', name: 'Cooks',      desc: 'Home chefs, catering, meal prep' },
];

const STEPS = [
  { number: '01', title: 'Search',     desc: 'Browse by category or search for any service you need.' },
  { number: '02', title: 'Compare',    desc: 'Filter by rating, availability, distance, and price.' },
  { number: '03', title: 'Book',       desc: 'Send a booking request with your preferred date and time.' },
  { number: '04', title: 'Get Served', desc: 'Provider arrives, completes the job, and you review.' },
];

const TEAM = [
  { initials: 'NC', name: 'Niilesh Chaudhari', role: 'Founder & Backend Engineer' },
  { initials: 'SP', name: 'Soham Patil',  role: 'Frontend & UX Lead' },
  { initials: 'NC', name: 'Niilesh Chaudhari', role: 'Head of Provider Verification' },
  { initials: 'SP', name: 'Soham Patil',   role: 'Operations & Community' },
];

const TEAM_COLORS = ['#FF8C00', '#FFC300', '#FFD400', '#FF5F00'];
const TEAM_BG     = [
  'rgba(255,140,0,0.12)',
  'rgba(255,195,0,0.12)',
  'rgba(255,212,0,0.12)',
  'rgba(255,95,0,0.12)',
];



/* ════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════ */
export default function AboutPage() {
  const [activeValue, setActiveValue] = useState(0);
  const navigate = useNavigate();

const goToServicesP = () => {
  navigate("/providers/69a276aea6532a4f346d7e2e");
};

const goToServices = () => {
  navigate("/services");
};

const goToRegister = () => {
  navigate("/register")
}
  return (
    <div className="ap-page">

      {/* ── HERO ── */}
      <section className="ap-hero">
        <div className="ap-hero-badge">About ServiceMarket</div>

        <FadeIn>
          <h1 className="ap-hero-title">
            The Local Services Platform
            <br />
            <span className="highlight">Your Neighbors Trust</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="ap-hero-sub">
            We built ServiceMarket because finding a reliable plumber, tutor, or
            electrician shouldn't take three phone calls and a prayer. Verified
            professionals. Real reviews. Instant booking.
          </p>
        </FadeIn>

        <FadeIn delay={0.35}>
          <div className="ap-hero-stats">
            {[
              { val: 12000, suffix: '+', label: 'Verified Providers' },
              { val: 85000, suffix: '+', label: 'Bookings Completed' },
              { val: 200,   suffix: '+', label: 'Cities Covered' },
              { val: 98,    suffix: '%', label: 'Satisfaction Rate' },
            ].map(s => (
              <div key={s.label} className="ap-stat-item">
                <div className="ap-stat-number">
                  <Counter target={s.val} suffix={s.suffix} />
                </div>
                <div className="ap-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </FadeIn>

        <div className="ap-hero-glow" />
      </section>

      {/* ── MISSION ── */}
      <section className="ap-section">
        <div className="ap-mission-grid">
          <FadeIn direction="left">
            <div>
              <span className="ap-eyebrow">Our Mission</span>
              <h2 className="ap-section-title">
                Making local expertise
                <br />
                accessible to everyone
              </h2>
              <p className="ap-body-text">
                Millions of skilled professionals across India go undiscovered —
                while households struggle to find trustworthy help. We close that gap.
              </p>
              <p className="ap-body-text">
                ServiceMarket is a two-sided marketplace: a discovery engine for
                users, and a growth platform for independent service professionals.
                We verify every provider, digitize their reputation, and make
                booking as easy as ordering food online.
              </p>
              <div className="ap-mission-tags">
                {['MERN Stack', 'JWT Auth', 'Role-Based Access', 'REST API'].map(t => (
                  <span key={t} className="ap-tag">{t}</span>
                ))}
              </div>
            </div>
          </FadeIn>

          <FadeIn direction="right" delay={0.15}>
            <div className="ap-mission-card">
              <div className="ap-mission-card-accent" />
              <div className="ap-mission-card-content">
                <div className="ap-mission-icon">🏘️</div>
                <h3 className="ap-mission-card-title">Built for Bharat</h3>
                <p className="ap-mission-card-text">
                  From metros to tier-2 cities, ServiceMarket works wherever you
                  are. Pincode-based matching surfaces the nearest available
                  provider — no GPS required.
                </p>
                <div className="ap-divider" />
                <div className="ap-mission-features">
                  {[
                    '✦ Pincode-based matching',
                    '✦ Hindi & regional language support coming soon',
                    '✦ Works on low-bandwidth connections',
                  ].map(f => (
                    <div key={f} className="ap-mission-feature">{f}</div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="ap-section warm-bg">
        <FadeIn>
          <span className="ap-eyebrow">What We Stand For</span>
          <h2 className="ap-section-title">Our Core Values</h2>
        </FadeIn>

        <div className="ap-values-grid">
          <div className="ap-value-tabs">
            {VALUES.map((v, i) => (
              <button
                key={v.title}
                className="ap-value-tab"
                onClick={() => setActiveValue(i)}
                style={{
                  color:       activeValue === i ? v.color : '#A89070',
                  borderLeftColor: activeValue === i ? v.color : 'transparent',
                  background:  activeValue === i ? `${v.color}0D` : 'none',
                }}
              >
                <span>{v.icon}</span>
                {v.title}
              </button>
            ))}
          </div>

          <div
            className="ap-value-panel"
            style={{ borderColor: VALUES[activeValue].color + '55' }}
          >
            <div className="ap-value-panel-icon">{VALUES[activeValue].icon}</div>
            <h3
              className="ap-value-panel-title"
              style={{ color: VALUES[activeValue].color }}
            >
              {VALUES[activeValue].title}
            </h3>
            <p className="ap-value-panel-body">{VALUES[activeValue].body}</p>
            <div
              className="ap-value-line"
              style={{ background: VALUES[activeValue].color }}
            />
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section className="ap-section">
        <FadeIn>
          <span className="ap-eyebrow">What We Cover</span>
          <h2 className="ap-section-title">8 Service Categories</h2>
          <p className="ap-service-sub">
            Every category is staffed with verified professionals, rated by real customers.
          </p>
        </FadeIn>

        <div className="ap-services-grid">
          {SERVICES.map((svc, i) => (
            <FadeIn key={svc.name} delay={i * 0.06}>
              <div className="ap-service-card">
                <div className="ap-service-icon">{svc.icon}</div>
                <div className="ap-service-name">{svc.name}</div>
                <div className="ap-service-desc">{svc.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="ap-section warm-bg">
        <FadeIn>
          <span className="ap-eyebrow">The Process</span>
          <h2 className="ap-section-title">Simple by Design</h2>
        </FadeIn>

        <div className="ap-steps-row">
          {STEPS.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.1}>
              <div className="ap-step-card">
                <div className="ap-step-number">{step.number}</div>
                <div className="ap-step-connector" />
                <h3 className="ap-step-title">{step.title}</h3>
                <p className="ap-step-desc">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── VERIFICATION ── */}
      <section className="ap-section">
        <FadeIn>
          <div className="ap-verify-banner">
            <div>
              <span className="ap-eyebrow">Trust & Safety</span>
              <h2 className="ap-section-title">Every Provider is Verified</h2>
              <p className="ap-body-text">
                Before appearing in any search result, providers must submit a
                live selfie and government-issued ID. Our admin team reviews
                every submission. Failed checks are rejected. Only approved
                providers receive the verified badge.
              </p>
              <div className="ap-verify-steps">
                {[
                  { step: '1', text: 'Provider submits ID + live photo' },
                  { step: '2', text: 'Admin reviews the application' },
                  { step: '3', text: 'Approved: verified badge granted' },
                  { step: '4', text: 'Only verified providers are listed' },
                ].map(v => (
                  <div key={v.step} className="ap-verify-step">
                    <div className="ap-verify-dot">{v.step}</div>
                    <span className="ap-verify-step-text">{v.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock provider card */}
            <div className="ap-verify-right">
              <div className="ap-verify-card">
                <div className="ap-verify-card-header">
                  <div className="ap-verify-avatar">SP</div>
                  <div>
                    <div className="ap-verify-name">Satish Patil</div>
                    <div className="ap-verify-sub">Cleaner · Jalgaon</div>
                  </div>
                  <div className="ap-verified-badge">✓ Verified</div>
                </div>
                <div className="ap-card-divider" />
                <div className="ap-card-row">
                  <span className="ap-card-row-label">Experience</span>
                  <span className="ap-card-row-value">8 years</span>
                </div>
                <div className="ap-card-row">
                  <span className="ap-card-row-label">Rating</span>
                  <span className="ap-card-row-value orange">★★★★★ 4.5</span>
                </div>
                <div className="ap-card-row">
                  <span className="ap-card-row-label">Jobs Done</span>
                  <span className="ap-card-row-value">24</span>
                </div>
                <div className="ap-card-row">
                  <span className="ap-card-row-label">Status</span>
                  <span className="ap-card-row-value green">🟢 Available</span>
                </div>
                <button className="ap-book-btn" onClick={goToServicesP}>Book Now →</button>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── TEAM ── */}
      <section className="ap-section warm-bg">
        <FadeIn>
          <span className="ap-eyebrow">The People</span>
          <h2 className="ap-section-title">Who Built This</h2>
        </FadeIn>

        <div className="ap-team-grid">
          {TEAM.map((member, i) => (
            <FadeIn key={member.name} delay={i * 0.1}>
              <div className="ap-team-card">
                <div
                  className="ap-team-avatar"
                  style={{ background: TEAM_BG[i] }}
                >
                  <span style={{ color: TEAM_COLORS[i], fontSize: 20, fontWeight: 700 }}>
                    {member.initials}
                  </span>
                </div>
                <div className="ap-team-name">{member.name}</div>
                <div className="ap-team-role">{member.role}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="ap-cta-section">
        <FadeIn>
          <div className="ap-cta-inner">
            <div className="ap-cta-glow" />
            <span className="ap-eyebrow">Join Today</span>
            <h2 className="ap-cta-title">
              Need a service?
              <br />
              <span className="highlight">We've got someone for that.</span>
            </h2>
            <p className="ap-cta-sub">
              Thousands of verified professionals are waiting to help you right now.
            </p>
            <div className="ap-cta-btns">
              <button className="ap-btn-primary" onClick={goToServices}>Find a Provider →</button>
              <button className="ap-btn-secondary" onClick={goToRegister}>Join as a Provider</button>
            </div>
          </div>
        </FadeIn>
      </section>

    </div>
  );
}