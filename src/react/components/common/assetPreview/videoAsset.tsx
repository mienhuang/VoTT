import React, { SyntheticEvent, Fragment } from "react";
import ReactDOM from "react-dom";
import _ from "lodash";
import {
    Player, BigPlayButton, ControlBar, CurrentTimeDisplay,
    TimeDivider, PlaybackRateMenuButton, VolumeMenuButton,
    FullscreenToggle, PlayToggle, Shortcut, ForwardControl
} from "video-react";
import { IAssetProps } from "./assetPreview";
import { IAsset, AssetType, AssetState } from "../../../../models/applicationState";
import { AssetService } from "../../../../services/assetService";
import { CustomVideoPlayerButton } from "../../common/videoPlayer/customVideoPlayerButton";
import { strings } from "../../../../common/strings";
import { connect } from "react-redux";
import { IApplicationState, ICustomData } from '../../../../models/applicationState';

/**
 * VideoAsset component properties
 */
export interface IVideoAssetProps extends IAssetProps, React.Props<VideoAsset> {
    /** Whether or not the video asset should start playing automatically */
    autoPlay?: boolean;
    /** The timestamp that the video should seek to upon loading */
    timestamp?: number;
    /** The event handler that is fired when a child video frame is selected (ex. paused, seeked) */
    onChildAssetSelected?: (asset: IAsset) => void;
    customData?: ICustomData;
    playerStateChange?: (currentTime: number) => void;
    stepValue?: number;
}

/** VideoAsset internal component state */
export interface IVideoAssetState {
    loaded: boolean;
}

/**
 * VideoPlayer internal video state
 */
export interface IVideoPlayerState {
    readyState: number;
    paused: boolean;
    seeking: boolean;
    currentTime: number;
    duration: number;
    playbackRate: number;
}



function mapStateToProps(state: IApplicationState) {
    return {
        customData: state.customData
    };
}

function mapDispatchToProps(dispatch) {
    return {
    };
}

/**
 * VideoAsset component used to display video based assets
 */
// @connect(mapStateToProps, mapDispatchToProps)
export class VideoAsset extends React.Component<IVideoAssetProps> {
    /** Default properties for the VideoAsset if not defined */
    public static defaultProps: IVideoAssetProps = {
        autoPlay: true,
        controlsEnabled: true,
        timestamp: null,
        asset: null,
        childAssets: [],
        stepValue: 1
    };
    private intervelId: NodeJS.Timeout;

    public state: IVideoAssetState = {
        loaded: false,
    };

    public getCurrentTime = (): number => {
        const play = this.getVideoPlayerState();
        return play.currentTime;
    }

    public videoPlayer: React.RefObject<Player> = React.createRef<Player>();
    private timelineElement: Element = null;

    private onProgress = (e) => {
        console.log('qqq onProgress', typeof e, console.log(e));
    }

    private onDuration = (e) => {
        console.log('qqq onDuration', e)
    }

    private onPlaying = (e) => {
        console.log('qqq onPlaying', e);
        if (this.intervelId) {
            clearInterval(this.intervelId);
        }
        // let prePlayerState = { currentTime: -1 };
        let currentTime = -1;
        let _currentTimes = 0;
        this.intervelId = setInterval(() => {
            const playerState = this.getVideoPlayerState();
            const newTime = playerState.currentTime;
            const playbackRate = playerState.playbackRate;
            if (currentTime !== newTime) {
                this.props.playerStateChange(newTime);
                currentTime = newTime;
                _currentTimes = 0;
            } else {
                _currentTimes += 1;
                this.props.playerStateChange(newTime + _currentTimes * 0.01 * playbackRate);
            }
            //     if (playerState.currentTime != prePlayerState.currentTime) {
            //     prePlayerState = playerState;
            // }
        }, 10);
    }
    private newShortcuts = [
        {
            keyCode: 32,
            ctrl: false,
            handle: () => { }
        },
        {
            keyCode: 37, // left arrow
            ctrl: false, // Ctrl/Cmd
            handle: () => { }
        },
        {
            keyCode: 38, // top arrow
            ctrl: false, // Ctrl/Cmd
            handle: () => { }
        },
        {
            keyCode: 39, // Right arrow
            ctrl: false, // Ctrl/Cmd
            handle: () => { }
        },
        {
            keyCode: 40, // down arrow
            ctrl: false, // Ctrl/Cmd
            handle: () => { }
        }
    ];


