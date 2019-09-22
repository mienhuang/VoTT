import { Action, Dispatch } from "redux";
import { createAction, createPayloadAction, IPayloadAction } from "./actionCreators";
import { ActionTypes } from './actionTypes';
import {
    ICustomData
} from "../../models/applicationState";


export default interface ICustomDataActions {
    initCustomData(customData: ICustomData): void;
    updateRegion(region): void;
    increase(max): Promise<void>;
    decrease(max): Promise<void>;
    updateCurrentTrackId(ids: {trackId: number, id: string}[]): void;
}


/**
 * init custom data
 */
export function initCustomData(customData: ICustomData) {
    return (dispatch: Dispatch) => {
        dispatch({
            type: ActionTypes.INIT_CUSTOM_DATA,
            payload: customData
        })
    }
}


/**
 * update regions
 */
 export function updateRegion(region) {
     return (dispatch: Dispatch) => {
         dispatch({
            type: ActionTypes.UPDATE_REGION,
            payload: region
         });
     }
 }

 export function updateCurrentTrackId(ids: number[]) {
     return (dispatch: Dispatch) => {
        dispatch({
           type: ActionTypes.UPDATE_CURRENT_TRACK_ID,
           payload: ids
        });
    }
 }


 export function increase(max: number): (dispatch: Dispatch) => Promise<void> {
     return (dispatch: Dispatch) => {
         dispatch({
             type: ActionTypes.INCREASE_MAX_TRACK_ID,
             payload: max
         });
         return Promise.resolve();
     }
 }

 export function decrease(max: number): (dispatch: Dispatch) => Promise<void> {
    return (dispatch: Dispatch) => {
        dispatch({
            type: ActionTypes.DECREASE_MAX_TRACK_ID,
            payload: max
        });
        return Promise.resolve();
    }
}

 






