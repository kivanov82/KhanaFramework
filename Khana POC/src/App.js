import React from 'react'
import { BrowserRouter as Router, Route } from "react-router-dom";
import Khana from './Khana';
import BlockDam from './BlockDam';

const KhanaComponent = () => (
    <Khana />
)

const BlockDamComponent = () => (
    <BlockDam />
)

const BasicRoute = () => (
    <Router>
        <div>
        <Route exact path='/' component={KhanaComponent} />
        <Route path='/BCD' component={BlockDamComponent} />
        </div>
    </Router>
);

export default BasicRoute;