    public render() {
        const { autoPlay, asset } = this.props;
        let videoPath = asset.path;
        if (!autoPlay) {
            videoPath = `${asset.path}#t=5.0`;
        }

        return (
            <Player ref={this.videoPlayer}
                fluid={false}
                width="100%"
                height="100%"
                autoPlay={false}
                src={videoPath}
                onError={this.props.onError}
                onProgress={this.onProgress}
                onDurationChange={this.onDuration}
                onPlaying={this.onPlaying}
                crossOrigin="anonymous">
                <BigPlayButton position="center" />
                <Shortcut clickable={true} dblclickable={false} shortcuts={this.newShortcuts} />
                {autoPlay &&
                    <ControlBar autoHide={false} disableDefaultControls={false}>
                        {!this.props.controlsEnabled &&
                            <Fragment>
                                <div className="video-react-control-bar-disabled"></div>
                            </Fragment>
                        }
                        {/* <PlayToggle /> */}
                        <CustomVideoPlayerButton order={1.1}
                            accelerators={["ArrowLeft", "A", "a"]}
                            tooltip={strings.editorPage.videoPlayer.previousExpectedFrame.tooltip}
                            onClick={this.movePreviousExpectedFrame}
                            icon={"fa-caret-left fa-lg"}
                        >
                            <i className="fas fa-caret-left fa-lg" />
                        </CustomVideoPlayerButton>
                        <CustomVideoPlayerButton order={1.2}
                            accelerators={["ArrowRight", "D", "d"]}
                            tooltip={strings.editorPage.videoPlayer.nextExpectedFrame.tooltip}
                            onClick={this.moveNextExpectedFrame}
                            icon={"fa-caret-right fa-lg"}
                        >
                            <i className="fas fa-caret-right fa-lg" />
                        </CustomVideoPlayerButton>
                        <CurrentTimeDisplay order={1.5} />
                        <TimeDivider order={1.6} />
                        <PlaybackRateMenuButton rates={[5, 2, 1, 0.5, 0.25]} order={7.1} />
                        <VolumeMenuButton vertical enabled order={7.2} />
                        <FullscreenToggle disabled />
                        <CustomVideoPlayerButton order={8.1}
                            accelerators={["W", "w"]}
                            tooltip='第一个关键帧[W]'
                            onClick={this.moveFirstSameTrackIdFrame}
                            icon={"fa fa-angle-double-left"}
                        >
                            <i className="fa fa-angle-double-left"></i>
                        </CustomVideoPlayerButton>
                        <CustomVideoPlayerButton order={8.2}
                            accelerators={["Q", "q"]}
                            tooltip='上一个关键帧[Q]'
                            onClick={this.movePreviousSameTrackIdFrame}
                            icon={"fa fa-angle-left"}
                        >
                            <i className="fa fa-angle-left"></i>
                        </CustomVideoPlayerButton>
                        <CustomVideoPlayerButton order={8.3}
                            accelerators={["E", "e"]}
                            tooltip='下一个关键帧[E]'
                            onClick={this.moveNextSameTrackIdFrame}
                            icon={"fa fa-angle-right"}
                        >
                            <i className="fa fa-angle-right"></i>
                        </CustomVideoPlayerButton>
                        <CustomVideoPlayerButton order={8.4}
                            accelerators={["S", "s"]}
                            tooltip='最后一个关键帧[S]'
                            onClick={this.moveLastSameTrackIdFrame}
                            icon={"fa fa-angle-double-right"}
                        >
                            <i className="fa fa-angle-double-right"></i>
                        </CustomVideoPlayerButton>
                    </ControlBar>
                }
            </Player >
        );
    }

    public componentDidMount() {
        if (this.props.autoPlay) {
            // We only need to subscribe to state change notificeations if autoPlay
            // is true, otherwise the video is simply a preview on the side bar that
            // doesn't change
            this.videoPlayer.current.subscribeToStateChange(this.onVideoStateChange);
        }
        window.addEventListener('keyup', (e) => {
            e.preventDefault();
            switch (e.keyCode) {
                case 32:
                    // this.videoPlayer.current.play();
                    this.toggleVideoStatus()
                    break;
                default:
                    break;
            }
        });
    }

