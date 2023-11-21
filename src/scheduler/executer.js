import {getConnection} from "./connection.js";

export async function execute(task) {
    console.log(`Executing task ${task.id}`);

    await executeActions(task.actions);

    // TODO - add to logbook
}

let connection;
let auth;

export async function executeActions(actions) {
    // Got from here: https://github.com/home-assistant/home-assistant-js-websocket/issues/421#issuecomment-1763810866
    // return getConnection().sendMessagePromise({
    //     // execute_script is what the UI use when clicking run in Automation editor for actions
    //     type: "execute_script",
    //     sequence: actions
    // })
}

