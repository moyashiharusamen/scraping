const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');
// const { execSync } = require('child_process');
const browserSync = require("browser-sync");

browserSync({
    server: "./"
})

const dirPath = path.resolve(__dirname, '.');
const exclusionDir = /(\/node_modules\/|\/_dev\/|\/includ(e|es)\/|^\.)/g;
const fileType = {
    file: 'file',
    directory: 'directory'
};
const getFileType = (path) => {
    try {
        const stat = fs.statSync(path);

        switch (true) {
            case stat.isFile():
                return fileType.file;

            case stat.isDirectory():
                return fileType.directory;

            default:
                return fileType.Unknown;
        }

    } catch(e) {
        return fileType.Unknown;
    }
};
const listFiles = (dirPath) => {
    const listArray = [];
    const paths = fs.readdirSync(dirPath);

    paths.forEach((a) => {
        const path = `${dirPath}/${a}`;

        switch (getFileType(path)) {
            case fileType.file:
                listArray.push(path);
                break;

            case fileType.directory:
                listArray.push(...listFiles(path));
                break;
        }
    });

    return listArray;
};
const paths = (() => {
    return listFiles(dirPath).filter((value) => {
        return value.match(/.html$/) && !value.match(exclusionDir);
    });
})();

(async () => {
    const browser = await puppeteer.launch();
    const l = paths.length;
    const page = await browser.newPage();

    for (let i = 0; i < l; i++) {
        await page.goto(paths[i]);
    }
})();