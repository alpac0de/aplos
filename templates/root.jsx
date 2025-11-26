import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
{components}
import {
    Routes,
    BrowserRouter,
    Route
} from "react-router-dom";

function NoMatch() {
    return <div>Not found</div>
}

function ErrorBoundary({ children }) {
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const handleError = (error, errorInfo) => {
            setHasError(true);
            setError(error);
            
            // Log error in development
            if (process.env.NODE_ENV === 'development') {
                console.error('Error caught by boundary:', error, errorInfo);
            }
        };

        // Modern error catching with ErrorEvent
        const handleGlobalError = (event) => {
            handleError(event.error, { componentStack: event.error?.stack });
        };

        const handleUnhandledRejection = (event) => {
            handleError(event.reason, { componentStack: event.reason?.stack });
        };

        window.addEventListener('error', handleGlobalError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleGlobalError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    if (hasError) {
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
                            🚨 Something went wrong
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
            
            // Production error UI
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
                    <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>😵</h1>
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

    return children;
}

function App() {
    return (
        <HelmetProvider>
            <ErrorBoundary>
                <BrowserRouter>
                    <Routes>
                        {routes}
                    </Routes>
                </BrowserRouter>
            </ErrorBoundary>
        </HelmetProvider>
    );
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render({strictMode}<App />{/strictMode});
