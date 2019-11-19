import React from "react";
import "./personInfo.scss";

/**
 * Properties for Editor Toolbar
 * 
 */
export interface IPersonInfoProps {
    data: any;
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
        faceSign: 'adad',
        name: 'Tylor Swift',
        similarRate: '98.10'
    }

    public render() {
        return (
            <div className="person-info">
                <section className="info-container">
                    {
                        this.props.data.map(face => <div className="card-item">
                        <div className="user-image">
                            <div className="similar-rate"><span className="bold">{this.state.similarRate}</span></div>
                            <img src="../../../../public/default.png" alt="" />
                            <div className="name-id">
                                <div className="user-name">{this.state.name}</div>
                                <div className="face-id">{this.state.faceSign}</div>
                            </div>
                        </div>
                    </div>)
                    }
                    <div className="card-item">
                        <div className="user-image">
                            <div className="similar-rate"><span className="bold">{this.state.similarRate}</span></div>
                            <img src="../../../../public/default.png" alt="" />
                            <div className="name-id">
                                <div className="user-name">{this.state.name}</div>
                                <div className="face-id">{this.state.faceSign}</div>
                            </div>
                        </div>
                    </div>
                    <div className="card-item">
                        <div className="user-image">
                            <div className="similar-rate"><span className="bold">{this.state.similarRate}</span></div>
                            <img src="../../../../public/default.png" alt="" />
                            <div className="name-id">
                                <div className="user-name">{this.state.name}</div>
                                <div className="face-id">{this.state.faceSign}</div>
                            </div>
                        </div>
                    </div>
                </section>
                {/* <section className="quick-ways">
                </section> */}
            </div>
        );
    }
}
