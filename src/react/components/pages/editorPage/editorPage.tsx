import _ from "lodash";
import React, { RefObject } from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import SplitPane from "react-split-pane";
import { bindActionCreators } from "redux";
import { SelectionMode } from "vott-ct/lib/js/CanvasTools/Interface/ISelectorSettings";
import HtmlFileReader from "../../../../common/htmlFileReader";
import { strings } from "../../../../common/strings";
import {
    AssetState, AssetType, EditorMode, IApplicationState,
    IAppSettings, IAsset, IAssetMetadata, IProject, IRegion,
    ISize, ITag, IAdditionalPageSettings, AppError, ErrorCode,
    ICustomData, ICustomRegion
} from "../../../../models/applicationState";
import { IToolbarItemRegistration, ToolbarItemFactory } from "../../../../providers/toolbar/toolbarItemFactory";
import IApplicationActions, * as applicationActions from "../../../../redux/actions/applicationActions";
import IProjectActions, * as projectActions from "../../../../redux/actions/projectActions";
import ICustomDataActions, * as customDataActions from '../../../../redux/actions/customDataActions';
import { ToolbarItemName } from "../../../../registerToolbar";
import { AssetService } from "../../../../services/assetService";
import { AssetPreview } from "../../common/assetPreview/assetPreview";
import { KeyboardBinding } from "../../common/keyboardBinding/keyboardBinding";
import { KeyEventType } from "../../common/keyboardManager/keyboardManager";
import { TagInput } from "../../common/tagInput/tagInput";
import { ToolbarItem } from "../../toolbar/toolbarItem";
import Canvas from "./canvas";
import CanvasHelpers from "./canvasHelpers";
import "./editorPage.scss";
import EditorSideBar from "./editorSideBar";
import { EditorToolbar } from "./editorToolbar";
import { TopConfigBar } from './topConfigBar';
import { PersonInfo } from './personInfo';
import Alert from "../../common/alert/alert";
import Confirm from "../../common/confirm/confirm";
import { ActiveLearningService } from "../../../../services/activeLearningService";
import { toast } from "react-toastify";
import * as shortid from "shortid";

/**
 * Properties for Editor Page
 * @member project - Project being edited
 * @member recentProjects - Array of projects recently viewed/edited
 * @member actions - Project actions
 * @member applicationActions - Application setting actions
 */
export interface IEditorPageProps extends RouteComponentProps, React.Props<EditorPage> {
    project: IProject;
    recentProjects: IProject[];
    appSettings: IAppSettings;
    actions: IProjectActions;
    customDataActions?: ICustomDataActions;
    applicationActions: IApplicationActions;
    customData?: ICustomData;
}

/**
 * State for Editor Page
 */
export interface IEditorPageState {
    /** Array of assets in project */
    assets: IAsset[];
    /** The editor mode to set for canvas tools */
    editorMode: EditorMode;
    /** The selection mode to set for canvas tools */
    selectionMode: SelectionMode;
    /** The selected asset for the primary editing experience */
    selectedAsset?: IAssetMetadata;
    /** Currently selected region on current asset */
    selectedRegions?: IRegion[];
    /** The child assets used for nest asset typs */
    childAssets?: IAsset[];
    /** Additional settings for asset previews */
    additionalSettings?: IAdditionalPageSettings;
    /** Most recently selected tag */
    selectedTag: string;
    /** Tags locked for region labeling */
    lockedTags: string[];
    /** Size of the asset thumbnails to display in the side bar */
    thumbnailSize: ISize;
    /**
     * Whether or not the editor is in a valid state
     * State is invalid when a region has not been tagged
     */
    isValid: boolean;
    /** Whether the show invalid region warning alert should display */
    showInvalidRegionWarning: boolean;
    currentSeletedRegion?: IRegion;
}

function mapStateToProps(state: IApplicationState) {
    return {
        recentProjects: state.recentProjects,
        project: state.currentProject,
        appSettings: state.appSettings,
        customData: state.customData
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(projectActions, dispatch),
        applicationActions: bindActionCreators(applicationActions, dispatch),
        customDataActions: bindActionCreators(customDataActions, dispatch)
    };
}

/**
 * @name - Editor Page
 * @description - Page for adding/editing/removing tags to assets
 */
