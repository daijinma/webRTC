import React, { Component } from 'react'
import {
  message,
  Button
} from 'antd';
import f from '../../fetch';
import "./style.less"
import LocalVideo from "./localVideo"



class index extends Component {
  constructor(props) {
    super(props)
  }
  state = {
    
  }

  componentDidMount() {

  }


  render() {
    return (
      <div className="netdata">
        <LocalVideo />
      </div>
    )
  }
}
export default index