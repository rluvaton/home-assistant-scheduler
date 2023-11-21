/**
 * Create a web socket connection with a Home Assistant instance.
 */
import {WebSocket} from "ws";
import {
    createConnection,
    ERR_CANNOT_CONNECT,
    ERR_INVALID_AUTH,
} from "home-assistant-js-websocket";

const atLeastHaVersion = (version, major, minor, patch) => {
    const [haMajor, haMinor, haPatch] = version.split(".", 3);
    return (Number(haMajor) > major ||
        (Number(haMajor) === major &&
            (patch === undefined
                ? Number(haMinor) >= minor
                : Number(haMinor) > minor)) ||
        (patch !== undefined &&
            Number(haMajor) === major &&
            Number(haMinor) === minor &&
            Number(haPatch) >= patch));
};

export const MSG_TYPE_AUTH_REQUIRED = "auth_required";
export const MSG_TYPE_AUTH_INVALID = "auth_invalid";
export const MSG_TYPE_AUTH_OK = "auth_ok";

// The URL come from https://developers.home-assistant.io/docs/add-ons/communication#home-assistant-core
const URL = 'ws://supervisor/core/websocket';
// TODO - use pino
process.env.DEBUG = process.env.DEBUG || true;

/**
 * @return {Promise<WebSocket>}
 */
export function createSocket() {
    if (process.env.DEBUG) {
        console.log("[Auth phase] Initializing", URL);
    }

    return new Promise((resolve, reject) => connect(3, resolve, reject));
}

function connect(triesLeft, resolve, reject) {
    // From https://developers.home-assistant.io/docs/api/websocket/
    if (process.env.DEBUG) {
        console.log("[Auth Phase] New connection", URL);
    }
    const socket = new WebSocket(URL);
    const closeMessage = async () => {

        // If we are in error handler make sure close handler doesn't also fire.
        socket.removeEventListener("close", closeMessage);
        // Reject if we no longer have to retry
        if (triesLeft === 0) {
            // We were never connected and will not retry
            const error = new Error('Cannot connect, tries left is 0');
            error.code = ERR_CANNOT_CONNECT;
            reject(error);
            return;
        }
        const newTries = triesLeft === -1 ? -1 : triesLeft - 1;
        // Try again in a second
        setTimeout(() => connect(newTries, resolve, reject), 1000);
    };

    let invalidAuth = false;
    // Auth is mandatory, so we can send the auth message right away.
    const handleOpen = async (event) => {
        try {
            socket.send(JSON.stringify({
                type: "auth",

                // https://developers.home-assistant.io/docs/add-ons/communication#home-assistant-core
                access_token: process.env.SUPERVISOR_TOKEN
            }));
        } catch (err) {
            // Refresh token failed
            invalidAuth = err === ERR_INVALID_AUTH;
            socket.close();
        }
    };
    const handleMessage = async (event) => {
        const message = JSON.parse(event.data);
        if (process.env.DEBUG) {
            console.log("[Auth phase] Received", message);
        }
        switch (message.type) {
            case MSG_TYPE_AUTH_INVALID:
                invalidAuth = true;
                socket.close();
                break;
            case MSG_TYPE_AUTH_OK:
                socket.removeEventListener("open", handleOpen);
                socket.removeEventListener("message", handleMessage);
                socket.removeEventListener("close", closeMessage);
                socket.removeEventListener("error", closeMessage);
                socket.haVersion = message.ha_version;
                if (atLeastHaVersion(socket.haVersion, 2022, 9)) {
                    socket.send(JSON.stringify({
                        type: "supported_features",
                        id: 1,
                        features: {
                            coalesce_messages: 1
                        },
                    }));
                }

                resolve(socket);
                break;
            default:
                if (process.env.DEBUG) {
                    // We already send response to this message when socket opens
                    if (message.type !== MSG_TYPE_AUTH_REQUIRED) {
                        console.warn("[Auth phase] Unhandled message", message);
                    }
                }
        }
    };
    socket.addEventListener("open", handleOpen);
    socket.addEventListener("message", handleMessage);
    socket.addEventListener("close", closeMessage);
    socket.addEventListener("error", closeMessage);
}


/**
 * @type {Connection}
 */
let connection;

export async function initConnection() {
    try {
        connection = await createConnection({createSocket});
        for (const eventName of ["disconnected", "ready", "reconnect-error"]) {
            connection.addEventListener(eventName, () => console.log(`Event: ${ev}`));
        }
    } catch (e) {
        console.error('Failed to connect', {e});
        process.exit(1);
    }
}

export function getConnection() {
    if (!connection) {
        throw new Error('Should call init first, not initialized');
    }

    if (!connection.connected) {
        throw new Error('Home Assistant connection is not connected');
    }
    return connection;
}
