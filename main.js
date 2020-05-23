const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');
const browserSync = require('browser-sync');
const axios = require('axios');

const retry = (fn) => fn().catch(retry.bind(fn));
const localPath = 'http://localhost:3000';
const dirPath = path.resolve(__dirname, '.');
const currentDir = path.basename(__dirname);
const deletePathTarget = new RegExp(`/User.*?${currentDir}`);
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

class CheckerLink {
    constructor(browser, url) {
        this.browser = browser;
        this.url = url;
        this.replaceUrl = url.replace(deletePathTarget, localPath);
        this.errorCount = 0;
    }

    async run () {
        await retry(() => this.browser.goto(this.replaceUrl));

        const list = await this.browser.$$('a');
        const listLength = list.length;
        for (let i = 0; i < listLength; i++) {
            const path = await (await list[i].getProperty('href')).jsonValue();

            axios.get(path)
                .then(res => {
                    console.log(res.status);
                })
                .catch(error => {
                    // console.log(error.config.url);
                    // if (error.response) {
                    //     console.log(error.response.status);
                    // }
                    // console.log('error!!!');
                    this.errorCount++;
                })
        }

        await this.browser.close();
    }
}

(async () => {
    const browser = await puppeteer.launch();
    const l = paths.length;

    browserSync({
        server: "./",
        open: false
    });

    for (let i = 0; i < l; i++) {
        const page = await browser.newPage();

        const checkerLink = new CheckerLink(page, paths[i]);
        await checkerLink.run();
    }

    browserSync.exit();
    browser.close();
})().catch(e => console.error('エラーだよ！！', e));