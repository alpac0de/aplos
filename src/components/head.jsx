import React from "react";
import { Helmet, HelmetProvider } from 'react-helmet-async';

export default function Head({children}) {
    return (
        <HelmetProvider>
            <Helmet>
                {children}
            </Helmet>
        </HelmetProvider>
    );
}