    private toggleVideoStatus = () => {
        const player = this.getVideoPlayerState();
        const paused = player.paused;
        if (paused) {
            this.videoPlayer.current.play();
        } else {
            this.videoPlayer.current.pause();
        }
    }

    public componentDidUpdate(prevProps: Readonly<IVideoAssetProps>) {
        if (this.props.asset.id !== prevProps.asset.id) {
            this.setState({ loaded: false });
        }

        // if (this.props.childAssets !== prevProps.childAssets) {
        //     this.addAssetTimelineTags(this.props.childAssets, this.getVideoPlayerState().duration);
        // }

        if (this.props.timestamp !== prevProps.timestamp) {
            console.log('test find,called here');
            this.seekToTime(this.props.timestamp);
        }
    }


    private _sort = (regions: any[]) => regions.sort((a, b) => {
        const { timestamp: aT } = a.asset;
        const { timestamp: bT } = b.asset;
        if (aT < bT) return -1;
        if (aT > bT) return 1;
        return 0;
    });


    /**
     * Move to current selected region first key fream
     */
    private moveFirstSameTrackIdFrame = () => {
        this.move('first');
    }

    /**
     * Move to current selected region previous key fream
     */
    private movePreviousSameTrackIdFrame = () => {
        this.move('previous');
    }

    /**
     * Move to current selected region next key fream
     */
    private moveNextSameTrackIdFrame = () => {
        this.move('next');
    }

    /**
     * Move to current selected region last key fream
     */
    private moveLastSameTrackIdFrame = () => {
        this.move('last');
    }

    private move(type: string) {
        if (this.props.customData.currentTrackId.length !== 1) return;
        const { trackId, id } = this.props.customData.currentTrackId[0];
        const regions = JSON.parse(JSON.stringify(this.props.customData.regions[trackId]));
        const sortedRegions = regions.sort((a, b) => {
            if (a.frameIndex < b.frameIndex) return -1;
            if (a.frameIndex > b.frameIndex) return 1;
            return 0;
        });
        const index = sortedRegions.findIndex(region => region.id === id);
        if (index === -1) return;
        const frameSkipTime: number = (1 / this.props.additionalSettings.videoSettings.frameExtractionRate);
        switch (type) {
            case 'first':
                this.seekToTime((sortedRegions[0].frameIndex - 1) * frameSkipTime);
                break;
            case 'previous':
                const p = this.findPrevious(sortedRegions, index);
                if (!p) return;
                this.seekToTime((p.frameIndex - 1) * frameSkipTime);
                break;
            case 'next':
                const n = this.findNext(sortedRegions, index);
                if (!n) return;
                this.seekToTime((n.frameIndex - 1) * frameSkipTime);
                break;
            case 'last':
                this.seekToTime(([...sortedRegions].pop().frameIndex - 1) * frameSkipTime);
                break;
            default:
                break;
        }
    }

    private findPrevious = (regions, index) => {
        if (regions[index - 1].keyFrame) {
            return regions[index - 1];
        }
        return this.findPrevious(regions, index - 1);
    }
    private findNext = (regions, index) => {
        if (regions[index + 1].keyFrame) {
            return regions[index + 1];
        }
        return this.findNext(regions, index + 1);
    }



    /**
     * Bound to the "Previous Tagged Frame" button
     * Seeks the user to the previous tagged video frame
     */
    private movePreviousTaggedFrame = () => {
        const currentTime = this.getVideoPlayerState().currentTime;
        const previousFrame = _
            .reverse(this.props.childAssets)
            .find((asset) => asset.state === AssetState.Tagged && asset.timestamp < currentTime);

        if (previousFrame) {
            console.log('test find,called here');
            this.seekToTime(previousFrame.timestamp);
        }
    }

    /**
     * Bound to the "Next Tagged Frame" button
     * Seeks the user to the next tagged video frame
     */
    private moveNextTaggedFrame = () => {
        const currentTime = this.getVideoPlayerState().currentTime;
        const nextFrame = this.props.childAssets
            .find((asset) => asset.state === AssetState.Tagged && asset.timestamp > currentTime);

        if (nextFrame) {
            console.log('test find,called here');
            this.seekToTime(nextFrame.timestamp);
        }
    }

