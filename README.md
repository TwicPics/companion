# TwicPics Companion browser extension build system

## Pre-requisites

- NodeJS 16+
- NPM 7.24+ or Yarn 1.22+

## Build

Simply type `npm install` or `yarn`.

## File structure

- Raw extension is in `./src`
- Built extension is in `./built` (works on chrome only, with a mild manifest error)
- Final extensions are located in `./dist`:
    - directory `chrome` for unpacked chrome extension
    - file `chrome.zip` for packed chrome extension
    - directory `edge` for unpacked edge extension
    - file `edge.zip` for packed edge extension
    - directory `firefox` for unpacked firefox extension
    - file `firefox.zip` for packed firefox extension

## Maintenance

Creation of `./built` is done using [rollup.js](https://www.rollupjs.org/guide/en/) and logic is located in `./rollup.config.js`.

Final versions for each target browser are done in `./pack.js`.
