const fs = require('fs')
const path = require('path')

var settingsPath = path.join(__dirname, '../serverSettings.json')
var jsonData = JSON.parse(fs.readFileSync(settingsPath, { encoding: 'utf8', flag: 'r' }))
const MB = jsonData.generalSettings.mcSkinSizeLimitInMB;
const FILE_SIZE_LIMIT = 1024 * 1024 * MB;

const fileSizeLimiter = (req, res, next) => {
    const files = req.files

    const filesOverLimit = []

    Object.keys(files).forEach(key => {
        if (files[key].size > FILE_SIZE_LIMIT) {
            filesOverLimit.push(files[key].name)
        }
    })

    if (filesOverLimit.length) {
        const properVerb = filesOverLimit.length > 1 ? "are" : "is"

        const sentence = `Upload failed. ${filesOverLimit.toString()} ${properVerb} over the file size limit of ${MB} MB.`.replaceAll(",", ", ")

        const message = filesOverLimit.length > 3 ? sentence.replace(",", " and") : sentence.replace(/,(?=[^,]*$)/, " and")

        return res.status(413).json({ status: "error", message })
    }
    next()
}

module.exports = fileSizeLimiter