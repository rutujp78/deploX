import React, { useCallback, useEffect, useRef } from 'react'
import { useState } from 'react';
import { io } from 'socket.io-client';
import './landing.css';
import axios from 'axios';

interface EnvVar {
    name: string;
    value: string;
}

const socket = io("http://localhost:9001");

const Landing = () => {
    const [gitRepoUrl, setgitRepoUrl] = useState<string>('');
    const [uploadId, setUploadId] = useState<string>('');
    const [envVars, setEnvVars] = useState<EnvVar[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [logs, setLogs] = useState<string[]>([]);

    const logContainerRef = useRef<HTMLElement>(null);

    const backendUrl = 'http://localhost:3000';

    const handleEnvVarAdd = () => {
        setEnvVars([...envVars, { name: '', value: '' }]); // Add an empty EnvVar object
    };

    const handleEnvVarChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const updatedEnvVars = [...envVars];
        updatedEnvVars[index] = { ...updatedEnvVars[index] }; // Clone object
        if (e.target.name === 'name') updatedEnvVars[index].name = e.target.value.trim();
        else if (e.target.name === 'value') updatedEnvVars[index].value = e.target.value.trim();
        setEnvVars(updatedEnvVars);
    };

    const isValidUrl: [boolean, string | null] = (() => {
        if(!gitRepoUrl || gitRepoUrl.trim() === '') return [false, null];
        const regex = new RegExp(
            /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/)?$/
        );
        return [regex.test(gitRepoUrl), "Enter valid Github Repository URL"];
    })();

    // dont know why but using useCallback didnt opening multiple websocket connection request, mejik ;)
    const handleBtn = useCallback(async () => {
        setLoading(true);

        const formattedEnvVars: string[] = envVars.map((varString) => {
            const { name, value } = varString;
            return `${name} ${value}`;
        });

        const res = await axios.post(`${backendUrl}/deploy`, {
            repoUrl: gitRepoUrl,
            env: formattedEnvVars,
        });

        const newUploadId: string = res.data.id;
        setUploadId(newUploadId);

        console.log(`Subscribing to logs:${newUploadId}`);
        socket.emit('subscribe', `logs:${newUploadId}`);
    }, [gitRepoUrl, envVars]);

    const handleSocketIncomingMsg = useCallback((msg: string) => {
        const log = msg;
        setLogs((prev) => [...prev, log]);
        logContainerRef.current?.scrollIntoView({ behavior: 'smooth'});
        if(log === 'Deployed project') {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
      socket.on('message', handleSocketIncomingMsg);
    
      return () => {
        socket.off('message', handleSocketIncomingMsg);
      }
    }, [handleSocketIncomingMsg]);
    

    return (
        <main>
            <div className='card'>
                <div className="card-header">
                    <h3 className='card-title'>Deploy your Github Repository</h3>
                    <p className='card-description'>Enter the URL of your Github repository to deploy it.</p>
                </div>

                <div className="card-content">
                    <div className="card-content-inner1">
                        <div className="card-content-inner2">
                            <label className="label" htmlFor="gitrepoInput">GitHub Repository URL</label>
                            <input className='input' type="text" name='gitrepoInput' onChange={(e) => setgitRepoUrl(e.target.value)} placeholder='ex: https://github.com/user/projexX' />

                            {/* .env variable inputs */}
                            <h2>Environment Variables</h2>
                            {envVars.map((varString, index) => (
                                <div key={index} className="env-var-input">
                                    <div className="sn1">
                                        <label htmlFor="name">Variable Name</label>
                                        <input
                                            className='input'
                                            type="text"
                                            name='name'
                                            placeholder={`MY_VAR`}
                                            value={varString.name}
                                            onChange={(e) => handleEnvVarChange(index, e)}
                                        />

                                    </div>
                                    <div className="sn2">
                                        <label htmlFor="value">Value</label>
                                        <input
                                            className='input'
                                            type="password"
                                            name='value'
                                            placeholder="Variable Value"
                                            value={varString.value}
                                            onChange={(e) => handleEnvVarChange(index, e)}
                                        />

                                    </div>
                                </div>
                            ))}
                            <button className='button button-primary' onClick={handleEnvVarAdd}>
                                + Add Variable
                            </button>
                            <button
                                onClick={handleBtn}
                                disabled={!isValidUrl[0] || loading}
                                className='button'
                                type='submit'
                            >
                                {loading ? `Deploying (${uploadId})` : "Deploy"}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {uploadId && (
                <div className="previewLink">
                    <p>Preview URL:{" "}
                        <a 
                            target='_blank'
                            href={`http://${uploadId}.localhost:3001`}
                        >
                            {`http://${uploadId}.localhost:3001`}
                        </a>
                    </p>
                </div>
            )}
            {logs.length > 0 && (
                <div className="logsContainer">
                    <pre className="preFormat">
                        {logs.map((log, i) => (
                            <code
                                ref={logs.length - 1 === i ? logContainerRef : undefined}
                                key={i}
                            >{`> ${log}`}
                            </code>
                        ))}
                    </pre>
                </div>
            )}
        </main>
    )
}

export default Landing;