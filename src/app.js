import React from "react";
import {
    BrowserRouter,
    Route,
    Routes
} from "react-router-dom";

export default function() {
    return <BrowserRouter>
        <Routes>
            <Route exact path="/">
                <div>Coucou</div>
            </Route>
        </Routes>
    </BrowserRouter>
}
