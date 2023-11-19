import {addTask, getPendingTasks} from "./one-time-task.js";

/**
 *
 * @param {{hours: number, minutes: number, seconds: number}} runIn
 * @param actions
 */
export async function save({runIn, actions}) {
    const msToAdd = runIn.hours * 60 * 60 * 1000 + runIn.minutes * 60 * 1000 + runIn.seconds * 1000;

    await addTask({
        actions,
        dateToRun: new Date(Date.now() + msToAdd)
    });
}


export async function getTasks() {
    const data = await getPendingTasks();

    return data.map(({id, actions, execution_date: executionDate}) => ({
            id,
            actions,
            executionDate
        })
    );
}
