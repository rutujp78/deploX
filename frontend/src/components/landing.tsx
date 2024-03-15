import React from 'react'
import { useState } from 'react';
import './landing.css';
import axios from 'axios';

interface EnvVar {
    name: string;
    value: string;
}

const Landing = () => {
    const [gitRepoUrl, setgitRepoUrl] = useState<string>('');
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadId, setUploadId] = useState<string>('');
    const [deployed, setDeployed] = useState<boolean>(false);
    const [envVars, setEnvVars] = useState<EnvVar[]>([]);

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

    const handleBtn = async () => {
        setUploading(true);

        const formattedEnvVars: string[] = envVars.map((varString) => {
            const { name, value } = varString; // Destructure directly
            return `${name} ${value}`;
        });

        const res = await axios.post(`${backendUrl}/deploy`, {
            repoUrl: gitRepoUrl,
            env: formattedEnvVars,
        });
        //   console.log(res.data.id);
        setUploadId(res.data.id);
        setUploading(false);

        const interval = setInterval(async () => {
            const getProjectStatus = await axios.get(`${backendUrl}/status?id=${res.data.id}`);

            if (getProjectStatus.data.status === 'Deployed') {
                clearInterval(interval);
                setDeployed(true);
            }
        }, 3000);
    }

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
                                            value={varString.name} // Access name directly
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
                                            value={varString.value} // Access value directly
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
                                disabled={uploadId !== '' || uploading}
                                className='button'
                                type='submit'
                            >
                                {uploadId ? `Deploying (${uploadId})` : uploading ? 'Uploading' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {deployed &&
                <div className="card">
                    <div className="card-header">
                        <h3 className='card-title'>Deployment Status</h3>
                        <p className='card-description'>Your website is successfully deployed!</p>
                    </div>

                    <div className="card-content">
                        <div className="card-content-inner2">
                            <label htmlFor="deployedGitrepoInput">Deployed URL</label>
                            <input className='input' type="text" name='gitrepoInput' value={`http://${uploadId}.localhost:3000`} readOnly={true} />
                        </div>
                        <br />
                        <button
                            className='button button-secondary'
                        >
                            <a href={`http://${uploadId}.localhost:3001`} target="_blank">
                                Visit Website
                            </a>
                        </button>
                    </div>
                </div>
            }
        </main>
    )
}

export default Landing;