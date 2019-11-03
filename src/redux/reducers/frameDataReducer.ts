
import { ActionTypes } from "../actions/actionTypes";
import { ICustomData, IFileInfo, IFrameData } from '../../models/applicationState';


const _sort = (data: number[]) => [...data].sort((a, b) => {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
})
/**
 * Reducer for custom data. Actions handled:
 */
export const reducer = (state: IFrameData = { frames: {}, framerate: '', inputTags: '', suggestiontype: '', scd: false, visitedFrames: [], tag_colors: [] }, action: any): IFrameData => {
    const newState = JSON.parse(JSON.stringify(state)) as IFrameData;
    const payload = action.payload;
    switch (action.type) {
        case ActionTypes.INIT_FRAME_DATA:
            return payload;
        case ActionTypes.UPDATE_FRAMES:
            newState.frames = JSON.parse(JSON.stringify(payload));
            return newState;
        default:
            return newState;
    }
};
