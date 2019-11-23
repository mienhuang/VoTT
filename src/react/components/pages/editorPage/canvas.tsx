import React, { Fragment, ReactElement } from "react";
import * as shortid from "shortid";
import { CanvasTools } from "vott-ct";
import { RegionData } from "vott-ct/lib/js/CanvasTools/Core/RegionData";
import {
    EditorMode, IAssetMetadata,
    IProject, IRegion, RegionType,
    ICustomData
} from "../../../../models/applicationState";
import CanvasHelpers from "./canvasHelpers";
import { AssetPreview, ContentSource } from "../../common/assetPreview/assetPreview";
import { Editor } from "vott-ct/lib/js/CanvasTools/CanvasTools.Editor";
import Clipboard from "../../../../common/clipboard";
import Confirm from "../../common/confirm/confirm";
import { strings } from "../../../../common/strings";
import { SelectionMode } from "vott-ct/lib/js/CanvasTools/Interface/ISelectorSettings";
import { Rect } from "vott-ct/lib/js/CanvasTools/Core/Rect";
import { createContentBoundingBox } from "../../../../common/layout";
import fetch, { Headers } from "node-fetch";

export interface ICanvasProps extends React.Props<Canvas> {
    selectedAsset: IAssetMetadata;
    editorMode: EditorMode;
    selectionMode: SelectionMode;
    project: IProject;
    lockedTags: string[];
    children?: ReactElement<AssetPreview>;
    customData?: ICustomData;
    updateMaxTrackId?: (region: IRegion, type: string) => void;
    onAssetMetadataChanged?: (assetMetadata: IAssetMetadata) => void;
    onSelectedRegionsChanged?: (regions: IRegion[]) => void;
    onCanvasRendered?: (canvas: HTMLCanvasElement) => void;
    onRegionMoved?: (region: IRegion, id: number) => void;
    frameIndex?: any;
    frames?: any;
    queryFaceCb?: (data: any) => void;
}

export interface ICanvasState {
    currentAsset: IAssetMetadata;
    contentSource: ContentSource;
    enabled: boolean;
    showCanvas: boolean;
}

export default class Canvas extends React.Component<ICanvasProps, ICanvasState> {
    public static defaultProps: ICanvasProps = {
        selectionMode: SelectionMode.NONE,
        editorMode: EditorMode.Select,
        selectedAsset: null,
        project: null,
        lockedTags: [],
        customData: {
            maxTrackId: 0,
            regions: {},
            maxTrackIdList: [0],
            currentTrackId: []
        }
    };

    public editor: Editor;

    public state: ICanvasState = {
        currentAsset: this.props.selectedAsset,
        contentSource: null,
        enabled: false,
        showCanvas: false
    };

    private canvasZone: React.RefObject<HTMLDivElement> = React.createRef();
    private clearConfirm: React.RefObject<Confirm> = React.createRef();
    // private newCanvas: React.RefObject<any> = React.createRef();

    private template: Rect = new Rect(20, 20);

    public componentDidMount = () => {
        const sz = document.getElementById("editor-zone") as HTMLDivElement;
        this.editor = new CanvasTools.Editor(sz);
        this.editor.autoResize = false;
        this.editor.onSelectionEnd = this.onSelectionEnd;
        this.editor.onRegionMoveEnd = this.onRegionMoveEnd;
        this.editor.onRegionDelete = this.onRegionDelete;
        this.editor.onRegionSelected = this.onRegionSelected;
        this.editor.AS.setSelectionMode({ mode: this.props.selectionMode });

        window.addEventListener("resize", this.onWindowResize);
    }
    src: string;

    public componentWillUnmount() {
        window.removeEventListener("resize", this.onWindowResize);
    }

