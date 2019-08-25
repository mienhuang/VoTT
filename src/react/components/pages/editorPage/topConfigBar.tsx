import React from "react";
import "./topConfigBar.scss";

/**
 * Properties for Editor Toolbar
 * 
 */
export interface ITopConfigBarProps {

}

/**
 * State of IEditorToolbar
 * 
 */
export interface ITopConfigBarState {
}

/**
 * @name - Editor Toolbar
 * @description - Collection of buttons that perform actions in toolbar on editor page
 */
export class TopConfigBar extends React.Component<ITopConfigBarProps, ITopConfigBarState> {

    public render() {


        return (
            <div className="top-config" role="toolbar">
                <div>
                    <input className="updateInput" type="number" placeholder="track ID"/>
                    <button>更新</button>
                </div>
                <div className="action-item" title="当前选择框出现的第一帧">
                    <i className="fa fa-angle-double-left"></i>
                </div>
                <div className="action-item" title="当前选择框出现的上一帧">
                    <i className="fa fa-angle-left"></i>
                </div>
                <div className="action-item" title="当前选择框出现的下一帧">
                    <i className="fa fa-angle-right" aria-hidden="true"></i>
                </div>
                <div className="action-item" title="当前选择框出现的最后一帧">
                    <i className="fa fa-angle-double-right" aria-hidden="true"></i>
                </div>
                <div>
                    <span>步长:</span>
                    <input type="number" placeholder="seek step"/>
                </div>
                <div title="人员信息搜索">
                    <input className="searchInput" type="number" placeholder="track ID"/>
                    <button>搜索</button>
                </div>
            </div>
        );
    }
}
