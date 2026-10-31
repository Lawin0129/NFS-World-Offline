const fs = require("fs");
const path = require("path");
const paths = require("../../utils/paths");
const functions = require("../../utils/functions");
const os = require("os");
const { spawn } = require("child_process");

let self = module.exports = {
    commandInfo: {
        info: "This command is used to launch Need for Speed World.",
        helpInfo: "select - Optional, opens a Select File Dialog to change the nfsw.exe file path (saves into config) and then launches Need for Speed World.\n\nWithout a parameter, Need for Speed World launches right away using the saved nfsw.exe file path. If no valid file path is saved yet, you will be asked to select nfsw.exe first.",
        extraInfo: "-- This command automatically limits NFS World to a maximum of 8 CPU cores (because using above 8 cores makes the game unstable and usually crashes).",
        name: "play [select]",
    },
    execute: async (args, readline) => {
        if (process.platform != "win32") {
            console.log("\nThis command is incompatible with your operating system.");
            return;
        }
        
        const configPath = path.join(paths.configPath, "config.json");
        const configData = JSON.parse(fs.readFileSync(configPath).toString());

        const wantsSelect = (args[0] || "").toLowerCase() == "select";

        if (wantsSelect || !checkExeValid(configData.nfswFilePath)) {
            if (!wantsSelect) console.log(`\nNo valid nfsw.exe file path selected yet (current: "${configData.nfswFilePath || "NONE"}").`);

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
                return;
            }

            configData.nfswFilePath = filePath;

            fs.writeFileSync(configPath, JSON.stringify(configData, null, 4));
            
            console.log(`\nSuccessfully changed the nfsw.exe file path to "${configData.nfswFilePath}".`);
        }

        console.log(`\nAttempting to launch Need for Speed World at "${configData.nfswFilePath}".`);
        console.log(`To change the nfsw.exe file path later, run "play select".`);

        try {
            launchNfsw(configData.nfswFilePath);
        } catch {
            console.log("\nFailed to launch nfsw.exe, please make sure your game files are valid.");
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
