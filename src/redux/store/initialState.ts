import { IApplicationState } from "../../models/applicationState";

/**
 * Initial state of application
 * @member appSettings - Application settings
 * @member connections - Connections
 * @member recentProjects - Recent projects
 * @member currentProject - Current project
 */
const initialState: IApplicationState = {
    appSettings: {
        devToolsEnabled: false,
        securityTokens: [],
    },
    connections: [],
    recentProjects: [],
    currentProject: null,
    appError: null,
    customData: { maxTrackId: 0, regions: {}, maxTrackIdList: [0], currentTrackId: [] },
    frameData: { frames: {}, framerate: '', inputTags: '', suggestiontype: '', scd: false, visitedFrames: [], tag_colors: [] }
};


/**
 * Instance of initial application state
 */
export default initialState;
