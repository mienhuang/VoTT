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
    onDeleteAllClick?: () => void;
    onStepChange: (e) => void;
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
    private _currentStepValue = 1;
    public state = {
        stepValue: 2
    }
    componentDidMount() {
        window.addEventListener('keyup', (e) => {
            console.log(e)
            e.preventDefault();
            switch (e.code) {
                case 'ArrowUp':
                    this.setState({
                        stepValue: Math.min(16, this.state.stepValue * 2)
                    }, () => {
                        this.props.onStepChange(this.state.stepValue)
                    });
                    break;
                case 'ArrowDown':
                    this.setState({
                        stepValue: Math.max(1, this.state.stepValue / 2)
                    }, () => {
                        this.props.onStepChange(this.state.stepValue)
                    });
                    break;
                default:
                    break;
            }
        })
    }
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
                <div className="step-info" title="按上下箭头调整大小">
                    <span>步长:</span>
                    <span className="value">{this.state.stepValue}</span>
                </div>
                <div title="人员信息搜索">
                    <input
                        className="searchInput"
                        type="number"
                        placeholder="track ID"
                        defaultValue={this.props.selectedRegionTrackId}
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
                    >搜索</button>
                </div>
                <div title="删除所有">
                    <button className="delete-all"
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
                        onClick={this.deleteAll} >删除所有</button>
                </div>
            </div>
        );
    }

    private deleteAll = () => {
        this.props.onDeleteAllClick();
    }

    private selectedRegionTrackIdChange = (event) => {
        event.persist();
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
