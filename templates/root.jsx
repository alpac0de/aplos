import React from 'react';
import ReactDOM from 'react-dom';
{components}
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

function NoMatch() {
    return <div>Not found</div>
}

function App() {
    return <Router>
            <Switch>
                {routes}

                <Route path="*">
                    <NoMatch />
                </Route>
            </Switch>
        </Router>
}

ReactDOM.render(<App />, document.getElementById('root'));

