'use client';

/**
 * Last-resort error boundary.
 *
 * This one replaces the root layout entirely, so it cannot use the Header,
 * Footer, or anything that depends on providers — if the layout itself is what
 * threw, importing from it would throw again and Next.js would fall back to its
 * own unstyled screen. Everything here is inline and self-contained on purpose.
 *
 * The phone number is hard-coded rather than read from settings for the same
 * reason: if the API is what failed, a settings lookup fails with it. A buyer
 * hitting a broken page must still be able to reach the shop, and for this
 * business the phone is the conversion path anyway.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }): JSX.Element {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#F7F9FC',
          color: '#1A1A1A',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          textAlign: 'center',
        }}
      >
        <main style={{ maxWidth: '30rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#5A6472',
            }}
          >
            Fast Traders
          </p>

          <h1
            style={{
              margin: '0.75rem 0 0',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#1B2A6B',
            }}
          >
            Something went wrong
          </h1>

          <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', color: '#5A6472' }}>
            Sorry — this page failed to load. Please try again, or call us and we will help you
            straight away.
          </p>

          <div
            style={{
              marginTop: '1.75rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: 'pointer',
                border: 0,
                borderRadius: '0.5rem',
                padding: '0.7rem 1.4rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#FFFFFF',
                background: '#00AEEF',
              }}
            >
              Try again
            </button>

            <a
              href="tel:+923244234990"
              style={{
                borderRadius: '0.5rem',
                padding: '0.7rem 1.4rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                textDecoration: 'none',
                color: '#1B2A6B',
                border: '1px solid #1B2A6B',
              }}
            >
              Call +92 324 4234990
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
