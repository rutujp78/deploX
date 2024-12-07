import { Request, Response } from 'express';
import { pgPool } from '../utils/initPostgres';

export const logs = async (req: Request, res: Response) => {
    try {
        const project_id = req.params.project_id;
        const query = `SELECT event_id, project_id, log, timestamps from log_events where project_id = $1 order by timestamps`;
        const values = [project_id];
        const result = await pgPool.query(query, values);
        const logs = result.rows;

        return res.status(200).json({ logs: logs });
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
    }
};