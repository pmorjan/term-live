
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![NPM version](http://img.shields.io/npm/v/term-live.svg)](https://www.npmjs.org/package/term-live)

# ssh-live

### Let others watch your terminal session live via HTTP

Starts a local HTTP server to redirect STDOUT/STDERR of your terminal to remote
web clients in real-time.

### Installation
```
  npm install -g term-live
```

### Usage
```sh
  Usage: term-live [options] [shell]

  Options:

    -h, --help                output usage information
    -l, --logfile <filename>  log http request to file
    -p, --port <port>         http listen port - defaults to 8080

  Example:
    term-live /bin/bash

```
