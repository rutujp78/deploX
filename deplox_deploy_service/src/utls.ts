import child_process from 'child_process';
import path from 'path';
import producer from './index';

async function publishLog(projectId: string, log: string) {
    await producer.send({
        topic: 'logs',
        messages: [
            { key: 'log', value: JSON.stringify({ project_id: projectId, log }) },
        ],
    });
}

export function buildProject(id: string) {
    return new Promise((resolve) => {
        
        // Hard coded, attacker can hijack and make a huge mess and i am not even kidding
        const command = `cd ${path.join(__dirname, 'output', id)} && npm install --force && npm run build`;
        // console.log(typeof command, process.env.COMMAND);
        const child = child_process.exec(command);

        child.stdout?.on('data', function (data) {
            publishLog(id, data.toString());
            console.log(data);
        });
        child.stderr?.on('error', function(data) {
            publishLog(id, data.toString());
            console.log('Error', data);
        });
        child.on('close', function() {
            console.log("Build complete have fn");
            resolve('');
        });
    })
}