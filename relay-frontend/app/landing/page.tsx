'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoaded(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page">
      <style jsx global>{`
        :root {
          --cream: #FDF6E9;
          --cream-dark: #F5EBD8;
          --terracotta: #C75C3B;
          --terracotta-dark: #A34830;
          --navy: #1A2744;
          --navy-light: #2A3A5A;
          --sage: #8FA382;
          --gold: #D4A853;
          --font-display: 'Fraunces', Georgia, serif;
          --font-body: 'DM Sans', -apple-system, sans-serif;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          background: var(--cream);
          color: var(--navy);
          font-family: var(--font-body);
          overflow-x: hidden;
        }

        .landing-page {
          position: relative;
        }

        /* Grain overlay */
        .landing-page::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: 0.03;
          pointer-events: none;
          z-index: 1000;
        }

        /* Navigation */
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 1.5rem 4rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.3s ease, backdrop-filter 0.3s ease;
        }

        .nav.scrolled {
          background: rgba(253, 246, 233, 0.9);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(26, 39, 68, 0.1);
        }

        .nav-logo {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--navy);
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .nav-logo-icon {
          width: 40px;
          height: 40px;
          background: var(--terracotta);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--cream);
          font-size: 1.2rem;
        }

        .nav-links {
          display: flex;
          gap: 2.5rem;
          align-items: center;
        }

        .nav-link {
          font-size: 0.95rem;
          color: var(--navy);
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .nav-link:hover {
          color: var(--terracotta);
        }

        .nav-cta {
          background: var(--navy);
          color: var(--cream);
          padding: 0.75rem 1.75rem;
          border-radius: 100px;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .nav-cta:hover {
          background: var(--terracotta);
          transform: translateY(-2px);
        }

        /* Hero Section */
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 8rem 4rem 4rem;
          position: relative;
          overflow: hidden;
        }

        .hero-content {
          max-width: 700px;
          position: relative;
          z-index: 2;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--cream-dark);
          border: 1px solid var(--navy);
          padding: 0.5rem 1rem;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 2rem;
          opacity: 0;
          transform: translateY(20px);
          animation: fadeInUp 0.8s ease 0.2s forwards;
        }

        .hero-badge-dot {
          width: 8px;
          height: 8px;
          background: var(--sage);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .hero-title {
          font-family: var(--font-display);
          font-size: clamp(3rem, 7vw, 5.5rem);
          font-weight: 700;
          line-height: 1.05;
          margin-bottom: 1.5rem;
          opacity: 0;
          transform: translateY(30px);
          animation: fadeInUp 0.8s ease 0.4s forwards;
        }

        .hero-title em {
          font-style: italic;
          color: var(--terracotta);
        }

        .hero-subtitle {
          font-size: 1.25rem;
          line-height: 1.7;
          color: var(--navy-light);
          max-width: 540px;
          margin-bottom: 2.5rem;
          opacity: 0;
          transform: translateY(30px);
          animation: fadeInUp 0.8s ease 0.6s forwards;
        }

        .hero-ctas {
          display: flex;
          gap: 1rem;
          opacity: 0;
          transform: translateY(30px);
          animation: fadeInUp 0.8s ease 0.8s forwards;
        }

        .btn-primary {
          background: var(--terracotta);
          color: var(--cream);
          padding: 1rem 2rem;
          border-radius: 100px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          border: 2px solid var(--terracotta);
        }

        .btn-primary:hover {
          background: var(--terracotta-dark);
          border-color: var(--terracotta-dark);
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(199, 92, 59, 0.3);
        }

        .btn-secondary {
          background: transparent;
          color: var(--navy);
          padding: 1rem 2rem;
          border-radius: 100px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          border: 2px solid var(--navy);
        }

        .btn-secondary:hover {
          background: var(--navy);
          color: var(--cream);
          transform: translateY(-3px);
        }

        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Hero Visual */
        .hero-visual {
          position: absolute;
          right: -5%;
          top: 50%;
          transform: translateY(-50%);
          width: 55%;
          aspect-ratio: 1;
          opacity: 0;
          animation: fadeIn 1.2s ease 0.5s forwards;
        }

        @keyframes fadeIn {
          to { opacity: 1; }
        }

        .dial-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .dial-outer {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          aspect-ratio: 1;
          border: 3px solid var(--navy);
          border-radius: 50%;
          opacity: 0.15;
        }

        .dial-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60%;
          aspect-ratio: 1;
          background: linear-gradient(135deg, var(--terracotta) 0%, var(--terracotta-dark) 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 20px 60px rgba(199, 92, 59, 0.3),
            inset 0 -5px 20px rgba(0,0,0,0.1);
        }

        .dial-center {
          width: 30%;
          aspect-ratio: 1;
          background: var(--cream);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dial-icon {
          font-size: 2.5rem;
        }

        .dial-dots {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 75%;
          aspect-ratio: 1;
        }

        .dial-dot {
          position: absolute;
          width: 12px;
          height: 12px;
          background: var(--navy);
          border-radius: 50%;
          opacity: 0.3;
        }

        .floating-card {
          position: absolute;
          background: white;
          border-radius: 16px;
          padding: 1.25rem;
          box-shadow: 0 10px 40px rgba(26, 39, 68, 0.1);
          opacity: 0;
          animation: floatIn 0.8s ease forwards;
        }

        .floating-card-1 {
          top: 15%;
          right: 15%;
          animation-delay: 1s;
        }

        .floating-card-2 {
          bottom: 20%;
          left: 10%;
          animation-delay: 1.2s;
        }

        .floating-card-3 {
          top: 60%;
          right: 5%;
          animation-delay: 1.4s;
        }

        @keyframes floatIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
          from {
            transform: translateY(20px);
          }
        }

        .card-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.75rem;
          font-size: 1.25rem;
        }

        .card-icon.green { background: rgba(143, 163, 130, 0.2); }
        .card-icon.gold { background: rgba(212, 168, 83, 0.2); }
        .card-icon.terracotta { background: rgba(199, 92, 59, 0.2); }

        .card-title {
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }

        .card-value {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--terracotta);
        }

        .card-label {
          font-size: 0.8rem;
          color: var(--navy-light);
        }

        /* Features Section */
        .features {
          padding: 8rem 4rem;
          background: var(--navy);
          color: var(--cream);
          position: relative;
          overflow: hidden;
        }

        .features::before {
          content: '';
          position: absolute;
          top: -100px;
          left: 0;
          right: 0;
          height: 200px;
          background: var(--cream);
          transform: skewY(-3deg);
        }

        .section-header {
          text-align: center;
          max-width: 700px;
          margin: 0 auto 5rem;
          position: relative;
          z-index: 2;
        }

        .section-label {
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--gold);
          margin-bottom: 1rem;
        }

        .section-title {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 600;
          line-height: 1.2;
          margin-bottom: 1.5rem;
        }

        .section-subtitle {
          font-size: 1.15rem;
          line-height: 1.7;
          opacity: 0.8;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .feature-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 2.5rem;
          transition: all 0.4s ease;
        }

        .feature-card:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-8px);
          border-color: var(--gold);
        }

        .feature-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, var(--terracotta), var(--gold));
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
        }

        .feature-title {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .feature-desc {
          font-size: 1rem;
          line-height: 1.7;
          opacity: 0.7;
        }

        /* How It Works */
        .how-it-works {
          padding: 8rem 4rem;
          background: var(--cream);
        }

        .steps-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .step {
          display: grid;
          grid-template-columns: 1fr 80px 1fr;
          align-items: center;
          gap: 2rem;
          margin-bottom: 4rem;
        }

        .step:nth-child(even) .step-content {
          order: 3;
          text-align: left;
        }

        .step:nth-child(even) .step-visual {
          order: 1;
        }

        .step-content {
          text-align: right;
        }

        .step-number {
          font-family: var(--font-display);
          font-size: 5rem;
          font-weight: 700;
          color: var(--terracotta);
          opacity: 0.2;
          line-height: 1;
          margin-bottom: 1rem;
        }

        .step-title {
          font-family: var(--font-display);
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .step-desc {
          font-size: 1.05rem;
          line-height: 1.7;
          color: var(--navy-light);
        }

        .step-line {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
        }

        .step-dot {
          width: 20px;
          height: 20px;
          background: var(--terracotta);
          border-radius: 50%;
          flex-shrink: 0;
        }

        .step-connector {
          width: 2px;
          flex-grow: 1;
          background: linear-gradient(to bottom, var(--terracotta), transparent);
        }

        .step-visual {
          aspect-ratio: 1;
          background: var(--cream-dark);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          border: 2px solid rgba(26, 39, 68, 0.1);
        }

        /* Stats Section */
        .stats {
          padding: 6rem 4rem;
          background: var(--terracotta);
          color: var(--cream);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 3rem;
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .stat-item {
          padding: 2rem;
        }

        .stat-value {
          font-family: var(--font-display);
          font-size: 4rem;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 1rem;
          opacity: 0.9;
        }

        /* CTA Section */
        .cta {
          padding: 10rem 4rem;
          background: var(--cream);
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .cta-shape {
          position: absolute;
          border-radius: 50%;
          opacity: 0.1;
        }

        .cta-shape-1 {
          width: 400px;
          height: 400px;
          background: var(--terracotta);
          top: -100px;
          left: -100px;
        }

        .cta-shape-2 {
          width: 300px;
          height: 300px;
          background: var(--sage);
          bottom: -50px;
          right: -50px;
        }

        .cta-content {
          position: relative;
          z-index: 2;
          max-width: 700px;
          margin: 0 auto;
        }

        .cta-title {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 700;
          margin-bottom: 1.5rem;
          line-height: 1.1;
        }

        .cta-subtitle {
          font-size: 1.25rem;
          color: var(--navy-light);
          margin-bottom: 2.5rem;
          line-height: 1.7;
        }

        /* Footer */
        .footer {
          padding: 4rem;
          background: var(--navy);
          color: var(--cream);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footer-logo {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 600;
        }

        .footer-links {
          display: flex;
          gap: 2rem;
        }

        .footer-link {
          color: var(--cream);
          text-decoration: none;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .footer-link:hover {
          opacity: 1;
        }

        .footer-copy {
          font-size: 0.9rem;
          opacity: 0.5;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .nav {
            padding: 1.5rem 2rem;
          }

          .hero {
            padding: 6rem 2rem 4rem;
          }

          .hero-visual {
            width: 45%;
            right: -10%;
          }

          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }

          .hero {
            flex-direction: column;
            text-align: center;
            padding: 8rem 1.5rem 4rem;
          }

          .hero-content {
            max-width: 100%;
          }

          .hero-subtitle {
            margin-left: auto;
            margin-right: auto;
          }

          .hero-ctas {
            justify-content: center;
            flex-wrap: wrap;
          }

          .hero-visual {
            position: relative;
            right: 0;
            top: 0;
            transform: none;
            width: 100%;
            max-width: 400px;
            margin: 3rem auto 0;
          }

          .features {
            padding: 6rem 1.5rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .how-it-works {
            padding: 6rem 1.5rem;
          }

          .step {
            grid-template-columns: 1fr;
            text-align: center !important;
          }

          .step-content {
            text-align: center !important;
            order: 2 !important;
          }

          .step-line {
            display: none;
          }

          .step-visual {
            order: 1 !important;
            max-width: 200px;
            margin: 0 auto 1.5rem;
          }

          .stats {
            padding: 4rem 1.5rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .stat-item {
            padding: 1.5rem;
          }

          .cta {
            padding: 6rem 1.5rem;
          }

          .footer {
            padding: 2rem 1.5rem;
          }

          .footer-content {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }
        }
      `}</style>

      {/* Navigation */}
      <nav className={`nav ${scrollY > 50 ? 'scrolled' : ''}`}>
        <Link href="/" className="nav-logo">
          <span className="nav-logo-icon">R</span>
          RelayAI
        </Link>
        <div className="nav-links">
          <a href="#features" className="nav-link">Features</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <Link href="/login" className="nav-cta">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" ref={heroRef}>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            AI-Powered Voice Automation
          </div>
          <h1 className="hero-title">
            Never miss a<br />
            <em>follow-up</em> again
          </h1>
          <p className="hero-subtitle">
            RelayAI schedules and conducts intelligent phone calls on your behalf.
            Collect information, confirm appointments, and nurture leads—all with
            natural AI conversations.
          </p>
          <div className="hero-ctas">
            <Link href="/signup" className="btn-primary">
              Start Free Trial
              <span>→</span>
            </Link>
            <a href="#demo" className="btn-secondary">
              Watch Demo
              <span>▶</span>
            </a>
          </div>
        </div>

        <div className="hero-visual" style={{ transform: `translateY(calc(-50% + ${scrollY * 0.1}px))` }}>
          <div className="dial-container">
            <div className="dial-outer"></div>
            <div className="dial-dots">
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const x = 50 + 45 * Math.cos(angle);
                const y = 50 + 45 * Math.sin(angle);
                return (
                  <div
                    key={i}
                    className="dial-dot"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                );
              })}
            </div>
            <div className="dial-inner">
              <div className="dial-center">
                <svg className="dial-icon" style={{ width: '2.5rem', height: '2.5rem', color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="floating-card floating-card-1">
            <div className="card-icon green">
              <svg style={{ width: '1.25rem', height: '1.25rem', color: 'var(--sage)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="card-title">Calls Completed</div>
            <div className="card-value">2,847</div>
          </div>

          <div className="floating-card floating-card-2">
            <div className="card-icon gold">
              <svg style={{ width: '1.25rem', height: '1.25rem', color: 'var(--gold)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="card-title">Avg. Duration</div>
            <div className="card-value">3:24</div>
          </div>

          <div className="floating-card floating-card-3">
            <div className="card-icon terracotta">
              <svg style={{ width: '1.25rem', height: '1.25rem', color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="card-title">Success Rate</div>
            <div className="card-value">94%</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="section-header">
          <div className="section-label">Features</div>
          <h2 className="section-title">Everything you need for automated outreach</h2>
          <p className="section-subtitle">
            From scheduling to conversation analytics, RelayAI handles the entire
            follow-up process so you can focus on closing deals.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg style={{ width: '1.75rem', height: '1.75rem', color: 'var(--cream)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="feature-title">Smart Scheduling</h3>
            <p className="feature-desc">
              Schedule calls for optimal times based on contact timezone and availability.
              Set recurring follow-ups automatically.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg style={{ width: '1.75rem', height: '1.75rem', color: 'var(--cream)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="feature-title">Natural Conversations</h3>
            <p className="feature-desc">
              AI voice agents that sound human. Handle objections, answer questions,
              and adapt to any conversation flow.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg style={{ width: '1.75rem', height: '1.75rem', color: 'var(--cream)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="feature-title">Custom Templates</h3>
            <p className="feature-desc">
              Build call scripts with branching logic. Collect specific information
              with customizable question sequences.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg style={{ width: '1.75rem', height: '1.75rem', color: 'var(--cream)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="feature-title">Contact Management</h3>
            <p className="feature-desc">
              Import contacts, track call history, and maintain detailed records
              of every interaction automatically.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg style={{ width: '1.75rem', height: '1.75rem', color: 'var(--cream)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="feature-title">Rich Analytics</h3>
            <p className="feature-desc">
              Transcripts, sentiment analysis, and conversion metrics.
              Understand what works and optimize your approach.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <svg style={{ width: '1.75rem', height: '1.75rem', color: 'var(--cream)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="feature-title">Integrations</h3>
            <p className="feature-desc">
              Connect with your CRM, calendar, and workflow tools.
              Trigger calls based on events automatically.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-header">
          <div className="section-label" style={{ color: 'var(--terracotta)' }}>How It Works</div>
          <h2 className="section-title" style={{ color: 'var(--navy)' }}>Three steps to automated follow-ups</h2>
        </div>

        <div className="steps-container">
          <div className="step">
            <div className="step-content">
              <div className="step-number">01</div>
              <h3 className="step-title">Create Your Template</h3>
              <p className="step-desc">
                Design your call script with the questions you want answered.
                Set the tone, pace, and conversation style.
              </p>
            </div>
            <div className="step-line">
              <div className="step-dot"></div>
              <div className="step-connector"></div>
            </div>
            <div className="step-visual">
              <svg style={{ width: '4rem', height: '4rem', color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>

          <div className="step">
            <div className="step-content">
              <div className="step-number">02</div>
              <h3 className="step-title">Add Your Contacts</h3>
              <p className="step-desc">
                Import contacts individually or in bulk. Set timezone preferences
                and schedule optimal call times.
              </p>
            </div>
            <div className="step-line">
              <div className="step-dot"></div>
              <div className="step-connector"></div>
            </div>
            <div className="step-visual">
              <svg style={{ width: '4rem', height: '4rem', color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>

          <div className="step">
            <div className="step-content">
              <div className="step-number">03</div>
              <h3 className="step-title">Let AI Do The Rest</h3>
              <p className="step-desc">
                Our AI makes the calls, collects responses, and delivers
                detailed reports right to your dashboard.
              </p>
            </div>
            <div className="step-line">
              <div className="step-dot"></div>
            </div>
            <div className="step-visual">
              <svg style={{ width: '4rem', height: '4rem', color: 'var(--terracotta)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">50K+</div>
            <div className="stat-label">Calls Made</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">94%</div>
            <div className="stat-label">Answer Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">3.2x</div>
            <div className="stat-label">More Conversions</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">12hrs</div>
            <div className="stat-label">Saved Per Week</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-shape cta-shape-1"></div>
        <div className="cta-shape cta-shape-2"></div>
        <div className="cta-content">
          <h2 className="cta-title">Ready to automate your follow-ups?</h2>
          <p className="cta-subtitle">
            Join hundreds of businesses using RelayAI to never miss a lead.
            Start your free trial today—no credit card required.
          </p>
          <Link href="/signup" className="btn-primary">
            Get Started Free
            <span>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">RelayAI</div>
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
            <a href="#" className="footer-link">Contact</a>
          </div>
          <div className="footer-copy">© 2026 RelayAI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
