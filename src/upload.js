import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ReactDom from 'react-dom';
import f from './fetch';


export default class UploadQiNiu extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDragActive: false,
    }

    this.upload = this.upload.bind(this);
  }

  onDragLeave(e) {
    this.setState({
      isDragActive: false
    });
  }

  onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy'
    this.setState({ isDragActive: true })
  }
  onDrop(e) {
    e.preventDefault()
    this.setState({ isDragActive: false })

    let files
    if (e.dataTransfer) {
      files = e.dataTransfer.files
    } else {
      files = e.target.files
    }
    let maxFiles = this.props.multiple ? files.length : 1
    if (this.props.onDrop) {
      files = Array.prototype.slice.call(files, 0, maxFiles);
      this.props.onDrop(files, e);
    }
    let maxSizeLimit = this.maxSizeFormat(this.props.maxSize)
    for (const file of files) {
      if (maxSizeLimit && file.size > maxSizeLimit) {
        console.trace && console.trace(new Error(`文件超出限制${this.props.maxSize}`))
        this.props.onError && this.props.onError({
          code: 1,
          message: `上传的大小超出了限制${this.props.maxSize}`
        })
        return false
      } else {
        this.upload(file, files, maxFiles, e)
      }
    }

  }

  onClick() {
    if (this.props.superClick) {
      this.open()
    }
  }

  open() {
    let fileInput = ReactDom.findDOMNode(this.refs.fileInput)
    fileInput.value = null
    fileInput.click()
  }
  upload(file, token) {
    if (!file || file.size === 0) {
      return null
    }

    let onUpload = this.props.onUpload
    let onError = this.props.onError

    return f.inyufetch("https://static-api.inyuapp.com/v1/admin_upload", {
      '_caller': "admin",
      '_sid': document.cookie.match(/PHPSESSID=(\w+[^;])/)[1] || "",
      'file_name': file.name,
      'file': file,
    }, "POST")
      .then(res => {
        if (res.error_code == 0) {
          return res.data.url;
        } else {
          this.props.handlerError(res)
        }

      })
      .then(onUpload)
      .catch(onError)
  }

  isImage(url) {
    let ext = url.split('.')[1].toUpperCase();
    return ext == "PNG" || ext == "JPG" || ext == "JPEG" || ext == "GIF" || ext == "ICO"
  }

  isFunction(fn) {
    let getType = {}
    return fn && getType.toString.call(fn) === '[object Function]'
  }

  maxSizeFormat(size = '10k') {
    size = size.toString().toUpperCase();
    let bsize, m = size.indexOf('M'), k = size.indexOf('K');
    if (m > -1) {
      bsize = parseFloat(size.slice(0, m)) * 1024 * 1024
    } else if (k > -1) {
      bsize = parseFloat(size.slice(0, k)) * 1024
    } else {
      bsize = parseFloat(size)
    }
    return Math.abs(bsize)
  }

  render() {
    // let className = this.props.className || ''
    // if (this.state.isDragActive) {
    //   className += ' active'
    // }
    return (
      <div
        className="upload-zone"
        onClick={this.onClick.bind(this)}
        onDragLeave={this.onDragLeave.bind(this)}
        onDragOver={this.onDragOver.bind(this)}
        onDrop={this.onDrop.bind(this)}
      >
        <input
          type="file"
          style={{ 'display': 'none' }}
          multiple={this.props.multiple}
          ref="fileInput"
          onChange={this.onDrop.bind(this)}
          accept={this.props.accept}
        />
        {this.props.children}
      </div>
    )
  }
}

UploadQiNiu.defaultProps = {
  superClick: true,
  multiple: true,
  maxSize: '70M'
}
UploadQiNiu.propTypes = {
  onDrop: PropTypes.func.isRequired,
  //   token: PropTypes.string.isRequired,
  onUpload: PropTypes.func,
  size: PropTypes.number,
  style: PropTypes.object,
  superClick: PropTypes.bool,
  accept: PropTypes.string,
  multiple: PropTypes.bool,
  // QiNiu
  uploadUrl: PropTypes.string,
  prefix: PropTypes.string,
  // called before to format maxSize (eg. '30M', '30k')
  maxSize: PropTypes.string
}