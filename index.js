#! /usr/bin/env node

var program = require('commander');
var ffmpeg = require('ffmpeg-static');
var righto = require('righto');
var path = require('path');
var fs = require('fs');
var { spawn } = require('child_process');

program
  .option('-i, --input <path>', 'Input file')
  .option('-vf, --vectorFile <path>', 'vector file')
  .option('-o, --output <path>', 'Output file');

program.parse(process.argv)

function cmd(target, argsString, callback){
    var args = argsString.split(' ')
    var child = spawn(target, args)
    var errorOutput = '';
    var dataOutput = '';

    child.stdout.on('data', (data) => {
        process.stdout.write(data)
        dataOutput += data.toString();
    });

    child.stderr.on('data', (data) => {
        process.stderr.write(data)
        errorOutput += data.toString();
    });

    child.on('close', (code) => {
        if(code){
            return callback(errorOutput);
        }

        callback(null, dataOutput);
    });
}

function stabilize(program){
    var pathToFile = program.input;

    var outfile = program.output || `${path.dirname(pathToFile)}/${path.basename(pathToFile, path.extname(pathToFile))}-stable.MP4`;
    var vectorFilePath = program.vectorFile || `${pathToFile}-vectors.trf`;
    var vectorFileCreated = righto.handle(
        righto(fs.access, vectorFilePath),
        (error, done) => cmd(ffmpeg, `-i ${pathToFile} -vf vidstabdetect=stepsize=32:shakiness=10:accuracy=10:result=${vectorFilePath} -f null -`, done)
    ).get(()=>console.log('vectors done'))
    var stabilized = righto(cmd, ffmpeg, `-i ${pathToFile} -y -vf vidstabtransform=input=${vectorFilePath}:optzoom=2:interpol=bicubic:smoothing=10,unsharp=5:5:0.8:3:3:0.4 -vcodec libx264 -tune film -an ${outfile}`, righto.after(vectorFileCreated))

    stabilized(console.log)
}

stabilize(program)