@connect(mapStateToProps, mapDispatchToProps)
export default class EditorPage extends React.Component<IEditorPageProps, IEditorPageState> {
    public state: IEditorPageState = {
        selectedTag: null,
        lockedTags: [],
        selectionMode: SelectionMode.RECT,
        assets: [],
        childAssets: [],
        editorMode: EditorMode.Rectangle,
        additionalSettings: {
            videoSettings: (this.props.project) ? this.props.project.videoSettings : null,
            activeLearningSettings: (this.props.project) ? this.props.project.activeLearningSettings : null,
        },
        thumbnailSize: this.props.appSettings.thumbnailSize || { width: 175, height: 155 },
        isValid: true,
        showInvalidRegionWarning: false
    };

    private customDataFileName = '';
    private activeLearningService: ActiveLearningService = null;
    private loadingProjectAssets: boolean = false;
    private toolbarItems: IToolbarItemRegistration[] = ToolbarItemFactory.getToolbarItems();
    private canvas: RefObject<Canvas> = React.createRef();
    private renameTagConfirm: React.RefObject<Confirm> = React.createRef();
    private deleteTagConfirm: React.RefObject<Confirm> = React.createRef();
    private sortedAssets: IAsset[] = [];

    public async componentDidMount() {
        const projectId = this.props.match.params["projectId"];
        if (this.props.project) {
            await this.loadProjectAssets();
        } else if (projectId) {
            const project = this.props.recentProjects.find((project) => project.id === projectId);
            console.log(project, 'ppp')
            await this.props.actions.loadProject(project);
        }
        this.activeLearningService = new ActiveLearningService(this.props.project.activeLearningSettings);

        this.saveCustomData();
        this.initAssets();

        // this.sortedAssets = this.props.project.assets.filter(asset => asset.timestamp!= undefined)
    }

    private initAssets() {
        const assets = this.props.project.assets;
        this.sortedAssets = [];
        for (let id in assets) {
            if (assets[id].type === 3) {
                const asset = assets[id];
                this.sortedAssets.push(asset);
            }
        }
        this.sortedAssets.sort((a, b) => {
            if (a.timestamp < b.timestamp) {
                return -1;
            }
            if (a.timestamp > b.timestamp) {
                return 1;
            }
            return 0;
        });
    }

    private async saveCustomData() {
        const assetService = new AssetService(this.props.project);
        const lastVisitedAssetId = this.props.project.lastVisitedAssetId;
        const asset = this.props.project.assets[lastVisitedAssetId];
        const path = asset.parent ? asset.parent.path : asset.path;
        const name = path.split('/').pop();
        this.customDataFileName = `${name}.custom-data.json`;
        const data = await assetService.readCustomData(this.customDataFileName);
        if (!data) {
            assetService.saveCustomData(this.customDataFileName, this.props.customData);
            return;
        }
        this.props.customDataActions.initCustomData(data);
    }

    public async componentDidUpdate(prevProps: Readonly<IEditorPageProps>) {
        if (this.props.project && this.state.assets.length === 0) {
            await this.loadProjectAssets();
        }

        // Navigating directly to the page via URL (ie, http://vott/projects/a1b2c3dEf/edit) sets the default state
        // before props has been set, this updates the project and additional settings to be valid once props are
        // retrieved.
        if (this.props.project && !prevProps.project) {
            this.setState({
                additionalSettings: {
                    videoSettings: (this.props.project) ? this.props.project.videoSettings : null,
                    activeLearningSettings: (this.props.project) ? this.props.project.activeLearningSettings : null,
                },
            });
        }

        if (this.props.project && prevProps.project && this.props.project.tags !== prevProps.project.tags) {
            this.updateRootAssets();
        }
    }

    public updateMaxTrackId = async (region: IRegion, type: string) => {
        console.log(region, 'update max track id', this.state.selectedAsset);
        const { id, name, timestamp, format } = this.state.selectedAsset.asset;
        const asset = {
            id,
            name,
            timestamp,
            format
        }
        if (type === 'add') {
            await this.props.customDataActions.increase({ trackId: region.trackId, id: region.id, region: { ...region, asset } });
        } else {
            await this.props.customDataActions.decrease({ trackId: region.trackId, id: region.id, region: { ...region, asset } });
        }
    };

