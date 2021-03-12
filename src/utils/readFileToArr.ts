 let fs = require('fs');
let readline = require('readline');

export function readFileToArr(fReadName:string) {
    return new Promise( resolve =>{
        let fRead = fs.createReadStream(fReadName);
        let objReadline = readline.createInterface({ input: fRead });
        let arr = new Array();
        objReadline.on('line', ( line:string ) => { arr.push(line); });
        objReadline.on('close',() =>{ resolve(arr);});
    });
}
