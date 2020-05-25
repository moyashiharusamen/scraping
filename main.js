const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs-extra');
const browserSync = require('browser-sync');
const axios = require('axios');

const localPath = 'http://localhost:3000';
const dirPath = path.resolve(__dirname, '.');
const currentDir = path.basename(__dirname);
const deletePathTarget = new RegExp(`/User.*?${currentDir}`);
const exclusionDir = /(\/node_modules\/|\/_dev\/|\/includ(e|es)\/|^\.)/g;
const fileType = {
    file: 'file',
    directory: 'directory'
}
const retry = fn => fn().catch(retry.bind(fn));
const getFileType = path => {
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
const listFiles = dirPath => {
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

const checkLink = async (browser, argUrl) => {
    // 整形したパス
    const replaceUrl = argUrl.replace(deletePathTarget, localPath);
    // エラー時の URL を入れる配列
    const innerErrorUrl = [];
    // リンク切れを起こしているリンクの数
    let errorCount = 0;
    
    try {
        await retry(() => browser.goto(replaceUrl));
    }
    catch(e) {
        console.log('ページアクセス時にエラーが発生しました');
    }

    const list = await browser.$$('a');
    const l = list.length;
    for (let i = 0; i < l; i++) {
        const path = await (await list[i].getProperty('href')).jsonValue();

        await axios.get(path)
            .catch(error => {
                errorCount++;
                innerErrorUrl.push(error.config.url);
            })
    }

    await browser.close();

    if (errorCount === 0) return;

    console.log(`ページ: ${replaceUrl}\n件数: ${errorCount} 件\n対象URL: ${innerErrorUrl.join(', ')}\n--------------------`);
};

(async () => {
    const browser = await puppeteer.launch();
    const l = paths.length;

    browserSync({
        server: "./",
        open: false
    });

    for (let i = 0; i < l; i++) {
        const page = await browser.newPage();
        await checkLink(page, paths[i]);
    }

    browserSync.exit();
    browser.close();
})().catch(e => console.error('エラーだよ！！', e));