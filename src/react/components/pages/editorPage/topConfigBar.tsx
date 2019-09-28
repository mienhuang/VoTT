import React from "react";
import "./topConfigBar.scss";
import {
    AssetState, AssetType, EditorMode, IApplicationState,
    IAppSettings, IAsset, IAssetMetadata, IProject, IRegion,
    ISize, ITag, IAdditionalPageSettings, AppError, ErrorCode,
    ICustomData
} from "../../../../models/applicationState";
import Button from "reactstrap/lib/Button";

/**
 * Properties for Editor Toolbar
 * 
 */
export interface ITopConfigBarProps {
    selectedRegionTrackId: string;
    selectedRegionTrackIdChange: (e) => void;
    tags: ITag[];
    lockedTags: string[];
    selectedRegions: IRegion[];
    onChange: (e) => void;
    onLockedTagsChange: (e) => void;
    onTagClick: (e) => void;
    onCtrlTagClick: (e) => void;
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

    private _selectedRegionTrackId = 0;
    public render() {
        return (
            <div className="top-config" role="toolbar">
                {
                    this.props.tags.map((tag, index) => (<button
                        className="tags"
                        key={index}
                        style={{ background: tag.color }}
                        title={tag.name}
                        disabled={
                            this.props.selectedRegions ?
                                this.props.selectedRegions.length === 0
                                :
                                true
                        }
                        onClick={() => this.tagClick(tag)}
                    >{tag.name}[{index + 1}]</button>))
                }
                <div>
                    <input
                        className="updateInput"
                        type="number"
                        placeholder="track ID"
                        defaultValue={this.props.selectedRegionTrackId}
                        onChange={this.selectedRegionTrackIdChange}
                        disabled={
                            this.props.selectedRegions ?
                                (
                                    this.props.selectedRegions.length === 1 ?
                                        this.props.selectedRegions[0].tags.length === 0
                                        :
                                        true
                                )
                                :
                                true
                        }
                    />
                    <button
                        disabled={
                            this.props.selectedRegions ?
                                (
                                    this.props.selectedRegions.length === 1 ?
                                        this.props.selectedRegions[0].tags.length === 0
                                        :
                                        true
                                )
                                :
                                true
                        }
                        onClick={this.updateRegionTrackId}>更新</button>
                </div>
                {/* <div className="action-item" title="当前选择框出现的第一帧">
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
                </div> */}
                <div>
                    <span>步长:</span>
                    <input type="number" placeholder="seek step" />
                </div>
                <div title="人员信息搜索">
                    <input 
                    className="searchInput" 
                    type="number" 
                    placeholder="track ID"
                    defaultValue={this.props.selectedRegionTrackId}
                    />
                    <button>搜索</button>
                </div>
                <div title="删除所有">
                    <button className="delete-all">删除所有</button>
                </div>
            </div>
        );
    }


    private selectedRegionTrackIdChange = (event) => {
        event.persist();
        console.log(event, '1111111111');
        this._selectedRegionTrackId = event.target.value;
    }

    private updateRegionTrackId = () => {
        this.props.selectedRegionTrackIdChange(this._selectedRegionTrackId);
    }

    private tagClick = (e: ITag) => {
        console.log(e);
        // TODO handle CTrl
        this.props.onTagClick(e);
    }
}