    public selectedRegionTrackIdChange = (e) => {
        const id = Number(e);
        const selectedRegionId = Number(this.state.selectedRegions[0].trackId);
        console.log(this.state.selectedRegions);
        // const selectedTrackIds = this.state.selectedRegions.map(region => ({ trackId: region.trackId, id: region.id }));
        // this.props.customDataActions.updateCurrentTrackId([...selectedTrackIds]);
        // console.log(this.canvas.current, '==================================',
        //     this.canvas.current.state.currentAsset.regions.filter(region => region.trackId !== selectedRegionId));
        const newRegions = [
            ...(
                this.canvas.current.state.currentAsset.regions.filter(region => region.trackId !== selectedRegionId)
            ),
            ...(
                // trackId update only allow 1 selected region
                [...this.state.selectedRegions]
                    .map(region => {
                        this.updateMaxTrackId(region, 'delete');
                        const copy = JSON.parse(JSON.stringify(region)) as IRegion;
                        copy.trackId = id;
                        this.updateMaxTrackId(copy, 'add');
                        this.onSelectedRegionsChanged([copy]);
                        this.updateRegionsBetweenKeyFrames(copy, id);
                        return copy;
                    })
            )
        ];
        console.log(newRegions, 'new regions');
        this.canvas.current.updateAssetRegions(newRegions);

    };


    public updateRegionsBetweenKeyFrames = (copy: IRegion, id: number) => {
        this.setState({
            selectedRegions: [copy]
        }, () => {
            this.insertRegions(id, { ...copy, asset: this.canvas.current.state.currentAsset.asset });
        });
    }

    private insertRegions = (trackId: number, newRegion: ICustomRegion) => {
        const trackIdGroup: ICustomRegion[] = [
            ...this.props.customData.regions[trackId].filter((region: IRegion) => region.id !== newRegion.id),
            newRegion
        ];
        const len = trackIdGroup.length;
        if (len < 1) {
            return;
        }
        trackIdGroup.sort((a, b) => {
            if (a.asset.timestamp < b.asset.timestamp) {
                return -1;
            }
            if (a.asset.timestamp > b.asset.timestamp) {
                return 1;
            }
            return 0;
        });

        const currentAssetId = this.canvas.current.state.currentAsset.asset.id;
        const index = trackIdGroup.findIndex(region => region.asset.id === currentAssetId);

        const previousCRegion = index === 0 ? undefined : this.findPreviousKeyFrame(index - 1, trackIdGroup);
        const nextCRegion = index === len - 1 ? undefined : this.findNextKeyFrame(index + 1, trackIdGroup, len);

        const currentRegion = this.state.selectedRegions[0];
        if (previousCRegion) {
            const pIndex = this.sortedAssets.findIndex(asset => asset.id === previousCRegion.asset.id);
            if (pIndex !== -1) {

                const pAssets = this.queryAssets(pIndex, 1, currentAssetId);
                const pLen = pAssets.length;
                const boxs = this.generateBoxs(previousCRegion.boundingBox, currentRegion.boundingBox, pLen + 1);

                for (let i = 0; i < pLen; i++) {
                    const id = shortid.generate();
                    const newRegion = JSON.parse(JSON.stringify(currentRegion)) as IRegion;
                    newRegion.boundingBox = boxs[i];
                    newRegion.id = id;
                    newRegion.keyFrame = false;
                    newRegion.points = this.generatePoints(boxs[i]);
                    this.updateAssetsRegion(pAssets[i], newRegion);
                }
            }
        }

        if (nextCRegion) {
            const nIndex = this.sortedAssets.findIndex(asset => asset.id === nextCRegion.asset.id);
            if (nIndex !== -1) {
                const nAssets = this.queryAssets(nIndex, -1, currentAssetId);
                const nLen = nAssets.length;
                const boxs = this.generateBoxs(nextCRegion.boundingBox, currentRegion.boundingBox, nLen + 1);
                for(let i = 0; i< nLen; i++ ) {
                    const id = shortid.generate();
                    const newRegion = JSON.parse(JSON.stringify(currentRegion)) as IRegion;
                    newRegion.boundingBox = boxs[i];
                    newRegion.id = id;
                    newRegion.keyFrame = false;
                    newRegion.points = this.generatePoints(boxs[i]);
                    this.updateAssetsRegion(nAssets[i], newRegion);
                }
            }
        }
    }

    private generatePoints = (boundingBox: { height: number, left: number, top: number, width: number }): { x: number, y: number }[] => {
        return [
            { x: boundingBox.left, y: boundingBox.top },
            { x: boundingBox.left + boundingBox.width, y: boundingBox.top },
            { x: boundingBox.left + boundingBox.width, y: boundingBox.top + boundingBox.height },
            { x: boundingBox.left, y: boundingBox.top + boundingBox.height }
        ]
    }

