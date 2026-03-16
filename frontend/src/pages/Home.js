import React from "react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "../constants";

export default function Home() {
  return (
    <main className="container main">
      {/* Hero Welcome Section */}
      <section className="panel hero" style={{ marginBottom: '24px' }}>
        <div style={{ 
          padding: '48px 32px', 
          textAlign: 'center',
          background: 'linear-gradient(180deg, rgba(59,130,246,.08), transparent)',
          borderRadius: '14px'
        }}>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: '800', 
            margin: '0 0 16px 0',
            background: 'linear-gradient(135deg, var(--text-100), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Welcome to PC Builder
          </h1>
          <p style={{ 
            fontSize: '20px', 
            color: 'var(--text-200)', 
            margin: '0 0 48px 0',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: '1.6'
          }}>
            Build your dream PC with confidence. Choose your own parts or answer a few questions to get a custom build generated for you.
          </p>
          
          {/* Two Ways to Build */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <div style={{
              padding: '32px',
              background: 'linear-gradient(180deg, rgba(59,130,246,.05), transparent), var(--bg-800)',
              border: '1px solid var(--hair)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Quick Build (Quiz)</h3>
              <p style={{ color: 'var(--muted)', marginBottom: '24px', lineHeight: '1.6' }}>
                Answer a few simple questions about your needs and preferences, and we'll generate a custom PC build tailored just for you.
              </p>
              <Link to="/quiz" className="btn primary" style={{ width: '100%' }}>
                Start Quiz
              </Link>
            </div>
            
            <div style={{
              padding: '32px',
              background: 'linear-gradient(180deg, rgba(255,255,255,.02), transparent), var(--bg-800)',
              border: '1px solid var(--hair)',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔧</div>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px' }}>Browse & Build</h3>
              <p style={{ color: 'var(--muted)', marginBottom: '24px', lineHeight: '1.6' }}>
                Browse through our extensive catalog, check compatibility in real-time, and hand-pick each component for your perfect build.
              </p>
              <Link to="/cpu" className="btn" style={{ width: '100%' }}>
                Browse Parts
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <div className="panel-title">Why Choose Our PC Builder?</div>
          <div className="panel-sub">Everything you need to build the perfect computer</div>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          padding: '24px'
        }}>
          <div style={{
            padding: '20px',
            background: 'linear-gradient(180deg, rgba(255,255,255,.02), transparent), var(--bg-800)',
            border: '1px solid var(--hair)',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '18px' }}>Smart Compatibility</div>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Real-time compatibility checking ensures all your parts work together perfectly.
            </div>
          </div>
          <div style={{
            padding: '20px',
            background: 'linear-gradient(180deg, rgba(255,255,255,.02), transparent), var(--bg-800)',
            border: '1px solid var(--hair)',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
            <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '18px' }}>Extensive Catalog</div>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Browse hundreds of CPUs, GPUs, motherboards, and more from top manufacturers.
            </div>
          </div>
          <div style={{
            padding: '20px',
            background: 'linear-gradient(180deg, rgba(255,255,255,.02), transparent), var(--bg-800)',
            border: '1px solid var(--hair)',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>💰</div>
            <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '18px' }}>Price Comparison</div>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Compare prices and find the best deals for every component in your build.
            </div>
          </div>
          <div style={{
            padding: '20px',
            background: 'linear-gradient(180deg, rgba(255,255,255,.02), transparent), var(--bg-800)',
            border: '1px solid var(--hair)',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
            <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '18px' }}>Easy to Use</div>
            <div style={{ color: 'var(--muted)', fontSize: '14px' }}>
              Intuitive interface makes building your PC simple, even for beginners.
            </div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer style={{
        marginTop: '48px',
        padding: '32px',
        borderTop: '1px solid var(--hair)',
        textAlign: 'center',
        color: 'var(--muted)'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-200)', marginBottom: '8px' }}>
            PC Builder
          </div>
          <div style={{ fontSize: '14px' }}>
            Build your perfect PC with confidence
          </div>
        </div>
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--muted)',
          opacity: 0.7
        }}>
          © {new Date().getFullYear()} PC Builder. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
