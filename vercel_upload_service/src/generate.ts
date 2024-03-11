export const generate = () => {
    const subset = '1234567890abcdefghijklmnopqrstuvwxyz';
    const length = 5;
    let id = '';

    for(let i=0;i<length;i++) {
        id += subset[Math.floor(Math.random() * subset.length)];
    }

    return id;
}