    private generateBoxs = (
        startBoundingBox: { height: number, left: number, top: number, width: number },
        endBoundingBox: { height: number, left: number, top: number, width: number },
        steps: number
    ): { height: number, left: number, top: number, width: number }[] => {
        const xStep = (endBoundingBox.left - startBoundingBox.left) / steps;
        const yStep = (endBoundingBox.top - startBoundingBox.top) / steps;
        const hStep = (endBoundingBox.height - startBoundingBox.height) / steps;
        const wStep = (endBoundingBox.width - startBoundingBox.width) / steps;
        let boxs = [];
        for (let i = 1; i < steps; i++) {
            boxs.push({
                height: startBoundingBox.height + hStep * i,
                width: startBoundingBox.width + wStep * i,
                left: startBoundingBox.left + xStep * i,
                top: startBoundingBox.top + yStep * i
            });
        }
        return boxs;
    }

    private queryAssets = (start: number, step: number, stop: string): IAsset[] => {
        let assets: IAsset[] = [];
        let notFindAll = true;
        let index = start;
        while (notFindAll) {
            const asset = this.sortedAssets[index + step];
            if (asset.id === stop) {
                notFindAll = false;
            } else {
                assets.push(asset);
                index += step;
            }
        }

        return assets;
    }

    private findPreviousKeyFrame = (index: number, regions: ICustomRegion[]): ICustomRegion => {
        return this.findKeyFrame(index, -1, regions, -1);
    }

    private findNextKeyFrame = (index: number, regions: ICustomRegion[], len: number): ICustomRegion => {
        return this.findKeyFrame(index, 1, regions, len);
    }

    private findKeyFrame = (start: number, step: number, regions: ICustomRegion[], stop: number): ICustomRegion => {
        let i = start;
        let notFind = true;
        let cRegion: ICustomRegion;
        while (notFind) {
            if (regions[i].keyFrame) {
                cRegion = regions[i];
                notFind = false;
            }
            i += step;
            if (i === stop) {
                notFind = false;
            }
        }
        return cRegion;
    }


