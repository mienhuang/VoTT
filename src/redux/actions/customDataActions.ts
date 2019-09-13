import { Action, Dispatch } from "redux";
import { createAction, createPayloadAction, IPayloadAction } from "./actionCreators";
import { ActionTypes } from './actionTypes';
import {
    ICustomData
} from "../../models/applicationState";


export default interface ICustomDataActions {
    initCustomData(customData: ICustomData): void;
    updateRegion(region): void;
    increase(max): void;
    decrease(max): void;
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


 export function increase(max: number) {
     return (dispatch: Dispatch) => {
         dispatch({
             type: ActionTypes.INCREASE_MAX_TRACK_ID,
             payload: max
         });
     }
 }

 export function decrease(max: number) {
    return (dispatch: Dispatch) => {
        dispatch({
            type: ActionTypes.DECREASE_MAX_TRACK_ID,
            payload: max
        });
    }
}

 