    /**
     * Moves the videos current position forward one frame based on the current
     * project settings for frame rate extraction
     */
    private moveNextExpectedFrame = () => {
        const currentTime = this.getVideoPlayerState().currentTime;
        // Seek forward from the current time to the next logical frame based on project settings
        const frameSkipTime: number = (1 / this.props.additionalSettings.videoSettings.frameExtractionRate);
        const seekTime: number = currentTime + (frameSkipTime * this.props.stepValue);
        console.log('test find,called here');
        this.seekToTime(seekTime);
    }


    /**
     * Moves the videos current position backward one frame based on the current
     * project settings for frame rate extraction
     */
    private movePreviousExpectedFrame = () => {
        console.log('called here.....movePreviousExpectedFrame', this.props, this.state);
        const currentTime = this.getVideoPlayerState().currentTime;
        // Seek backwards from the current time to the next logical frame based on project settings
        const frameSkipTime: number = (1 / this.props.additionalSettings.videoSettings.frameExtractionRate);
        const seekTime: number = currentTime - (frameSkipTime * this.props.stepValue);
        console.log(seekTime, currentTime, frameSkipTime, '=========')
        console.log('test find,called here');
        this.seekToTime(seekTime);
    }

    /**
     * Seeks the current video to the passed in time stamp, pausing the video before hand
     * @param seekTime - Time (in seconds) in the video to seek to
     */
    private seekToTime = (seekTime: number) => {
        console.log(seekTime, 'showme seek time');
        const playerState = this.getVideoPlayerState();

        if (seekTime >= 0 && playerState.currentTime !== seekTime) {
            // Verifies if the seek operation should continue
            if (this.props.onBeforeAssetChanged) {
                if (!this.props.onBeforeAssetChanged()) {
                    return;
                }
            }

            // Before seeking, pause the video
            if (!playerState.paused) {
                this.videoPlayer.current.pause();
            }
            this.videoPlayer.current.seek(seekTime);
        }
    }

    private onVideoStateChange = (state: Readonly<IVideoPlayerState>, prev: Readonly<IVideoPlayerState>) => {
        if (state.paused) {
            if (this.intervelId) {
                clearInterval(this.intervelId);
            }
        }

        if (!this.state.loaded && state.readyState === 4 && state.readyState !== prev.readyState) {
            // Video initial load complete
            this.raiseLoaded();
            this.raiseActivated();
            this.videoStateChange('loaded');

            if (this.props.autoPlay) {
                // INFO: stop auto play
                // this.videoPlayer.current.play();
            }
        } else if (state.paused && (state.currentTime !== prev.currentTime || state.seeking !== prev.seeking)) {
            // Video is paused, make sure we are on a key frame, and if we are not, seek to that
            // before raising the child selected event
            if (this.isValidKeyFrame()) {
                this.raiseChildAssetSelected(state);
                this.raiseDeactivated();
                this.videoStateChange('pause');
                const playerState = this.getVideoPlayerState();
                this.props.playerStateChange(this.getCurrentTime());
            }
        } else if (!state.paused && state.paused !== prev.paused) {
            // Video has resumed playing
            this.raiseActivated();
            this.videoStateChange('play');
        }
    }

    private videoStateChange = (state: string) => {
        this.props.onVideoStateChange(state);
    }

    /**
     * Raises the "loaded" event if available
     */
    private raiseLoaded = () => {
        this.setState({
            loaded: true,
        }, () => {
            if (this.props.onLoaded) {
                this.props.onLoaded(this.videoPlayer.current.video.video);
            }

            // Once the video is loaded, add any asset timeline tags
            // this.addAssetTimelineTags(this.props.childAssets, this.getVideoPlayerState().duration);
        });
    }

    /**
     * Raises the "childAssetSelected" event if available
     */
    private raiseChildAssetSelected = (state: Readonly<IVideoPlayerState>) => {
        console.log('raiseChildAssetSelected')
        if (this.props.onChildAssetSelected) {
            const rootAsset = this.props.asset.parent || this.props.asset;
            const childPath = `${rootAsset.path}#t=${state.currentTime}`;
            const childAsset = AssetService.createAssetFromFilePath(childPath);
            childAsset.state = AssetState.NotVisited;
            childAsset.type = AssetType.VideoFrame;
            childAsset.parent = rootAsset;
            childAsset.timestamp = state.currentTime;
            childAsset.size = { ...this.props.asset.size };
            console.log(childAsset, 'childAsset')
            this.props.onChildAssetSelected(childAsset);
        }
    }