    public render() {
        const { project } = this.props;
        const { assets, selectedAsset } = this.state;
        const rootAssets = assets.filter((asset) => !asset.parent);

        if (!project) {
            return (<div>Loading...</div>);
        }

        return (
            <div className="editor-page">
                {[...Array(10).keys()].map((index) => {
                    return (<KeyboardBinding
                        displayName={strings.editorPage.tags.hotKey.apply}
                        key={index}
                        keyEventType={KeyEventType.KeyDown}
                        accelerators={[`${index}`]}
                        icon={"fa-tag"}
                        handler={this.handleTagHotKey} />);
                })}
                {[...Array(10).keys()].map((index) => {
                    return (<KeyboardBinding
                        displayName={strings.editorPage.tags.hotKey.lock}
                        key={index}
                        keyEventType={KeyEventType.KeyDown}
                        accelerators={[`CmdOrCtrl+${index}`]}
                        icon={"fa-lock"}
                        handler={this.handleCtrlTagHotKey} />);
                })}
                <SplitPane split="vertical"
                    defaultSize={this.state.thumbnailSize.width}
                    minSize={0}
                    maxSize={250}
                    paneStyle={{ display: "flex" }}
                    onChange={this.onSideBarResize}
                    onDragFinished={this.onSideBarResizeComplete}>
                    <div className="editor-page-sidebar bg-lighter-1">
                        <EditorSideBar
                            assets={rootAssets}
                            selectedAsset={selectedAsset ? selectedAsset.asset : null}
                            onBeforeAssetSelected={this.onBeforeAssetSelected}
                            onAssetSelected={this.selectAsset}
                            thumbnailSize={this.state.thumbnailSize}
                        />
                    </div>
                    <div className="editor-page-content" onClick={this.onPageClick}>
                        <div className="editor-page-content-main">
                            <div className="editor-page-content-main-header">
                                {/* INFO: hide before tool bar */}
                                {/* <EditorToolbar project={this.props.project}
                                    items={this.toolbarItems}
                                    actions={this.props.actions}
                                    onToolbarItemSelected={this.onToolbarItemSelected} /> */}
                                <TopConfigBar
                                    selectedRegionTrackId={this.state.selectedRegions && this.state.selectedRegions[0] ? this.state.selectedRegions[0].trackId + '' : ''}
                                    selectedRegionTrackIdChange={this.selectedRegionTrackIdChange}
                                    tags={this.props.project.tags}
                                    lockedTags={this.state.lockedTags}
                                    selectedRegions={this.state.selectedRegions}
                                    onChange={this.onTagsChanged}
                                    onLockedTagsChange={this.onLockedTagsChanged}
                                    onTagClick={this.onTagClicked}
                                    onCtrlTagClick={this.onCtrlTagClicked}
                                />
                            </div>
                            <div className="editor-page-content-main-body">
                                {selectedAsset &&
                                    <Canvas
                                        ref={this.canvas}
                                        selectedAsset={this.state.selectedAsset}
                                        onAssetMetadataChanged={this.onAssetMetadataChanged}
                                        onRegionMoved={this.updateRegionsBetweenKeyFrames}
                                        onCanvasRendered={this.onCanvasRendered}
                                        onSelectedRegionsChanged={this.onSelectedRegionsChanged}
                                        editorMode={this.state.editorMode}
                                        selectionMode={this.state.selectionMode}
                                        customData={this.props.customData}
                                        updateMaxTrackId={this.updateMaxTrackId}
                                        project={this.props.project}
                                        lockedTags={this.state.lockedTags}>
                                        <AssetPreview
                                            additionalSettings={this.state.additionalSettings}
                                            autoPlay={true}
                                            controlsEnabled={this.state.isValid}
                                            onBeforeAssetChanged={this.onBeforeAssetSelected}
                                            onChildAssetSelected={this.onChildAssetSelected}
                                            asset={this.state.selectedAsset.asset}
                                            childAssets={this.state.childAssets} />
                                    </Canvas>
                                }
                            </div>
                        </div>
                        <div className="editor-page-right-sidebar">
                            {/* <TagInput
                                tags={this.props.project.tags}
                                lockedTags={this.state.lockedTags}
                                selectedRegions={this.state.selectedRegions}
                                onChange={this.onTagsChanged}
                                onLockedTagsChange={this.onLockedTagsChanged}
                                onTagClick={this.onTagClicked}
                                onCtrlTagClick={this.onCtrlTagClicked}
                                onTagRenamed={this.confirmTagRenamed}
                                onTagDeleted={this.confirmTagDeleted}
                            /> */}
                            <PersonInfo />
                        </div>
                        <Confirm title={strings.editorPage.tags.rename.title}
                            ref={this.renameTagConfirm}
                            message={strings.editorPage.tags.rename.confirmation}
                            confirmButtonColor="danger"
                            onConfirm={this.onTagRenamed} />
                        <Confirm title={strings.editorPage.tags.delete.title}
                            ref={this.deleteTagConfirm}
                            message={strings.editorPage.tags.delete.confirmation}
                            confirmButtonColor="danger"
                            onConfirm={this.onTagDeleted} />
                    </div>
                </SplitPane>
                <Alert show={this.state.showInvalidRegionWarning}
                    title={strings.editorPage.messages.enforceTaggedRegions.title}
                    // tslint:disable-next-line:max-line-length
                    message={strings.editorPage.messages.enforceTaggedRegions.description}
                    closeButtonColor="info"
                    onClose={() => this.setState({ showInvalidRegionWarning: false })} />
            </div>
        );
    }

    private onPageClick = () => {
        // Current selected regions will be removed by this function
        // this.setState({
        //     selectedRegions: [],
        // });
    }

    /**
     * Called when the asset side bar is resized
     * @param newWidth The new sidebar width
     */
    private onSideBarResize = (newWidth: number) => {
        this.setState({
            thumbnailSize: {
                width: newWidth,
                height: newWidth / (4 / 3),
            },
        }, () => this.canvas.current.forceResize());
    }

    /**
     * Called when the asset sidebar has been completed
     */
    private onSideBarResizeComplete = () => {
        const appSettings = {
            ...this.props.appSettings,
            thumbnailSize: this.state.thumbnailSize,
        };

        this.props.applicationActions.saveAppSettings(appSettings);
    }

    /**
     * Called when a tag from footer is clicked
     * @param tag Tag clicked
     */
    private onTagClicked = (tag: ITag): void => {
        console.log(this.canvas, this.canvas.current);
        this.setState({
            selectedTag: tag.name,
            lockedTags: [],
        }, () => this.canvas.current.applyTag(tag.name));
    }

    /**
     * Open confirm dialog for tag renaming
     */
    private confirmTagRenamed = (tagName: string, newTagName: string): void => {
        this.renameTagConfirm.current.open(tagName, newTagName);
    }