    public componentDidUpdate = async (prevProps: Readonly<ICanvasProps>, prevState: Readonly<ICanvasState>) => {
        // Handles asset changing
        if (this.props.selectedAsset !== prevProps.selectedAsset) {
            this.setState({ currentAsset: this.props.selectedAsset });
        }

        // Handle selection mode changes
        if (this.props.selectionMode !== prevProps.selectionMode) {
            const options = (this.props.selectionMode === SelectionMode.COPYRECT) ? this.template : null;
            this.editor.AS.setSelectionMode({ mode: this.props.selectionMode, template: options });
        }

        const assetIdChanged = this.state.currentAsset.asset.id !== prevState.currentAsset.asset.id;

        // When the selected asset has changed but is still the same asset id
        // STOP to listen asset change event 
        // if (!assetIdChanged && this.state.currentAsset !== prevState.currentAsset) {
        // this.refreshCanvasToolsRegions();
        // }

        if (this.props.frameIndex !== prevProps.frameIndex) {
            //console.log('called did update func');
            this.refreshCanvasToolsRegions();
        }

        // When the project tags change re-apply tags to regions
        if (this.props.project.tags !== prevProps.project.tags) {
            this.updateCanvasToolsRegionTags();
        }

        // Handles when the canvas is enabled & disabled
        if (prevState.enabled !== this.state.enabled) {
            // When the canvas is ready to display
            if (this.state.enabled) {
                this.refreshCanvasToolsRegions();
                this.setContentSource(this.state.contentSource);
                this.editor.AS.setSelectionMode(this.props.selectionMode);
                this.editor.AS.enable();

                if (this.props.onSelectedRegionsChanged) {
                    this.props.onSelectedRegionsChanged(this.getSelectedRegions());
                }
            } else { // When the canvas has been disabled
                this.editor.AS.disable();
                this.clearAllRegions();
                this.editor.AS.setSelectionMode(SelectionMode.NONE);
            }
        }
    }

    public render = () => {
        const className = this.state.enabled ? "canvas-enabled" : "canvas-disabled";
        const showCanvas = this.state.showCanvas ? 'show-canvas' : 'hide-canvas';

        return (
            <Fragment>
                <Confirm title={strings.editorPage.canvas.removeAllRegions.title}
                    ref={this.clearConfirm as any}
                    message={strings.editorPage.canvas.removeAllRegions.confirmation}
                    confirmButtonColor="danger"
                    onConfirm={this.removeAllRegions}
                />
                <div id="ct-zone" ref={this.canvasZone} className={className} onClick={(e) => e.stopPropagation()}>
                    <div id="selection-zone" className={showCanvas}>
                        <div id="editor-zone" className='full-size' />
                    </div>
                </div>
                {this.renderChildren()}
            </Fragment>
        );
    }


