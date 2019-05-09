import React from 'react'
// import PureRenderMixin from 'react-addons-pure-render-mixin'
// import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
// import LocalStore from '../util/localStore'
// import { CITYNAME } from '../config/localStoreKey'
// import * as userInfoActionsFromOtherFile from '../actions/userinfo' 

window.onerror = function(errorMessage, scriptURI, lineNumber,columnNumber,errorObj) {
    console.log("错误信息：" , errorMessage);
    console.log("出错文件：" , scriptURI);
    console.log("出错行号：" , lineNumber);
    console.log("出错列号：" , columnNumber);
    console.log("错误详情：" , errorObj);
}



class App extends React.Component{
    constructor(props, context){
        super(props, context);
        this.state = {
            initDone: false
        }
    }    
    render(){
        return(
            <div>
                {
                    this.state.initDone
                    ? this.props.children
                    : <div>正在加载...</div>
                }
            </div>
        )
    }
    componentDidMount(){
        this.setState({
            initDone: true
        })
    }
}
// -------------------redux react 绑定--------------------

// function mapStateToProps(state) {
//     return {
//     }
// }

// function mapDispatchToProps(dispatch) {
//     return {
//         // userInfoActions: bindActionCreators(userInfoActionsFromOtherFile, dispatch),
//     }
// }
export default connect(
    // mapStateToProps,
    // mapDispatchToProps
)(App)
