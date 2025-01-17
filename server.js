const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const requestIP = require('request-ip')
const fileUpload = require('express-fileupload')
const mcstatus = require('node-mcstatus')

var dist
var serverSettings = {}
var dynamicServers = {}
var tables = {
    'votes': [],
    'active': []
}
var ips = []
var manIP = ''

function resetActive(len) {
    for (var i = 0; i < len; i++) {
        tables.active[i] = 0
    }
}
function resetVotes(len) {
    for (var i = 0; i < len; i++) {
        tables.votes[i] = 0
    }
}

function initTables(len) {
    resetActive(len)
    resetVotes(len)
}

function handleIP(clientIP) {
    if (ips.length == 0) { 
        ips.push(clientIP)
        return true
    } else {
        for (var i = 0; i < ips.length; i++) {
            if (ips[i] == clientIP) {
                return false
            }
        }
        ips.push(clientIP)
        return true
    }
}

function handleVotes(server) {
    var none = true
    for (var i = 0; i < tables.votes.length; i++) {
        if (tables.votes[i] != 0) {
            none = false
        }
    }
    if (none) {
        tables.votes[server] = tables.votes[server] + 1
        tables.active[server] = tables.active[server] + 1
    } else {
        tables.votes[server] = tables.votes[server] + 1
    }
}

function checkState(length) {
    var largestVote = tables.votes.reduce((a, b) => Math.max(a, b), -Infinity)
    var iV = tables.votes.indexOf(largestVote)

    var active = tables.active.reduce((a, b) => Math.max(a, b), -Infinity)
    var iA = tables.active.indexOf(active)

    if (iV != iA) {                                                                         // If currently highest voted server is not the current active server,
        initTables(length)                                                                  // set the highest voted server to active. Reset votes.
        tables.active[iV] = 1
    }
    if (iV == iA) {                                                                         // If currently highest voted server is the current active server,
        resetVotes(length)                                                                  // simply reset the votes.
    }
    if (largestVote == 0 && serverSettings["resetVotesOnZero"] == 1) {                      // If no servers are voted for, shutdown all servers.
        resetActive(length)                     
    }
}

(() => {
    console.log('[*] Loading serverSettings.json...')
    var settingsPath = path.join(__dirname, 'serverSettings.json')
    var jsonData = JSON.parse(fs.readFileSync(settingsPath, { encoding: 'utf8', flag: 'r' }))
    Object.entries(jsonData).map(entry => {
        if (entry[0] == "dynamicServers") {
            Object.entries(entry[1]).map(property => {
                dynamicServers[property[0]] = property[1]
            })
            return
        }
        Object.entries(entry[1]).map(property => {
            serverSettings[property[0]] = property[1]
        })
    })
    console.log(' >  Loaded serverSettings.json')

    console.log('[*] Initializing tables...')
    initTables(dynamicServers["Length"])
    console.log(' >  Initialized tables')

    console.log('[*] Starting heartbeat...')
    t1 = Math.ceil((Date.now() + (serverSettings["votingTimeBetweenReset"] * 1000)) / 1000)
    var heartbeat = setInterval(() => {
        t2 = Math.ceil(Date.now() / 1000)
        dist = t1 - t2
        if (dist <= 0) { 
            t1 = Math.ceil((Date.now() + (serverSettings["votingTimeBetweenReset"] * 1000)) / 1000) 
            checkState(dynamicServers["Length"])
            while (ips.length) {
                ips.pop()
            }
        }
    }, 1000)
    console.log(' >  Started heartbeat')
})()

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        'Access-Control-Allow-Origin': '*',
        origin: '*',
        methods: '*',
        allowedHeaders: '*'
    })
)

const filePayloadExists = require('./middleware/filePayloadExists')
const fileExtLimiter = require('./middleware/fileExtLimiter')
const fileSizeLimiter = require('./middleware/fileSizeLimiter')

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/routes/static/index.html')
})

app.get('/serversInfo', (req, res) => {
    return res.json({ json: dynamicServers["Info"] })
})

app.get('/serverTime', (req, res) => { 
    return res.json({ dist: dist }) 
})

app.get('/skinupload', (req, res) => {
    res.sendFile(__dirname + "/routes/static/skinUpload.html")
})

app.post('/skinupload', fileUpload({ createParentPath: true }), fileSizeLimiter, filePayloadExists, fileExtLimiter(['.png','.jpg','jpeg']), (req, res) => {
    console.log('[+] Skin File Uploaded')
    const files = req.files
    let filename

    Object.keys(files).forEach(key => {
        console.log(` >  Saving ${files[key].name} to /minecraft_skins/`)
        filename = files[key].name
        const filepath = path.join(__dirname, 'minecraft_skins', files[key].name)
        files[key].mv(filepath, (err) => {
            if (err) return res.json({ status: 'Error', message: 'File could not be saved to the server! Please try again. If this issue persists, please contact the server administrator to resolve this issue!' })
        })
    })

    return res.json({ status: 'Success', message: 'File successfully uploaded! The URL has been copied to your clipboard!', url: `/skins/${filename}` } )
})

app.get('/skins/:id', (req, res) => {
    if (fs.existsSync(__dirname + '/minecraft_skins/' + req.params.id)) {
        res.sendFile(__dirname + '\\minecraft_skins\\' + req.params.id)
    } else {
        return res.json({ status: 'Error' })
    }
})

app.get('/getTables', (req, res) => {
    return res.json({ tables: tables })
})

app.get('/getMCStatus', async (req, res) => {
    var options = { query: false }
    mcstatus.statusJava(dynamicServers["Info"][0]["mcServerIP"], dynamicServers["Info"][0]["mcServerPort"], options).then((result) => {
        return res.json({ status: 'Success', response: result })
    }).catch((err) => {
        console.log('[*] MC STATUS ERROR')
        console.log(err)
        return res.json({ status: 'Error', message: 'Failed to retrieve server info!' })
    })
    // const resp = await fetch('https://api.mcstatus.io/v2/status/java/' + host + ':' + port, {
    //     method: 'GET',
    // })
    // const json = await resp.json()
    // return res.json({ status: 'Success', response: json })
    // console.log(resp)
})

app.post('/voteServer', (req, res) => {
    var whatServer = req.body.whatServer
    var clientIP = requestIP.getClientIp(req)
    if (handleIP(clientIP)) {
        console.log(`[+] ${clientIP} voted for server: ${whatServer}`)
        handleVotes(whatServer)
        return res.json({ status: 'Success' })
    } else {
        return res.json({ status: 'Error', message: 'Already voted! Please wait till next reselection.' })
    }   
})

function unwrap(v1, v2) {
    p1 = v2.substring(v2.length-v1, v2.length)
    p2 = v2.substring(0, v2.length-v1)
    final = p1 + p2
    if (final == serverSettings["PASSWORD"]) {
        return true
    }
    return false
}

app.post('/access', (req, res) => {
    var v1 = req.body.v1
    var v2 = req.body.v2
    if (unwrap(v1, v2) === false) {
        return res.json({ status: "error" })
    }

    var clientIP = requestIP.getClientIp(req)
    manIP = clientIP
    console.log(`[+] New managerial connection established with: [${clientIP}] at ${Date()}`)

    return res.json({ status: "success", data: serverSettings })
})

app.listen(serverSettings["PORT"], () => { console.log(`[*] Main Server running on port: ${serverSettings["PORT"]}`) })