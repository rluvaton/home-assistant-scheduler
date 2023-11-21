// https://community.home-assistant.io/t/persistent-storage-in-addons/463458

import {knex} from "./db.js";

export function getPendingTasks() {
    return knex("one-time")
        .where("finished", false)
        .andWhereRaw("execution_date < now()");
}

export async function markTaskAsFinished(id, failed) {
    await knex("one-time")
        .where("id", id)
        .update({
            finished: true,
            executed: !failed,
            failed: !!failed
        });
}

export async function addTask({actions, dateToRun}) {
    return await knex("one-time").insert({
        actions,
        execution_date: dateToRun,

        finished: false,
        executed: null,
        failed: null
    }).returning("*");
}
