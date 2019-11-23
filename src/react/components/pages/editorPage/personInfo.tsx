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

    public render() {
        return (
            <div className="person-info">
                <section className="info-container">
                    {
                        this.props.data.map((face, index) => <div key={index} className="card-item">
                        <div className="user-image">
                            <div className="similar-rate"><span className="bold">{face.similaritydegree}</span></div>
                            <img src={face.path} alt="" />
                            <div className="name-id">
                                <div className="user-name">{face.name}</div>
                                <div className="face-id">{face.faceSign}</div>
                            </div>
                        </div>
                    </div>)
                    }
                </section>
                {/* <section className="quick-ways">
                </section> */}
            </div>
        );
    }
}
