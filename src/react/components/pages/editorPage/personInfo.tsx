import React from "react";
import "./personInfo.scss";

/**
 * Properties for Editor Toolbar
 * 
 */
export interface IPersonInfoProps {
    data: any;
    viewData: any;
    onSelected: (id: string, src: string) => void;
}

/**
 * State of IEditorToolbar
 * 
 */
export interface IPersonInfoState {
}

/**
 * @name - Editor Toolbar
 * @description - Collection of buttons that perform actions in toolbar on editor page
 */
export class PersonInfo extends React.Component<IPersonInfoProps, IPersonInfoState> {

    public state = {
        isSearch: true
    }

    private tabClick = (isSearch: boolean) => {
        this.setState({
            isSearch
        });
    }

    public render() {
        const _search = this.state.isSearch ? 'active tab' : 'tab';
        const _play = this.state.isSearch ? 'tab' : 'tab active';
        return (
            <div className="person-info">
                <div className="tab-container">
                    <div onClick={() => this.tabClick(true)} className={_search}>查询</div>
                    <div onClick={() => this.tabClick(false)} className={_play}>播放</div>
                </div>
                {
                    this.state.isSearch ?
                        <section className="info-container">
                            {
                                this.props.data.map((face, index) => <div key={index} onClick={() => this.props.onSelected(face.faceId, face.path)} className="card-item">
                                    <div className="user-image">
                                        <div className="similar-rate"><span className="bold">{face.similaritydegree}</span></div>
                                        <img src={face.path} alt="" />
                                        <div className="name-id">
                                            <div className="user-name">{face.name}</div>
                                            <div className="face-id">{face.faceId}</div>
                                        </div>
                                    </div>
                                </div>)
                            }
                        </section>
                        :
                        <section className="info-container">
                            {
                                this.props.viewData.map((face, index) => <div key={index} className="card-item">
                                    <div className="user-image">
                                        <img src={face.path} alt="" />
                                        <div className="name-id">
                                            <div className="face-id">{face.faceId}</div>
                                        </div>
                                    </div>
                                </div>)
                            }
                        </section>
                }
            </div>
        );
    }
}