    /**
     * Renames tag in assets and project, and saves files
     * @param tagName Name of tag to be renamed
     * @param newTagName New name of tag
     */
    private onTagRenamed = async (tagName: string, newTagName: string): Promise<void> => {
        const assetUpdates = await this.props.actions.updateProjectTag(this.props.project, tagName, newTagName);
        const selectedAsset = assetUpdates.find((am) => am.asset.id === this.state.selectedAsset.asset.id);

        if (selectedAsset) {
            if (selectedAsset) {
                this.setState({ selectedAsset });
            }
        }
    }

    /**
     * Open Confirm dialog for tag deletion
     */
    private confirmTagDeleted = (tagName: string): void => {
        this.deleteTagConfirm.current.open(tagName);
    }

    /**
     * Removes tag from assets and projects and saves files
     * @param tagName Name of tag to be deleted
     */
    private onTagDeleted = async (tagName: string): Promise<void> => {
        const assetUpdates = await this.props.actions.deleteProjectTag(this.props.project, tagName);
        const selectedAsset = assetUpdates.find((am) => am.asset.id === this.state.selectedAsset.asset.id);

        if (selectedAsset) {
            this.setState({ selectedAsset });
        }
    }

    private onCtrlTagClicked = (tag: ITag): void => {
        const locked = this.state.lockedTags;
        this.setState({
            selectedTag: tag.name,
            lockedTags: CanvasHelpers.toggleTag(locked, tag.name),
        }, () => this.canvas.current.applyTag(tag.name));
    }

    private getTagFromKeyboardEvent = (event: KeyboardEvent): ITag => {
        let key = parseInt(event.key, 10);
        if (isNaN(key)) {
            try {
                key = parseInt(event.key.split("+")[1], 10);
            } catch (e) {
                return;
            }
        }
        let index: number;
        const tags = this.props.project.tags;
        if (key === 0 && tags.length >= 10) {
            index = 9;
        } else if (key < 10) {
            index = key - 1;
        }
        if (index < tags.length) {
            return tags[index];
        }
        return null;
    }

    /**
     * Listens for {number key} and calls `onTagClicked` with tag corresponding to that number
     * @param event KeyDown event
     */
    private handleTagHotKey = (event: KeyboardEvent): void => {
        const tag = this.getTagFromKeyboardEvent(event);
        if (tag) {
            this.onTagClicked(tag);
        }
    }

    private handleCtrlTagHotKey = (event: KeyboardEvent): void => {
        const tag = this.getTagFromKeyboardEvent(event);
        if (tag) {
            this.onCtrlTagClicked(tag);
        }
    }

    /**
     * Raised when a child asset is selected on the Asset Preview
     * ex) When a video is paused/seeked to on a video
     */
    private onChildAssetSelected = async (childAsset: IAsset) => {
        if (this.state.selectedAsset && this.state.selectedAsset.asset.id !== childAsset.id) {
            await this.selectAsset(childAsset);
        }
    }

    /**
     * Returns a value indicating whether the current asset is taggable
     */
    private isTaggableAssetType = (asset: IAsset): boolean => {
        return asset.type !== AssetType.Unknown && asset.type !== AssetType.Video;
    }

