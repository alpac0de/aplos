import React from 'react';
import { createRoot } from 'react-dom/client';
{components}
import {
    Routes,
    BrowserRouter,
    Route
} from "react-router-dom";

function NoMatch() {
    return <div>Not found</div>
}

function App() {
    return <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    {routes}
                    <Route path="*" element={ <NoMatch />} />
                </Route>
            </Routes>
        </BrowserRouter>
}

const container = document.getElementById('root');
const root = createRoot(container);
root.render({strictMode}<App />{/strictMode});
