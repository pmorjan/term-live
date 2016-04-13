'use strict'
const fs = require('fs')
const http = require('http')
const os = require('os')
const path = require('path')
const util = require('util')
//
const WSserver = require('ws').Server
const cmd = require('commander')
const compression = require('compression')
const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const pty = require('pty')
//

const defaults = {
  title: 'term-live',
  port: 8080
}

//
// parse command line
//
cmd
  .usage('[options] [shell]')
  .option('-l, --logfile <filename>', 'log http request to file')
  .option('-p, --port <port>', 'http listen port - defaults to ' + defaults.port, defaults.port, parseInt)
  .on('--help', function () {
    console.log('  Example:')
    console.log('    term-live /bin/bash')
    console.log()
  })
  .parse(process.argv)

if (cmd.port < 1024 && process.geteuid() !== 0) {
  console.error('  Error: listen port < 1024, must run as root')
  cmd.help()
}

//
// app
//
process.title = defaults.title
const app = express()
app.use(helmet())
app.use(compression())
if (cmd.logfile) {
  const logStream = fs.createWriteStream(cmd.logfile, {flags: 'a'})
  app.use(morgan('common', {stream: logStream}))
}
app.use(express.static(path.join(__dirname, 'public')))
app.get('/', function (req, res) {
  res.sendfile(path.join(__dirname, 'public/index.html'))
})

//
// http server
//
const server = http.createServer(app)

server.on('error', function (err) {
  console.log('error:', err.message)
  process.exit(1)
})

server.listen(cmd.port, function () {
  printUrlList()
})

//
// wss
//
const wss = new WSserver({server: server})
wss.broadcast = function broadcast (data) {
  process.nextTick(function () {
    wss.clients.forEach(function (socket) {
      socket.send(data)
    })
  })
}

wss.on('connection', function (ws) {
  ws.send('\r\n\x1b[33m Welcome to the show!\x1b[0m\r\n\r\n')

  ws.on('close', function () {
    ws.terminate()
  })

  ws.on('error', function (err) {
    console.log('error:', err.stack)
  })
})

wss.on('error', function (err) {
  console.log('wss error:', err.stack)
})

//
// pty
//
const term = pty.spawn(cmd.args[0] || 'bash', [], {
  name: process.env.TERM,
  cols: process.stdout.columns,
  rows: process.stdout.rows,
  cwd: process.cwd(),
  env: process.env
})

term.on('data', function (data) {
  process.stdout.write(data)
  wss.broadcast(data)
})
.on('error', function (err) {
  console.error('error:', err)
  process.stdin.setRawMode(false)
  process.exit(1)
})
.on('close', function () {
  process.stdin.setRawMode(false)
  process.exit(0)
})

process.stdout.on('resize', () => {
  term.resize(process.stdout.columns, process.stdout.rows)
})

process.stdin.setRawMode(true)
process.stdin.pipe(term)

//
//
//
function printUrlList () {
  const netcfg = os.networkInterfaces()
  const ifnames = Object.keys(netcfg).map((o) => netcfg[o])
  const urls = [].concat.apply([], ifnames)
   .filter((o) => !/^fe80/.test(o.address))
   .map((o) => o.address)
   .map((ip) => util.format(' http://%s:%s', ip, cmd.port))
   .join('\n')
  console.log('server listening on:\n%s\n', urls)
}

