
import React, { Component } from "react";
import { Row, Col } from 'antd';
import "./index.less"

class Layout extends Component {
    constructor(props) {
        super(props)
        this.state = {}
    }
    handleValue() {
    }
    componentDidMount() {
        //get user info
    }
    render() {
        return (
            <div className="main-wrapper">
                <header id="header" className="clear-fix">
                    <Row>
                    <Col xs={24} sm={24} md={6} lg={5} xl={4}>
                        <a id="logo" href="https://admin.inyuapp.com">
                        <span className="logo"></span>
                        <span className="logo-tips">音遇</span>
                        </a>
                    </Col>
                    </Row>
                </header>
                <div className='main_content'>
                    <div className="ant-row">
                    {/* <div className="main-menu ant-col-xs-24 ant-col-sm-24 ant-col-md-24 ant-col-lg-6 ant-col-xl-4 ant-col-xxl-4">
                        <Sidenav path={this.props.location.pathname} power={this.state.power} />
                    </div> */}
                    <div className="main-container main-container-component ant-col-xs-24 ant-col-sm-24 ant-col-md-24 ant-col-lg-24 ant-col-xl-24 ant-col-xxl-24">
                        {this.props.children}
                    </div>
                    </div>
                </div>
            </div>
        );
    }
}


export default Layout