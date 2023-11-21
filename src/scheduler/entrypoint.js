import {runApi, runOneTimeTasks} from "./index.js";

await Promise.all([
    runApi(),
    runOneTimeTasks()
]);