    /**
     * Raised when the selected asset has been changed.
     * This can either be a parent or child asset
     */
    private onAssetMetadataChanged = async (assetMetadata: IAssetMetadata): Promise<void> => {
        // If the asset contains any regions without tags, don't proceed.
        const regionsWithoutTags = assetMetadata.regions.filter((region) => region.tags.length === 0);

        if (regionsWithoutTags.length > 0) {
            this.setState({ isValid: false });
            return;
        }

        const initialState = assetMetadata.asset.state;

        // The root asset can either be the actual asset being edited (ex: VideoFrame) or the top level / root
        // asset selected from the side bar (image/video).
        const rootAsset = { ...(assetMetadata.asset.parent || assetMetadata.asset) };

        if (this.isTaggableAssetType(assetMetadata.asset)) {
            assetMetadata.asset.state = assetMetadata.regions.length > 0 ? AssetState.Tagged : AssetState.Visited;
        } else if (assetMetadata.asset.state === AssetState.NotVisited) {
            assetMetadata.asset.state = AssetState.Visited;
        }

        // Update root asset if not already in the "Tagged" state
        // This is primarily used in the case where a Video Frame is being edited.
        // We want to ensure that in this case the root video asset state is accurately
        // updated to match that state of the asset.
        if (rootAsset.id === assetMetadata.asset.id) {
            rootAsset.state = assetMetadata.asset.state;
        } else {
            const rootAssetMetadata = await this.props.actions.loadAssetMetadata(this.props.project, rootAsset);

            if (rootAssetMetadata.asset.state !== AssetState.Tagged) {
                rootAssetMetadata.asset.state = assetMetadata.asset.state;
                await this.props.actions.saveAssetMetadata(this.props.project, rootAssetMetadata);
            }

            rootAsset.state = rootAssetMetadata.asset.state;
        }

        // Only update asset metadata if state changes or is different
        if (initialState !== assetMetadata.asset.state || this.state.selectedAsset !== assetMetadata) {
            await this.props.actions.saveAssetMetadata(this.props.project, assetMetadata);
        }

        await this.props.actions.saveProject(this.props.project);

        const assetService = new AssetService(this.props.project);
        const childAssets = assetService.getChildAssets(rootAsset);


        console.log(this.props.customData, childAssets, 'custom Data....', this.props.project);


        assetService.saveCustomData(this.customDataFileName, this.props.customData);


        // Find and update the root asset in the internal state
        // This forces the root assets that are displayed in the sidebar to
        // accurately show their correct state (not-visited, visited or tagged)
        const assets = [...this.state.assets];
        const assetIndex = assets.findIndex((asset) => asset.id === rootAsset.id);
        if (assetIndex > -1) {
            assets[assetIndex] = {
                ...rootAsset,
            };
        }

        // INFO: childAsset here
        console.log(childAssets, 'childAssets');


        this.setState({ childAssets, assets, isValid: true });
    }

    private updateAssetsRegion = async (asset: IAsset, region: IRegion): Promise<void> => {

        const assetService = new AssetService(this.props.project);
        const data = await assetService.getAssetMetadata(asset);
        const { regions } = data;
        const removeSame = regions.filter(r => r.trackId !== region.trackId);
        this.onAssetMetadataChanged({
            ...data,
            regions: [...removeSame, region]
        });
    }

    /**
     * Raised when the asset binary has been painted onto the canvas tools rendering canvas
     */
    private onCanvasRendered = async (canvas: HTMLCanvasElement) => {
        // When active learning auto-detect is enabled
        // run predictions when asset changes
        if (this.props.project.activeLearningSettings.autoDetect && !this.state.selectedAsset.asset.predicted) {
            await this.predictRegions(canvas);
        }
    }

    private onSelectedRegionsChanged = (selectedRegions: IRegion[]) => {
        // INFO: create a new region also will trigger here.
        console.log(selectedRegions, 'selected regions');
        const ids = selectedRegions.map(region => ({ trackId: region.trackId, id: region.id }));
        this.props.customDataActions.updateCurrentTrackId([...ids]);
        this.setState({ selectedRegions });
    }

    private onTagsChanged = async (tags) => {
        const project = {
            ...this.props.project,
            tags,
        };

        await this.props.actions.saveProject(project);
    }

    private onLockedTagsChanged = (lockedTags: string[]) => {
        this.setState({ lockedTags });
    }

    private onToolbarItemSelected = async (toolbarItem: ToolbarItem): Promise<void> => {
        switch (toolbarItem.props.name) {
            case ToolbarItemName.DrawRectangle:
                this.setState({
                    selectionMode: SelectionMode.RECT,
                    editorMode: EditorMode.Rectangle,
                });
                break;
            case ToolbarItemName.DrawPolygon:
                this.setState({
                    selectionMode: SelectionMode.POLYGON,
                    editorMode: EditorMode.Polygon,
                });
                break;
            case ToolbarItemName.CopyRectangle:
                this.setState({
                    selectionMode: SelectionMode.COPYRECT,
                    editorMode: EditorMode.CopyRect,
                });
                break;
            case ToolbarItemName.SelectCanvas:
                this.setState({
                    selectionMode: SelectionMode.NONE,
                    editorMode: EditorMode.Select,
                });
                break;
            case ToolbarItemName.PreviousAsset:
                await this.goToRootAsset(-1);
                break;
            case ToolbarItemName.NextAsset:
                await this.goToRootAsset(1);
                break;
            case ToolbarItemName.CopyRegions:
                this.canvas.current.copyRegions();
                break;
            case ToolbarItemName.CutRegions:
                this.canvas.current.cutRegions();
                break;
            case ToolbarItemName.PasteRegions:
                this.canvas.current.pasteRegions();
                break;
            case ToolbarItemName.RemoveAllRegions:
                this.canvas.current.confirmRemoveAllRegions();
                break;
            case ToolbarItemName.ActiveLearning:
                await this.predictRegions();
                break;
        }
    }

