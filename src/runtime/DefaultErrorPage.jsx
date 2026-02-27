export default function DefaultErrorPage({ error }) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
        return (
            <div style={{
                padding: '20px',
                backgroundColor: '#fff5f5',
                border: '1px solid #fed7d7',
                borderRadius: '6px',
                margin: '20px',
                fontFamily: 'monospace'
            }}>
                <h1 style={{ color: '#c53030', fontSize: '24px', marginBottom: '16px' }}>
                    Something went wrong
                </h1>
                <h2 style={{ color: '#2d3748', fontSize: '18px', marginBottom: '12px' }}>
                    {error && error.toString()}
                </h2>
                <details style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: '#4a5568' }}>
                    <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
                        Click to see stack trace
                    </summary>
                    {error?.stack}
                </details>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '16px',
                        padding: '8px 16px',
                        backgroundColor: '#4299e1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Reload page
                </button>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            textAlign: 'center',
            padding: '20px'
        }}>
            <h2 style={{ fontSize: '24px', marginBottom: '8px', color: '#2d3748' }}>
                Oops! Something went wrong
            </h2>
            <p style={{ fontSize: '16px', color: '#718096', marginBottom: '24px' }}>
                We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
                onClick={() => window.location.reload()}
                style={{
                    padding: '12px 24px',
                    backgroundColor: '#4299e1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    cursor: 'pointer'
                }}
            >
                Refresh page
            </button>
        </div>
    );
}
