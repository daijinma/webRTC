import 'raf/polyfill';
import 'core-js/es6/map';
import 'core-js/es6/set';
import React from "react";
import ReactDOM from "react-dom";
import '../../static/css/common.less';
import LocaleVideo from "./localVideo";
import Layout from "../../components/layout"
import {
    Button
  } from 'antd';
  
ReactDOM.render(
    <div className="content">
        <Layout>
            域名需要  https://beta-*.inyuapp.com, 才能访问到测试环境长链
            <br/>
            navigator.mediaDevices.getUserMedia  方法 需要在 https 环境下调用，不然会报错
            <br/>
            <Button><a href="http://beta-www.inyuapp.com/" target="__blank">beta-登陆</a></Button>
            <br/>
            
            <LocaleVideo/>
        </Layout>
    </div>,
    document.getElementById('root'));