import {setTimeout as sleep} from "node:timers/promises";
import {Readable} from "node:stream";
import {getPendingTasks} from "./one-time-task.js";

let fetcher

export function getFetcher() {
    if (!fetcher) {
        fetcher = Readable.from((async function* fetch() {
            while (true) {
                const tasksToExecute = await getPendingTasks();

                for (const task of tasksToExecute) {
                    yield task;
                }

                // TODO - should allow to exit without waiting for the sleep
                await sleep(1000);
            }
        })())
    }

    return fetcher;
}
