# TwicPics Companion browser extension build system

## Build

Install the package using your favorite package manager and everything will be built automagically.

So, just type `npm install` or `yarn`.

## File structure

- Raw extension is in `./src`
- Built extension is in `./built` (works on chrome only, with a mild manifest error)
- Final extensions are located in `./dist`:
    - directory `chrome` for unpacked chrome extension
    - file `chrome.zip` for packed chrome extension
    - directory `firefox` for unpacked chrome extension
    - file `firefox.zip` for packed chrome extension

## Maintenance

Creation of `./built` is done using [rollup.js](https://www.rollupjs.org/guide/en/) and logic is located in `./rollup.config.js`.

Final versions for each target browser are done in `./pack.js`.
