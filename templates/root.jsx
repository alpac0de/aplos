import React from 'react';
import ReactDOM from 'react-dom';
{components}
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

function App() {
    return <Router>
            <Switch>
               {routes}
            </Switch>
        </Router>
}

ReactDOM.render(<App />, document.getElementById('root'));

