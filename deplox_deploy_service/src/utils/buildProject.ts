import child_process from 'child_process';
import path from 'path';
import { publishLog } from './publishLog';

export function buildProject(projectId: string) {
    return new Promise((resolve) => {
        
        const command = `cd ${path.join(__dirname, '..', 'output', projectId)} && npm install --force && npm run build`;
        // console.log(typeof command, process.env.COMMAND);
        console.log(command);
        const child = child_process.exec(command);

        child.stdout?.on('data', async function (data) {
            await publishLog(projectId, data.toString());
            console.log(data);
        });
        child.stderr?.on('error', async function(data) {
            await publishLog(projectId, data.toString());
            console.log('Error', data);
        });
        child.on('close', async function() {
            console.log("Build complete have fun");
            await publishLog(projectId, 'Build complete');
            resolve('');
        });
    })
}