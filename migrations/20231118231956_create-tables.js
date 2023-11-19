/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    if(await knex.schema.hasTable("one-time")) {
        return;
    }

    await knex.schema.createTable("one-time", (table) => {
        table.increments("id");
        table.json("actions").notNullable();
        table.dateTime("execution_date").notNullable();
        table.boolean("finished").notNullable();
        table.boolean("executed");
        table.boolean("failed");
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    if(!(await knex.schema.hasTable("one-time"))) {
        return;
    }

    await knex.schema.dropTable("one-time");
}
