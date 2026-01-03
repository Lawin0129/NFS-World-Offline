const fs = require("fs");
const path = require("path");
const paths = require("../../utils/paths");
const functions = require("../../utils/functions");
const os = require("os");
const { spawn } = require("child_process");

let self = module.exports = {
    commandInfo: {
        info: "This command is used to launch Need for Speed World.",
        helpInfo: "Upon running this command, two options are displayed where one is for selecting the nfsw.exe file path and the other is to launch Need for Speed World.",
        extraInfo: "-- Selecting a valid nfsw.exe file path saves into config so you won't need to re-select it again if you restart this offline server.\n"
                 + "-- Once a valid nfsw.exe file path is selected, you can simply run the \"play\" command again then select \"Launch\" and Need for Speed World will start.\n"
                 + "-- This command automatically limits NFS World to a maximum of 8 CPU cores (because using above 8 cores makes the game unstable and usually crashes).",
        name: "play",
    },
    execute: async (args, readline) => {
        if (process.platform != "win32") {
            console.log("\nThis command is incompatible with your operating system.");
            return;
        }

        console.log(`\n${self.commandInfo.info}\n\n${self.commandInfo.extraInfo}`);
        
        const configPath = path.join(paths.configPath, "config.json");
        const configData = JSON.parse(fs.readFileSync(configPath).toString());

        console.log(`\nCurrent selected nfsw.exe file path: "${configData.nfswFilePath || "NONE"}".`);
        console.log(`\nChoose an action:\n [0] Select - Set the nfsw.exe file path.\n [1] Launch - Run Need for Speed World using the current selected nfsw.exe.`);
        
        let optionSelect = await functions.askQuestion("\nEnter a number: ", readline);
        let actionOptionNum = Number.isInteger(parseInt(optionSelect)) ? parseInt(optionSelect) : -1;

        switch (actionOptionNum) {
            case 0: {
                let filePath;

                try {
                    console.log("\nAttempting to open a Select File Dialog Window, please go to your NFS World game files and select nfsw.exe.");

                    filePath = await selectNfswExe(path.dirname(configData.nfswFilePath || process.cwd()));
                } catch {
                    console.log("\nFailed to open Select File Dialog, you will need to enter the path manually.");
                    console.log('\nProvide a valid nfsw.exe file path (e.g. "C:\\game\\nfsw.exe")');

                    filePath = (await functions.askQuestion("Enter the file path: ", readline)).trim().replace(/"/ig, "");
                }
                
                if (!checkExeValid(filePath)) {
                    console.log("\nInvalid nfsw.exe file path, cancelling operation.");
                    break;
                }

                configData.nfswFilePath = filePath;

                fs.writeFileSync(configPath, JSON.stringify(configData, null, 4));
                
                console.log(`\nSuccessfully changed the nfsw.exe file path to "${configData.nfswFilePath}".`);
                console.log(`If you're ready to launch, run the "play" command again and select the "Launch" action.`);
                break;
            }

            case 1: {
                if (!checkExeValid(configData.nfswFilePath)) {
                    console.log("\nInvalid nfsw.exe file path, cancelling operation.");
                    break;
                }

                console.log(`\nAttempting to launch Need for Speed World at "${configData.nfswFilePath}".`);

                try {
                    launchNfsw(configData.nfswFilePath);
                } catch {
                    console.log("\nFailed to launch nfsw.exe, please make sure your game files are valid.");
                }
                break;
            }

            default: {
                console.log("\nInvalid action, cancelling operation.");
                break;
            }
        }
    }
}

function checkExeValid(filePath) {
    if ((typeof filePath) != "string") return false;
    if (!path.basename(filePath).toLowerCase().endsWith(".exe")) return false;

    try {
        const stats = fs.statSync(filePath);
        return stats.isFile();
    } catch {
        return false;
    }
}

function buildAffinityMask(maxCpuCount) {
    const cpuCount = os.cpus().length;
    const n = Math.min(Math.max(1, cpuCount), maxCpuCount);

    return (2 ** n) - 1;
}

function attemptFileDelete(filePath) {
    try {
        (fs.rmSync ?? fs.unlinkSync)(filePath);
    } catch {}
}

function launchNfsw(nfswExePath) {
    // delete .links before launch if you're using SBRW's nfs world game files
    attemptFileDelete(path.join(path.dirname(nfswExePath), ".links"));

    // limit nfs world to a maximum of 8 cpu cores (because using above 8 cores makes the game unstable and usually crashes)
    const mask = buildAffinityMask(8);
    const hexMask = mask.toString(16).toUpperCase();

    const nfswArgs = `US http://${functions.getHost()}/Engine.svc a 1`;

    const cmdLine = `start "" /affinity ${hexMask} "${nfswExePath}" ${nfswArgs}`;
    const child = spawn("cmd.exe", ["/C", cmdLine], {
        detached: true,
        stdio: "ignore",
        windowsHide: false,
        windowsVerbatimArguments: true,
    });

    child.on("error", err => console.error("\nFailed to start:", err));
    child.unref();
}

function escapeForPowerShell(str) {
    return str.replace(/`/ig, "``").replace(/\$/ig, "`$");
}

async function selectNfswExe(startDir) {
    const ps = `
        $ErrorActionPreference = "Stop"
        Add-Type -AssemblyName System.Windows.Forms
        $ofd = New-Object System.Windows.Forms.OpenFileDialog
        $ofd.Title = "Select nfsw.exe"
        $ofd.Filter = "nfsw.exe|nfsw.exe|Executable (*.exe)|*.exe"
        $ofd.FileName = "nfsw.exe"
        $ofd.InitialDirectory = "${escapeForPowerShell(startDir)}"
        if ($ofd.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            Write-Output $ofd.FileName
        }
    `;

    const args = [
        "-NoProfile",
        "-NonInteractive",
        "-STA",
        "-WindowStyle", "Hidden",
        "-Command", ps
    ];
    
    const child = spawn("powershell.exe", args, { windowsHide: true });
    
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", d => (stdout += d.toString()));
    child.stderr.on("data", d => (stderr += d.toString()));
    
    const exitCode = await new Promise((resolve, reject) => {
        child.on("close", resolve);
        child.on("error", reject);
    }).catch(err => {
        throw new Error(`Failed to start PowerShell: ${err.message}`);
    });
    
    if (exitCode != 0) {
        throw new Error(`PowerShell error (${exitCode}): ${stderr || "Unknown error"}`);
    }
    
    const picked = stdout.trim();
    if (!picked) return null;
    
    return picked;
}
