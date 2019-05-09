import { message } from 'antd';
import JSONbig from 'json-bigint'

var JSONstrict = JSONbig({ "strict": true });

let commonQuery = "__plat=pc_web";


let hostname = window.location.hostname;
const useBeta = /beta-/.test(hostname);
class Fetch {
  Vegeta(url, params, method, hasBigInt) {

    url = url.replace(/(https:\/\/|http:\/\/|\/\/)/i, ($1) => {

      return useBeta ? "https://beta-" : 'https://'
    })
    return this.inyufetch(url, params, method, hasBigInt)
  }
  inyufetch(url, params, method = 'GET', hasBigInt) {
    let sendUrl = url,
      paramsArray = [],
      sendMethod = method.toUpperCase(),
      options = {
        method,
        // headers: {
        //   'Content-Type': 'application/json'
        // },
        mode: 'cors',
        credentials: 'include',
      };

    if (sendMethod === 'GET') {
      if (params) {
        Object.keys(params).forEach(key => paramsArray.push(key + '=' + params[key]))
        if (sendUrl.search(/\?/) === -1) {
          sendUrl += '?' + paramsArray.join('&')
        } else {
          sendUrl += '&' + paramsArray.join('&')
        }
      }
    } else if (sendMethod === 'POST' || sendMethod === 'PUT' || sendMethod === 'DELETE') {
      if(typeof params == "string"){
        options['body'] = params;
      }else{
        let formData = new FormData();
        Object.keys(params).forEach((key) => {
          if (Object.prototype.toString.call(params[key]) === '[object Array]') {
            params[key].forEach((element) => {
              formData.append(`${key}`, element)
            });
          } else {
            formData.append(key, params[key]);
          }
        })
        options['body'] = formData;
      }
      
    }

    return new Promise((resolve, reject) => {
      
      if (sendUrl.search(/\?/) === -1) {
        sendUrl += '?' + commonQuery
      } else {
        sendUrl += '&' + commonQuery
      }

      fetch(sendUrl, options)
        .then(response => {
          let contentType = response.headers.get('content-type');
          if(!contentType){
            reject()
          }
          if (contentType.includes('application/json')) {
            return response.text()
              .then(res => JSONstrict.parse(res))
          } else if (contentType.includes('text/html')) {
            return response.text()
          } else if (contentType.includes('text/plain')) {
            return response.text()
          } else {
            throw new Error(`Sorry, content-type ${contentType} not supported`)
          }
        }).then(res => {
          if (res.error_code == 10001) {
            // alert("身份认证失败")
            console.log("身份认证失败")
          }
          resolve(res)
        }).catch(err => {
          reject(err)
        })
    })
  }
}
export default new Fetch()