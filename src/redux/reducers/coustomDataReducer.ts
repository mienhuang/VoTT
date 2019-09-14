
import { ActionTypes } from "../actions/actionTypes";
import { ICustomData } from '../../models/applicationState';


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
export const reducer = (state: ICustomData = { maxTrackId: 0, regions: {}, maxTrackIdList: [], currentTrackId: [] }, action: any): any => {
    const newState = JSON.parse(JSON.stringify(state)) as ICustomData;
    const currentMaxTrackIdList = newState.maxTrackIdList;
    const payload = action.payload;
    switch (action.type) {
        case ActionTypes.INIT_CUSTOM_DATA:
            return payload;
        case ActionTypes.UPDATE_REGION:
            break;
        case ActionTypes.UPDATE_CURRENT_TRACK_ID:
            newState.currentTrackId = [...payload];
            return newState;
        case ActionTypes.INCREASE_MAX_TRACK_ID:
            const inRegions = newState.regions[payload.trackId] || [];
            const inIndex = inRegions.findIndex((region) => {
                return region.id === payload.id;
            });
            const newInRegions = { ...newState.regions };
            if (inIndex !== -1) {
                inRegions.splice(inIndex, 1);
            }
            newInRegions[payload.trackId] = [...inRegions, payload.region];
            const removeSame = new Set([...currentMaxTrackIdList, Number(payload.trackId)])
            const newList = _sort([...removeSame]);
            return {
                regions: { ...newInRegions },
                maxTrackId: [...newList].pop(),
                maxTrackIdList: newList
            }
        case ActionTypes.DECREASE_MAX_TRACK_ID:
            const deRegions = [...(newState.regions[payload.trackId] || [])];
            const deIndex = deRegions.findIndex((region) => {
                return region.id === payload.id;
            });
            const newDeRegions = { ...newState.regions };
            if (deIndex !== -1) {
                deRegions.splice(deIndex, 1);
            }
            newDeRegions[payload.trackId] = [...deRegions];
            if (deRegions.length === 0) {
                const listIndex = [...currentMaxTrackIdList].findIndex((id: number) => id === payload.trackId);
                if (listIndex != -1) {
                    currentMaxTrackIdList.splice(listIndex, 1);
                }
            }
            return {
                regions: { ...newDeRegions },
                maxTrackId: [...currentMaxTrackIdList].pop(),
                maxTrackIdList: [...currentMaxTrackIdList]
            }

        default:
            return newState;
    }
};
