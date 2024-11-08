const express = require("express");
const app = express.Router();
const compression = require("compression");
const fs = require("fs");
const xmlParser = require("../structs/xmlParser");

// Get news
app.get("/LoginAnnouncements", compression({ threshold: 0 }), (req, res, next) => {
    if (fs.existsSync("./data/LoginAnnouncements.xml")) return next();

    res.type("application/xml");

    let newsDir = fs.readdirSync("./data/news");
    let acceptedFormats = ["jpg","jpeg","png"];

    let newsTemplate = {
        LoginAnnouncementsDefinition: {
            Announcements: [{ LoginAnnouncementDefinition: [] }],
            ImagesPath: ["http://localhost:3550/Engine.svc/news"]
        }
    }

    let id = 1;

    for (let file of newsDir) {
        if (!acceptedFormats.includes(file.toLowerCase().split(".")[1])) continue;

        newsTemplate.LoginAnnouncementsDefinition.Announcements[0].LoginAnnouncementDefinition.push({
            Context: ["NotApplicable"],
            Id: [`${id}`],
            ImageChecksum: ["-1"],
            ImageUrl: [file],
            Type: ["ImageOnly"]
        });

        id += 1;
    }

    res.send(xmlParser.buildXML(newsTemplate));
});

// Get image from news folder
app.get("/news/*.*", compression({ threshold: 0 }), (req, res) => {
    let filePath = `./data${req.path}`;

    if (fs.existsSync(filePath)) {
        res.send(fs.readFileSync(filePath));
    } else {
        res.status(200).end();
    }
});

module.exports = app;