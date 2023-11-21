// https://community.home-assistant.io/t/persistent-storage-in-addons/463458

import {knex} from "./db.js";

/**
 *
 * @param {knex.QueryBuilder} query
 * @return {Task[]}
 */
async function getTasks(query) {
    const result = await query;

    return result.map(item => ({
        ...item,
        // must parse as sqlite client does not convert it automatically
        actions: JSON.parse(item.actions)
    }));
}

/**
 *
 * @return {Promise<Task[]>}
 */
export async function getTasksReadyToExecute() {
    return getTasks(
        knex("one-time")
            .where("finished", false)
            .andWhereRaw("execution_date <= unixEpoch() * 1000")
    );
}

/**
 *
 * @return {Promise<Task[]>}
 */
export async function getFutureTasks() {
    return getTasks(
        knex("one-time")
            .where("finished", false)
            .andWhereRaw("execution_date > unixEpoch() * 1000")
    );
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

/**
 *
 * @param {unknown[]} actions
 * @param {number} msToAdd
 * @return {Promise<Task>}
 */
export async function addTask({actions, msToAdd}) {
    return (await knex("one-time").insert({
        // must stringify as sqlite client does not convert it automatically
        actions: JSON.stringify(actions),
        execution_date: knex.raw(`unixEpoch() * 1000 + ${msToAdd}`),

        finished: false,
        executed: null,
        failed: null
    }).returning("*"))[0];
}

