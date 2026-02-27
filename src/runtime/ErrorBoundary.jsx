import React from 'react';

export default function ErrorBoundary({ errorComponent, children }) {
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const handleError = (error, errorInfo) => {
            setHasError(true);
            setError(error);

            if (process.env.NODE_ENV === 'development') {
                console.error('Error caught by boundary:', error, errorInfo);
            }
        };

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
        const ErrorComponent = errorComponent;
        return <ErrorComponent error={error} />;
    }

    return children;
}
