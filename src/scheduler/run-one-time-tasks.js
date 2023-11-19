import {getFetcher} from "./fetcher.js";
import {execute} from "./executer.js";
import {initConnection} from "./connection.js";
import {markTaskAsFinished} from "./one-time-task.js";

await initConnection();

// TODO - for the dashboard, we need to save it, or maybe have a list of currently pending tasks

getFetcher()
    .map(async (task) => {
        try {
            await execute(task);

            return {
                task,
                error: null
            }
        } catch (err) {
            // Must not rethrow an error, otherwise it will stop the stream
            // TODO - WE SHOULD DIFFERENTIATE BETWEEN DB ERRORS AND OTHER ERRORS, db errors should be retried, other errors should not
            // TODO - should retry until it reaches a maximum number of retries? or should it just log the error and mark as no longer retry?
            console.error("Error executing task", err);

            return {
                task,
                error: err
            }
        }
    }, {concurrency: 10_000})
    .map(async ({task, error}) => {
        try {
            await markTaskAsFinished(task.id, !!error);
        } catch (err) {
            // Must not rethrow an error, otherwise it will stop the stream
            // TODO - save locally and retry later
            // TODO - should retry until it reaches a maximum number of retries? or should it just log the error and mark as no longer retry?
            console.error("Error marking task as finished", err);
        }
    });

// TODO - consume the stream



// TODO - add support for auto disable recurrent tasks