    private predictRegions = async (canvas?: HTMLCanvasElement) => {
        canvas = canvas || document.querySelector("canvas");
        if (!canvas) {
            return;
        }

        // Load the configured ML model
        if (!this.activeLearningService.isModelLoaded()) {
            let toastId: number = null;
            try {
                toastId = toast.info(strings.activeLearning.messages.loadingModel, { autoClose: false });
                await this.activeLearningService.ensureModelLoaded();
            } catch (e) {
                toast.error(strings.activeLearning.messages.errorLoadModel);
                return;
            } finally {
                toast.dismiss(toastId);
            }
        }

        // Predict and add regions to current asset
        try {
            const updatedAssetMetadata = await this.activeLearningService
                .predictRegions(canvas, this.state.selectedAsset);

            await this.onAssetMetadataChanged(updatedAssetMetadata);
            console.log('predictRegions', 'selectedAsset', updatedAssetMetadata)
            this.setState({ selectedAsset: updatedAssetMetadata });
        } catch (e) {
            throw new AppError(ErrorCode.ActiveLearningPredictionError, "Error predicting regions");
        }
    }

    /**
     * Navigates to the previous / next root asset on the sidebar
     * @param direction Number specifying asset navigation
     */
    private goToRootAsset = async (direction: number) => {
        const selectedRootAsset = this.state.selectedAsset.asset.parent || this.state.selectedAsset.asset;
        const currentIndex = this.state.assets
            .findIndex((asset) => asset.id === selectedRootAsset.id);

        if (direction > 0) {
            await this.selectAsset(this.state.assets[Math.min(this.state.assets.length - 1, currentIndex + 1)]);
        } else {
            await this.selectAsset(this.state.assets[Math.max(0, currentIndex - 1)]);
        }
    }

    private onBeforeAssetSelected = (): boolean => {
        if (!this.state.isValid) {
            this.setState({ showInvalidRegionWarning: true });
        }

        return this.state.isValid;
    }

    private selectAsset = async (asset: IAsset): Promise<void> => {
        // INFO: frame change will trigger this function
        // Nothing to do if we are already on the same asset.
        if (this.state.selectedAsset && this.state.selectedAsset.asset.id === asset.id) {
            return;
        }

        if (!this.state.isValid) {
            this.setState({ showInvalidRegionWarning: true });
            return;
        }

        const assetMetadata = await this.props.actions.loadAssetMetadata(this.props.project, asset);
        console.log(this.props.project, asset, 'assetMetadata', 'selectedAsset');
        console.log(assetMetadata, 'assetMetadata', 'selectedAsset');
        try {
            if (!assetMetadata.asset.size) {
                const assetProps = await HtmlFileReader.readAssetAttributes(asset);
                assetMetadata.asset.size = { width: assetProps.width, height: assetProps.height };
            }
        } catch (err) {
            console.warn("Error computing asset size");
        }

        this.setState({
            selectedAsset: assetMetadata,
        }, async () => {
            await this.onAssetMetadataChanged(assetMetadata);
        });
    }

    private loadProjectAssets = async (): Promise<void> => {
        if (this.loadingProjectAssets || this.state.assets.length > 0) {
            return;
        }

        this.loadingProjectAssets = true;

        // Get all root project assets
        const rootProjectAssets = _.values(this.props.project.assets)
            .filter((asset) => !asset.parent);

        // Get all root assets from source asset provider
        const sourceAssets = await this.props.actions.loadAssets(this.props.project);

        // Merge and uniquify
        const rootAssets = _(rootProjectAssets)
            .concat(sourceAssets)
            .uniqBy((asset) => asset.id)
            .value();

        const lastVisited = rootAssets.find((asset) => asset.id === this.props.project.lastVisitedAssetId);

        this.setState({
            assets: rootAssets,
        }, async () => {
            if (rootAssets.length > 0) {
                await this.selectAsset(lastVisited ? lastVisited : rootAssets[0]);
            }
            this.loadingProjectAssets = false;
        });
    }

    /**
     * Updates the root asset list from the project assets
     */
    private updateRootAssets = () => {
        const updatedAssets = [...this.state.assets];
        updatedAssets.forEach((asset) => {
            const projectAsset = this.props.project.assets[asset.id];
            if (projectAsset) {
                asset.state = projectAsset.state;
            }
        });

        this.setState({ assets: updatedAssets });
    }
}
