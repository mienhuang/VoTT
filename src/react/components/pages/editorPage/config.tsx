import './config.scss';

import React from "react";
export interface IURLConfigProps {
    onCloseConfig: () => void;
}

/**
 * State of IEditorToolbar
 * 
 */
export interface IURLConfigPropsState {
}

/**
 * @name - Editor Toolbar
 * @description - Collection of buttons that perform actions in toolbar on editor page
 */
export class URLConfig extends React.Component<IURLConfigProps, IURLConfigPropsState> {
    public state = {
        imgURL: '',
        imgTabIDList: '',
        faceURL: '',
        subImageType: ''
    };

    private _imgURL = 'http://192.168.88.156:5000';
    private _imgTabIDList = '1234567890';
    private _faceURL = 'http://127.0.0.1:8080';
    private _subImageType = '02';
    componentDidMount() {
        this.setState({
            imgURL: localStorage.getItem('imgURL') || 'http://192.168.88.156:5000',
            imgTabIDList: localStorage.getItem('imgTL') || '1234567890',
            faceURL: localStorage.getItem('faceURL') || 'http://127.0.0.1:8080',
            subImageType: localStorage.getItem('subImageType') || '02'
        });
    }

    private imgURLChange = ($event) => {
        $event.persist();
        this._imgURL = $event.target.value;
    }
    private imgTabIDListChange = ($event) => {
        $event.persist();
        this._imgTabIDList = $event.target.value;
    }
    private faceURLChange = ($event) => {
        $event.persist();
        this._faceURL = $event.target.value;
    }
    private subImageTypeChange = ($event) => {
        $event.persist();
        this._subImageType = $event.target.value;
    }

    private cancel = () => {
        this.props.onCloseConfig();
    }

    private save = () => {
        localStorage.setItem('imgURL', this._imgURL);
        localStorage.setItem('imgTL', this._imgTabIDList);
        localStorage.setItem('faceURL', this._faceURL);
        localStorage.setItem('subImageType', this._subImageType);
        this.props.onCloseConfig();
    }

    public render() {
        return (
            <div className="config-container" >
                <div className="config-panel">
                    <div className="config-header">
                        <span className="title">地址配置</span>
                        <span onClick={this.cancel} className="fa fa-times config-close"></span>
                    </div>
                    <div className="config-content">
                        <div className="face-config">
                            <span>图片查询地址配置：</span>
                            <div className="item">
                                <span>接口地址：</span>
                                <input type="text"
                                    defaultValue={this.state.imgURL}
                                    onChange={this.imgURLChange} />
                            </div>
                            <div className="item">
                                <span>TabIDList：</span>
                                <input type="text"
                                    defaultValue={this.state.imgTabIDList}
                                    onChange={this.imgTabIDListChange} />
                            </div>
                        </div>
                        <div className="id-config">
                            <span>FaceId 查询地址配置：</span>
                            <div className="item">
                                <span>接口地址：</span>
                                <input type="text"
                                    defaultValue={this.state.faceURL}
                                    onChange={this.faceURLChange} />
                            </div>
                            <div className="item">
                                <span>SubImageType：</span>
                                <input type="text"
                                    defaultValue={this.state.subImageType}
                                    onChange={this.subImageTypeChange} />
                            </div>
                        </div>
                    </div>
                    <div className="config-control">
                        <button onClick={this.cancel}>取消</button>
                        <button onClick={this.save}>保存</button>
                    </div>
                </div>
            </div>
        );
    }
}
