import React from "react";
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link
} from "react-router-dom";

export default function() {
    return <Router>
        <Switch>
            <Route exact path="/">
                <div>Coucou</div>
            </Route>
        </Switch>
    </Router>
}