    public search = (selectedRegions) => {
        const imgURL = localStorage.getItem('imgURL') || 'http://192.168.88.156:5000';
        const imgTabIDList = localStorage.getItem('imgTL') || '1234567890';
        console.log(selectedRegions, 'called search..');
        const { tags, boundingBox: { height, width, left: x, top: y } } = selectedRegions[0];
        const sourceCanvas = this.canvasZone.current.querySelector("canvas");
        const newCanvas = document.getElementById('new-canvas') as HTMLCanvasElement;
        const _h = Math.round(height);
        const _w = Math.round(width);
        newCanvas.width = _w;
        newCanvas.height = _h;
        newCanvas.style.width = `${_w}px`;
        newCanvas.style.height = `${_h}px`;
        const newCtx = newCanvas.getContext('2d');
        const ctx = sourceCanvas.getContext('2d');
        var img = ctx.getImageData(x, y, _w, _h);
        newCtx.clearRect(0, 0, 0, 0);
        newCtx.putImageData(img, 0, 0);

        const ImageFData = newCanvas.toDataURL("image/jpeg", 1.0).split("data:image/jpeg;base64,")[1];

        const ImageSearchType = tags[0].replace(/\b\w+\b/g, function (word) {
            return word.substring(0, 1).toUpperCase() + word.substring(1);
        });

        const url = `${imgURL}/VIAS/ImageSearchedByImagesSync`; // can be changed
        const data = {
            "SearchID": Math.random().toString(36).split('.')[1],
            "MaxNumRecordReturn": 10,
            "SearchType": ImageSearchType,
            "TabIDList": imgTabIDList, // can be changed
            "Image": { "EventSort": 11, "Data": ImageFData }
        };


        fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: new Headers({
                'Content-Type': 'application/json;charset=UTF-8'
            })
        })
            .then(res => res.json())
            // .then(() => {
            //     return {
            //         "ImageResultSBI": {
            //             "SearchID": "your SearchID",
            //             "ReturnNum": 2,
            //             "TotalNum": 2,
            //             "FaceObjectList": {
            //                 "FaceObject": [
            //                     {
            //                         "FaceID": "123123",
            //                         "TabID": "00000000000000000000050000001000000000001",
            //                         "Similaritydegree": 0.123
            //                     },
            //                     {
            //                         "FaceID": "234434",
            //                         "TabID": "00000000000000000000050000001000000000001",
            //                         "Similaritydegree": 0.023
            //                     }
            //                 ]
            //             }
            //         }
            //     };
            // })
            .then(response => response.ImageResultSBI.FaceObjectList.FaceObject)
            .then(list => this.queryAllFaceInfo(list))
            .then(data => this.props.queryFaceCb(data))
            .catch(error => console.error('Error:', error))
            .then(response => console.log('Success:', response));

    }

    queryAllFaceInfo = (list: {
        FaceID: string,
        TabID: string,
        Similaritydegree: number
    }[]) => {
        return Promise.all(
            list.map(face => this.getImageById(face.FaceID, face.Similaritydegree))
        )
    }

    getImageById = (imageId, similaritydegree: number) => {
        const faceURL = localStorage.getItem('faceURL') || 'http://127.0.0.1:8080';
        const subImageType = localStorage.getItem('subImageType') || '02';

        const url = `${faceURL}/VIID/Faces/${imageId}?SubImageType=${subImageType}`;
        return fetch(url, {
            method: 'GET',
            headers: new Headers({
                'Content-Type': 'application/json;charset=UTF-8'
            })
        })
            .then(res => res.json())
            // .then(data => ({
            //     "FaceList": {
            //         "FaceObject": [
            //             {
            //                 "FaceID": "122323333344444",
            //                 "Name": "zd",
            //                 "SubImageList": {
            //                     "SubImageInfo": {
            //                         "ImageID": "122323333344444",
            //                         "DeviceID": "1111",
            //                         "Type": "11",
            //                         "SubType": "01",
            //                         "FileFormat": "png",
            //                         "Width": "11",
            //                         "Height": "11",
            //                         "StoragePath": "http://127.0.0.1:9333/3,113457777"
            //                     }
            //                 }
            //             }
            //         ]
            //     }
            // }))
            .then(data => {
                return {
                    name: data.FaceList.FaceObject[0].Name,
                    faceId: data.FaceList.FaceObject[0].FaceID,
                    path: data.FaceList.FaceObject[0].SubImageList.SubImageInfo.StoragePath,
                    similaritydegree
                }
            })
    }

    /**
     * Toggles tag on all selected regions
     * @param selectedTag Tag name
     */
    public applyTag = (tag: string) => {
        const selectedRegions = this.getSelectedRegions();
        //console.log(selectedRegions, '=======selectedRegions');
        const lockedTags = this.props.lockedTags;
        const lockedTagsEmpty = !lockedTags || !lockedTags.length;
        const regionsEmpty = !selectedRegions || !selectedRegions.length;
        if ((!tag && lockedTagsEmpty) || regionsEmpty) {
            return;
        }
        let transformer: (tags: string[], tag: string) => string[];
        if (lockedTagsEmpty) {
            // Tag selected while region(s) selected
            transformer = CanvasHelpers.toggleTag;
        } else if (lockedTags.find((t) => t === tag)) {
            // Tag added to locked tags while region(s) selected
            transformer = CanvasHelpers.addIfMissing;
        } else {
            // Tag removed from locked tags while region(s) selected
            transformer = CanvasHelpers.removeIfContained;
        }
        //console.log(transformer, 'check what transfer is...')
        for (const selectedRegion of selectedRegions) {
            selectedRegion.tags = transformer(selectedRegion.tags, tag);
            this.updateMaxtrackId(selectedRegion);
        }
        this.updateRegions(selectedRegions);
        if (this.props.onSelectedRegionsChanged) {
            this.props.onSelectedRegionsChanged(selectedRegions);
        }
    }

    public updateMaxtrackId(region: IRegion) {
        const tagLen = region.tags.length;
        if (tagLen) {
            this.props.updateMaxTrackId(region, 'add');
        } else {
            this.props.updateMaxTrackId(region, 'delete');
        }
    }

    public copyRegions = async () => {
        await Clipboard.writeObject(this.getSelectedRegions());
    }

    public cutRegions = async () => {
        const selectedRegions = this.getSelectedRegions();
        await Clipboard.writeObject(selectedRegions);
        this.deleteRegions(selectedRegions);
    }

    public pasteRegions = async () => {
        const regionsToPaste: IRegion[] = await Clipboard.readObject();
        const asset = this.state.currentAsset;
        const duplicates = CanvasHelpers.duplicateRegionsAndMove(
            regionsToPaste,
            asset.regions,
            asset.asset.size.width,
            asset.asset.size.height,
        );
        this.addRegions(duplicates);
    }

    public confirmRemoveAllRegions = () => {
        this.clearConfirm.current.open();
    }

    public getSelectedRegions = (): IRegion[] => {
        const selectedRegions = this.editor.RM.getSelectedRegionsBounds().map((rb) => rb.id);
        const currentRegions = this.props.frames[this.props.frameIndex] || [];
        // return this.state.currentAsset.regions.filter((r) => selectedRegions.find((id) => r.id === id));
        return currentRegions.filter((r) => selectedRegions.find((id) => r.id === id));
    }

    public updateCanvasToolsRegionTags = (): void => {
        const currentRegions = this.props.frames[this.props.frameIndex] || [];
        for (const region of currentRegions) {
            this.editor.RM.updateTagsById(
                region.id,
                CanvasHelpers.getTagsDescriptor(this.props.project.tags, region, region.trackId),
            );
        }
    }

    public forceResize = (): void => {
        this.onWindowResize();
    }

    private removeAllRegions = () => {
        const currentRegions = this.props.frames[this.props.frameIndex] || [];
        currentRegions.forEach((r) => {
            this.editor.RM.deleteRegionById(r.id);
            this.props.updateMaxTrackId(r, 'delete');
        });
        // for (const id of ids) {
        // }
        // this.deleteRegionsFromAsset(this.state.currentAsset.regions);
    }

    private addRegions = (regions: IRegion[]) => {
        this.addRegionsToCanvasTools(regions);
        // this.addRegionsToAsset(regions);
    }

    // private addRegionsToAsset = (regions: IRegion[]) => {
    //     this.updateAssetRegions(
    //         this.state.currentAsset.regions.concat(regions),
    //     );
    // }

    private addRegionsToCanvasTools = (regions: IRegion[]) => {
        for (const region of regions) {
            const regionData = CanvasHelpers.getRegionData(region);
            const scaledRegionData = this.editor.scaleRegionToFrameSize(
                regionData,
                this.state.currentAsset.asset.size.width,
                this.state.currentAsset.asset.size.height);
            this.editor.RM.addRegion(
                region.id,
                scaledRegionData,
                CanvasHelpers.getTagsDescriptor(this.props.project.tags, region, region.trackId),
            );
        }
    }

    private deleteRegions = (regions: IRegion[]) => {
        this.deleteRegionsFromCanvasTools(regions);
        // this.deleteRegionsFromAsset(regions);
    }

    // private deleteRegionsFromAsset = (regions: IRegion[]) => {
    //     const filteredRegions = this.state.currentAsset.regions.filter((assetRegion) => {
    //         return !regions.find((r) => r.id === assetRegion.id);
    //     });
    //     this.updateAssetRegions(filteredRegions);
    // }

    private deleteRegionsFromCanvasTools = (regions: IRegion[]) => {
        for (const region of regions) {
            this.editor.RM.deleteRegionById(region.id);
            this.props.updateMaxTrackId(region, 'delete');
        }
    }

    /**
     * Method that gets called when a new region is drawn
     * @param {RegionData} regionData the RegionData of created region
     * @returns {void}
     */
    private onSelectionEnd = (regionData: RegionData) => {
        //console.log('STEP-INFO, start create a new region');
        if (CanvasHelpers.isEmpty(regionData)) {
            return;
        }
        const { height, width, x, y, points } = this.editor.scaleRegionToSourceSize(
            regionData,
            this.state.currentAsset.asset.size.width,
            this.state.currentAsset.asset.size.height,
        );
        if (!(height * width)) {
            // INFO: avoid add a dot to the page as a region
            return;
        }

        const id = shortid.generate();

        this.editor.RM.addRegion(id, regionData, null);

        this.template = new Rect(regionData.width, regionData.height);

        // RegionData not serializable so need to extract data
        // ADD REGION
        const lockedTags = this.props.lockedTags;
        //console.log(this.props.customData, 'ccccccc datat')
        const newRegion = {
            id,
            type: this.editorModeToType(this.props.editorMode),
            tags: lockedTags || [],
            boundingBox: {
                height,
                width,
                left: x,
                top: y,
            },
            points,
            trackId: this.props.customData.maxTrackId + 1,
            faceId: '-1',
            keyFrame: true,
            frameIndex: this.props.frameIndex,
            imgPath: ''
        };

        // this.props.customDataActions.updateRegion(newRegion);


        //console.log(newRegion, 'newRegionnewRegionnewRegion')
        if (lockedTags && lockedTags.length) {
            this.editor.RM.updateTagsById(id, CanvasHelpers.getTagsDescriptor(this.props.project.tags, newRegion, newRegion.trackId));
        }
        // this.updateAssetRegions([...this.state.currentAsset.regions, newRegion]);
        this.props.updateMaxTrackId(newRegion, 'add');
        if (this.props.onSelectedRegionsChanged) {
            this.props.onSelectedRegionsChanged([newRegion]);
        }
    }

    /**
     * Update regions within the current asset
     * @param regions
     * @param selectedRegions
     */
    public updateAssetRegions = (regions: IRegion[]) => {
        const currentAsset: IAssetMetadata = {
            ...this.state.currentAsset,
            regions,
        };
        this.setState({
            currentAsset,
        }, () => {
            this.props.onAssetMetadataChanged(currentAsset);
        });
    }

    /**
     * Method called when moving a region already in the editor
     * @param {string} id the id of the region that was moved
     * @param {RegionData} regionData the RegionData of moved region
     * @returns {void}
     */
    private onRegionMoveEnd = (id: string, regionData: RegionData) => {
        // const currentRegions = this.state.currentAsset.regions;
        const currentRegions = this.props.frames[this.props.frameIndex] || [];
        const movedRegionIndex = currentRegions.findIndex((region) => region.id === id);
        const movedRegion = currentRegions[movedRegionIndex];
        const scaledRegionData = this.editor.scaleRegionToSourceSize(
            regionData,
            this.state.currentAsset.asset.size.width,
            this.state.currentAsset.asset.size.height,
        );

        if (movedRegion) {
            movedRegion.points = scaledRegionData.points;
            movedRegion.boundingBox = {
                height: scaledRegionData.height,
                width: scaledRegionData.width,
                left: scaledRegionData.x,
                top: scaledRegionData.y,
            };
            movedRegion.keyFrame = true;
        }

        currentRegions[movedRegionIndex] = movedRegion;
        this.props.updateMaxTrackId(movedRegion, 'delete');
        this.props.updateMaxTrackId(movedRegion, 'add');
        // this.updateAssetRegions(currentRegions);
        this.props.onRegionMoved(movedRegion, movedRegion.trackId);
    }

    /**
     * Method called when deleting a region from the editor
     * @param {string} id the id of the deleted region
     * @returns {void}
     */
    private onRegionDelete = (id: string) => {
        // Remove from Canvas Tools
        this.editor.RM.deleteRegionById(id);

        // Remove from project
        // const currentRegions = this.state.currentAsset.regions;
        const currentRegions = this.props.frames[this.props.frameIndex] || [];
        const copy = [...currentRegions];
        const deletedRegionIndex = currentRegions.findIndex((region) => region.id === id);
        //console.log(copy[deletedRegionIndex], '1111111');
        this.props.updateMaxTrackId(copy[deletedRegionIndex], 'delete');
        currentRegions.splice(deletedRegionIndex, 1);
        // this.updateAssetRegions(currentRegions);

        if (this.props.onSelectedRegionsChanged) {
            // TODO: some unknown reason make selected region not display region manage menu
            const latest = [...currentRegions].pop();
            this.props.onSelectedRegionsChanged(latest ? [latest] : []);
        }
    }

    /**
     * Method called when deleting a region from the editor
     * @param {string} id the id of the selected region
     * @param {boolean} multiSelect boolean whether region was selected with multi selection
     * @returns {void}
     */
    private onRegionSelected = (id: string, multiSelect: boolean) => {
        const selectedRegions = this.getSelectedRegions();
        console.log(id, 'select region', selectedRegions)
        if (this.props.onSelectedRegionsChanged) {
            this.props.onSelectedRegionsChanged(selectedRegions);
        }
        // Gets the scaled region data
        const selectedRegionsData = this.editor.RM.getSelectedRegionsBounds().find((region) => region.id === id);

        //console.log(selectedRegionsData, 'select region 1')
        if (selectedRegionsData) {
            this.template = new Rect(selectedRegionsData.width, selectedRegionsData.height);
        }

        if (this.props.lockedTags && this.props.lockedTags.length) {
            for (const selectedRegion of selectedRegions) {
                selectedRegion.tags = CanvasHelpers.addAllIfMissing(selectedRegion.tags, this.props.lockedTags);
            }
            this.updateRegions(selectedRegions);
        }
    }

    private renderChildren = () => {
        return React.cloneElement(this.props.children, {
            onAssetChanged: this.onAssetChanged,
            onLoaded: this.onAssetLoaded,
            onError: this.onAssetError,
            onActivated: this.onAssetActivated,
            onDeactivated: this.onAssetDeactivated,
            onVideoStateChange: this.onVideoStateChange
        });
    }

    public onVideoStateChange = (state: string) => {
        console.log(state, 'cccccc state...');
        this.setState({
            enabled: state !== 'loaded',
            showCanvas: state === 'pause'
        });
    }

    /**
     * Raised when the asset bound to the asset preview has changed
     */
    private onAssetChanged = () => {
        //console.log('state... onAssetChanged asset change');
        this.setState({ enabled: false });
    }

    /**
     * Raised when the underlying asset has completed loading
     */
    private onAssetLoaded = (contentSource: ContentSource) => {
        this.setState({ contentSource });
        this.positionCanvas(contentSource);
    }

    private onAssetError = () => {
        //console.log('state... onAssetError asset change');
        this.setState({
            enabled: false,
        });
    }

    /**
     * Raised when the asset is taking control over the rendering
     */
    private onAssetActivated = () => {
        //console.log('state... onAssetActivated asset change');
        // this.setState({ enabled: false });
    }

    /**
     * Raise when the asset is handing off control of rendering
     */
    private onAssetDeactivated = (contentSource: ContentSource) => {
        //console.log('state... onAssetDeactivated asset change');
        this.setState({
            contentSource,
            enabled: true,
        });
    }

    /**
     * Set the loaded asset content source into the canvas tools canvas
     */
    private setContentSource = async (contentSource: ContentSource) => {
        try {
            await this.editor.addContentSource(contentSource as any);

            if (this.props.onCanvasRendered) {
                const canvas = this.canvasZone.current.querySelector("canvas");
                this.props.onCanvasRendered(canvas);
            }
        } catch (e) {
            console.warn(e);
        }
    }

    /**
     * Positions the canvas tools drawing surface to be exactly over the asset content
     */
    private positionCanvas = (contentSource: ContentSource) => {
        if (!contentSource) {
            return;
        }

        const canvas = this.canvasZone.current;
        if (canvas) {
            const boundingBox = createContentBoundingBox(contentSource);
            canvas.style.top = `${boundingBox.top}px`;
            canvas.style.left = `${boundingBox.left}px`;
            canvas.style.width = `${boundingBox.width}px`;
            canvas.style.height = `${boundingBox.height}px`;
            this.editor.resize(boundingBox.width, boundingBox.height);
        }
    }

    /**
     * Resizes and re-renders the canvas when the application window size changes
     */
    private onWindowResize = async () => {
        if (!this.state.contentSource) {
            return;
        }

        this.positionCanvas(this.state.contentSource);
    }

    /**
     * Updates regions in both Canvas Tools and the asset data store
     * @param updates Regions to be updated
     * @param updatedSelectedRegions Selected regions with any changes already applied
     */
    private updateRegions = (updates: IRegion[]) => {
        // INFO: update Regions
        //console.log('called update regions...', updates);
        // const currentRegions = this.props.frames[this.props.frameIndex];
        // const updatedRegions = CanvasHelpers.updateRegions(currentRegions, updates);
        for (const update of updates) {
            this.editor.RM.updateTagsById(update.id, CanvasHelpers.getTagsDescriptor(this.props.project.tags, update, update.trackId));
            this.props.updateMaxTrackId(update, 'delete');
            this.props.updateMaxTrackId(update, 'add');
        }
        // this.updateAssetRegions(updatedRegions);
        this.updateCanvasToolsRegionTags();
    }

    /**
     * Updates the background of the canvas and draws the asset's regions
     */
    private clearAllRegions = () => {
        this.editor.RM.deleteAllRegions();
    }

    public refreshCanvasToolsRegions = () => {
        if (!this.props.frames) return;
        //console.log('called refreshCanvasToolsRegions', this.props.frameIndex)
        this.clearAllRegions();
        const regions = this.props.frames[this.props.frameIndex] || [];
        if (!regions || regions.length === 0) return;

        regions.forEach((region: IRegion) => {
            const loadedRegionData = CanvasHelpers.getRegionData(region);
            this.editor.RM.addRegion(
                region.id,
                this.editor.scaleRegionToFrameSize(
                    loadedRegionData,
                    this.state.currentAsset.asset.size.width,
                    this.state.currentAsset.asset.size.height,
                ),
                CanvasHelpers.getTagsDescriptor(this.props.project.tags, region, region.trackId));
        });
    }

    private editorModeToType = (editorMode: EditorMode) => {
        let type;
        switch (editorMode) {
            case EditorMode.CopyRect:
            case EditorMode.Rectangle:
                type = RegionType.Rectangle;
                break;
            case EditorMode.Polygon:
                type = RegionType.Polygon;
                break;
            case EditorMode.Point:
                type = RegionType.Point;
                break;
            case EditorMode.Polyline:
                type = RegionType.Polyline;
                break;
            default:
                break;
        }
        return type;
    }
}
