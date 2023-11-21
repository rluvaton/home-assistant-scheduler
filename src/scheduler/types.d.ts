export interface Task {
    id: number;
    actions: unknown[];

    // UTC timestamp in milliseconds
    execution_date: number;

    finished: boolean;
    executed: boolean;
    failed: boolean;
}
