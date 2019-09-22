import React from "react";
import "./personInfo.scss";

/**
 * Properties for Editor Toolbar
 * 
 */
export interface IPersonInfoProps {
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
                </section>
                <section className="quick-ways">
                </section>
            </div>
        );
    }
}
