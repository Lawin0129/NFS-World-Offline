const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const path = require("path");
const xmlParser = require("../utils/xmlParser");

// Get news
app.get("/LoginAnnouncements", compression({ threshold: 0 }), (req, res, next) => {
    let dataPath = path.join(__dirname, "..", "data");

    if (fs.existsSync(path.join(dataPath, "LoginAnnouncements.xml"))) return next();

    let acceptedFormats = ["jpg","jpeg","png"];

    let newsTemplate = {
        LoginAnnouncementsDefinition: {
            Announcements: [{ LoginAnnouncementDefinition: [] }],
            ImagesPath: ["http://localhost:3550/Engine.svc/news"]
        }
    }

    let id = 1;

    for (let file of fs.readdirSync(path.join(dataPath, "news"))) {
        if (!acceptedFormats.includes(file.toLowerCase().split(".").pop())) continue;

        newsTemplate.LoginAnnouncementsDefinition.Announcements[0].LoginAnnouncementDefinition.push({
            Context: ["NotApplicable"],
            Id: [`${id}`],
            ImageChecksum: ["-1"],
            ImageUrl: [file],
            Type: ["ImageOnly"]
        });

        id += 1;
    }

    res.type("application/xml").send(xmlParser.buildXML(newsTemplate));
});

// Get image from news folder
app.get("/news/*.*", compression({ threshold: 0 }), (req, res) => {
    let filePath = path.join(__dirname, "..", "data", "news", path.basename(req.path));

    if (fs.existsSync(filePath)) {
        res.send(fs.readFileSync(filePath));
    } else {
        res.status(200).end();
    }
});

module.exports = app;