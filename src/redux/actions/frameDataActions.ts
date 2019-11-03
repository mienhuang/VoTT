import { Action, Dispatch } from "redux";
import { ActionTypes } from './actionTypes';
import {
    IFrameData, IRegion
} from "../../models/applicationState";


export default interface ICustomDataActions {
    initFrameData(frameData: IFrameData): void;
    updateFrame(frame: string, regions: IRegion[]): void;
    updateFrames(frames: any): void;
}

export function initFrameData(frameData: IFrameData) {
    return (dispatch: Dispatch) => {
        dispatch({
            type: ActionTypes.INIT_FRAME_DATA,
            payload: frameData
        })
    }
}


export function updateFrame(frame: string, regions: IRegion[]) {
    return (dispatch: Dispatch) => {
        dispatch({
            type: ActionTypes.UPDATE_FRAME,
            payload: { frame, regions }
        })
    }
}

export function updateFrames(frames: any) {
    return (dispatch: Dispatch) => {
        dispatch({
            type: ActionTypes.UPDATE_FRAMES,
            payload: frames
        })
    }
}
