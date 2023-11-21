import {getFetcher} from "./fetcher.js";
import {execute} from "./executer.js";
import {initConnection} from "./connection.js";
import {markTaskAsFinished} from "./one-time-task.js";

export async function run(abortSignal) {
    await initConnection();

    // TODO - for the dashboard, we need to save it, or maybe have a list of currently pending tasks

    // Infinite stream of tasks that are ready to be executed
    await getFetcher(abortSignal)
        // Each mapper here MUST NEVER THROW AN ERROR, otherwise it will stop the stream
        //

        // Large concurrency because we want to execute as many tasks as possible as some executing can be to wait for a week or more
        // When we gonna need an actual solution for this we can avoid waiting for response for example
        .map(executeTask, {concurrency: 10_000})
        .map(safeMarkTaskAsFinished)
        .drop(Infinity)
        .toArray();
}

async function executeTask(task) {
    try {
        await execute(task);

        return {
            task,
            error: null
        }
    } catch (err) {
        // TODO - WE SHOULD DIFFERENTIATE BETWEEN DB ERRORS AND OTHER ERRORS, db errors should be retried, other errors should not
        // TODO - should retry until it reaches a maximum number of retries? or should it just log the error and mark as no longer retry?
        console.error("Error executing task", err);

        return {
            task,
            error: err
        }
    }
}

async function safeMarkTaskAsFinished({task, error}) {
    try {
        await markTaskAsFinished(task.id, !!error);
    } catch (err) {
        // TODO - save locally and retry later
        // TODO - should retry until it reaches a maximum number of retries? or should it just log the error and mark as no longer retry?
        console.error("Error marking task as finished", err);
    }
}

// TODO - add support for auto disable recurrent tasks