    /**
     * Raises the "activated" event if available
     */
    private raiseActivated = () => {
        if (this.props.onActivated) {
            this.props.onActivated(this.videoPlayer.current.video.video);
        }
    }

    /**
     * Raises the "deactivated event if available"
     */
    private raiseDeactivated = () => {
        if (this.props.onDeactivated) {
            this.props.onDeactivated(this.videoPlayer.current.video.video);
        }
    }

    /**
     * Move to the nearest key frame from where the video's current
     * position is
     * @returns true if moved to a new position; false otherwise
     */
    private isValidKeyFrame = (): boolean => {
        if (!this.props.additionalSettings) {
            return false;
        }

        const keyFrameTime = (1 / this.props.additionalSettings.videoSettings.frameExtractionRate);
        const timestamp = this.getVideoPlayerState().currentTime;

        // Calculate the nearest key frame
        const numberKeyFrames = Math.round(timestamp / keyFrameTime);
        const seekTime = +(numberKeyFrames * keyFrameTime).toFixed(6);

        // fix infinity loop
        const timegap = Math.abs(seekTime - timestamp);

        if (seekTime !== timestamp && timegap >= 0.001) {
            console.log('showme called here...keyFrameTime', keyFrameTime)
            console.log('showme called here...timestamp', timestamp)
            console.log('showme called here...numberKeyFrames', numberKeyFrames)
            console.log('showme called here...seekTime', seekTime)
            this.seekToTime(seekTime);
        }
        console.log(timestamp, seekTime, numberKeyFrames, 'seekTime')
        return seekTime === timestamp || timegap < 0.001;
    }

    /**
     * Draws small lines to show where visited and tagged frames are on
     * the video line
     * @param childAssets - Array of child assets in the video
     * @param videoDuration - Length (in seconds) of the video
     */
    private addAssetTimelineTags = (childAssets: any[], videoDuration: number) => {
        if (!this.props.autoPlay) {
            return;
        }

        const assetTimelineTagLines = this.renderTimeline(childAssets, videoDuration);
        const timelineSelector = ".editor-page-content-main-body .video-react-progress-control .video-timeline-root";
        this.timelineElement = document.querySelector(timelineSelector);

        if (!this.timelineElement) {
            const progressControlSelector = ".editor-page-content-main-body .video-react-progress-control";
            const progressHolderElement = document.querySelector(progressControlSelector);

            // If we found an element to hold the tags, add them to it
            if (progressHolderElement) {
                this.timelineElement = document.createElement("div");
                this.timelineElement.className = "video-timeline-root";
                progressHolderElement.appendChild(this.timelineElement);
            }
        }

        if (this.timelineElement) {
            // Render the child asset elements to the dom
            ReactDOM.render(assetTimelineTagLines, this.timelineElement);
        }
    }

    /**
     * Renders the timeline markers for the specified child assets
     * @param childAssets - Array of child assets in the video
     * @param videoDuration - Length (in seconds) of the video
     */
    private renderTimeline = (childAssets: IAsset[], videoDuration: number) => {
        return (
            <div className={"video-timeline-container"}>
                {/* {childAssets.map((childAsset) => this.renderChildAssetMarker(childAsset, videoDuration))} */}
            </div>
        );
    }

    /**
     * Renders a timeline marker for the specified child asset
     * @param childAsset The child asset to render
     * @param videoDuration The total video duration
     */
    private renderChildAssetMarker = (childAsset: IAsset, videoDuration: number) => {
        const className = childAsset.state === AssetState.Tagged ? "video-timeline-tagged" : "video-timeline-visited";
        const childPosition: number = (childAsset.timestamp / videoDuration);
        const style = { left: `${childPosition * 100}%` };

        return (
            <div key={childAsset.timestamp}
                onClick={() => this.seekToTime(childAsset.timestamp)}
                className={className}
                style={style} />
        );
    }

    /**
     * Gets the current video player state
     */
    private getVideoPlayerState = (): Readonly<IVideoPlayerState> => {
        return this.videoPlayer.current.getState().player;
    }
}
