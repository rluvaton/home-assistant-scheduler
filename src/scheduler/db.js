import Knex from "knex";

import config from "../../knexfile.js";

export const knex = Knex(config[process.env.NODE_ENV || "development"]);
