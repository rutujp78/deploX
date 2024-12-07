export const getRepoSize = async (repoUrl: string) => {
    // get the size of repo
    const { pathname } = new URL(repoUrl);
    // console.log("pathname: " + pathname);
    const [owner, repo] = pathname.split('/').slice(1);
    // console.log("ownerRepo: " + owner + repo);

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const options = {
        headers: {
            'User-Agent': 'node.js',
            'Accept': 'application/vnd.github.v3+json',
        }
    };

    const response = await fetch(apiUrl, options);

    if (!response.ok) {
        // throw new Error(`HTTP error! Status: ${response.status}`);
        throw new Error('Unable to fetch repository details');
    }

    const repoData = await response.json();
    //console.log('Repository details:', repoData);

    const sizeInKilobytes = repoData.size;
    const sizeInMegabytes = sizeInKilobytes / 1024;

    console.log(`Repository size: ${sizeInMegabytes} MB`);

    return sizeInMegabytes;
}