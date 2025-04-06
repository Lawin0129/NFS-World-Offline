const express = require("express");
const app = express.Router();
const fs = require("fs");
const path = require("path");
const paths = require("../utils/paths");
const functions = require("../utils/functions");

// Get news
app.get("/LoginAnnouncements", (req, res) => {
    let acceptedFormats = ["jpg","jpeg","png"];

    let host = functions.getHost(req.headers["host"]);

    let newsTemplate = {
        LoginAnnouncementsDefinition: {
            Announcements: [{ LoginAnnouncementDefinition: [] }],
            ImagesPath: [`http://${host}/Engine.svc/news`]
        }
    };

    let id = 1;

    for (let file of fs.readdirSync(path.join(paths.dataPath, "news"))) {
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

    res.xml(newsTemplate);
});

// Get image from news folder
app.get("/news/*.*", (req, res) => {
    let filePath = path.join(paths.dataPath, "news", path.basename(req.path));

    if (fs.existsSync(filePath)) {
        res.send(fs.readFileSync(filePath));
    } else {
        res.status(404).end();
    }
});

module.exports = app;
