import 'whatwg-fetch';
import 'es6-promise';
import React from 'react';
import PropTypes from "prop-types";

export default class nomatch extends React.Component {

    static contextTypes = {
        router: PropTypes.object
    }

    constructor(props) {
        super(props);
    }

    render() {
        return <div></div>
    }

    
    componentDidMount() {
        this.context.router.history.push("/")
    }
    
}