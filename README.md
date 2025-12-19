### Contents
- [About NFS: World](#about-nfs-world)
- [About This Program](#about-this-program)
- [Features](#features)
- [Command Line Commands](#command-line-commands)
- [Configuration](#configuration)
- [Server Editor](#server-editor)
- [NFS World Server Emulator Setup](#nfs-world-server-emulator-setup)
- [Credits](#credits)

# About NFS: World
Need for Speed: World is the 15th game in the Need for Speed franchise. It was a free-to-play, massively multiplayer online racing game released exclusively for Windows. Officially launched on July 27, 2010 then shut down on July 14, 2015. It was an online-only game that combined elements from previous titles in the series such as NFS: Most Wanted (2005) and NFS: Carbon. It focused on illegal street racing, car tuning, and police chases. The game was set in Tri-Cities, a map that connected the metropolises of Rockport from NFS: Most Wanted (2005) and Palmont City from NFS: Carbon.

You can find out more here: [https://nfs.fandom.com/wiki/Need_for_Speed:_World](https://nfs.fandom.com/wiki/Need_for_Speed:_World)
# About This Program
This program is an NFS World backend (server emulator) written in Node.js which allows you to play the game locally.

Compatible with Node.js v14.0.0 up to the latest version.
# Features
* Achievements:
    + All original achievements included that once existed in NFS World.
    + Changing your achievement badges in Achievements Log.
* Drivers:
    + Creating drivers.
    + Deleting drivers.
    + Changing drivers.
    + Editing motto.
* Power-Ups:
    + Using power-ups.
    + Recharging/purchasing power-ups from the Power-Up Console.
* Events:
    + All original events included that once existed in NFS World.
    + Launching single player events.
        - You can also launch multiplayer-only events as single player. Select your target event and press multiplayer (this saves the event ID into memory). Now launch any single player event and the multiplayer-only event should load.
    + Pursuit heat level saves on current car.
    + Pursuit heat level resets to 1 if busted.
    + Original Car Durability Loss:
        - Sprints: -5% Durability Loss.
        - Circuits: -5% Durability Loss.
        - Pursuits: -5% Durability Loss.
        - Team Escapes: -5% Durability Loss.
        - Drags: -2% Durability Loss.
* Cars:
    + All original cars included in the shop that once existed in NFS World.
    + Changing your car.
    + Repairing your car.
    + Purchasing cars.
    + Selling cars.
    + Car Customization:
        - Skill Mods Customization.
        - Aftermarket Customization.
        - Performance Customization.
        - Vinyls Customization.
        - Paints Customization.
* Freeroam:
    + Freeroam with fake players. Look at [Configuration](#configuration) for more details.
* Treasure Hunt
# Command Line Commands
- `> help {commandName}` - Outputs a list of commands, `commandName` parameter is optional and can be used to show more information about a specific command.
- `> holiday` - Set the current Need for Speed World holiday type. Upon running this command, a list of holidays will be displayed where you can choose one.
- `> modloader` - Set which server mods load when using Soapbox Launcher. Upon running this command, a list of SBRW servers will be displayed where you can choose one along with the option to disable mods.
    + ModLoader sets the SBRW server to fetch mod info from. When you launch the game using Soapbox Launcher, it fetches the latest mod information from the SBRW server that was selected using this command. This guarantees the mods are always up-to-date.
    + By default, no SBRW server is selected and the base game will load upon launch.
    + This does not create a duplicate of mods which means the mods directory is shared with the selected SBRW server.
    + If there is no internet connection, the base game will load instead.
    + NOTE: You need the specific catalog and basket xml files for your selected SBRW server to access the added cars and items in the shop. You can usually get them by asking in the respective SBRW Discord servers. Some servers already have the necessary files dumped and shared for users.
- `> play` - Used to launch Need for Speed World. Upon running this command, two options are displayed where one is for selecting the nfsw.exe file path and the other is to launch Need for Speed World.
    + Selecting a valid nfsw.exe file path saves into [Configuration](#configuration) so you won't need to re-select it again if you restart this offline server.
    + Once a valid nfsw.exe file path is selected, you can simply run the "play" command again then select "Launch" and Need for Speed World will start.
    + This command automatically limits NFS World to a maximum of 8 CPU cores (because using above 8 cores makes the game unstable and usually crashes).
# Configuration
Located in `config/config.json`. You will need to restart the server if you make any changes to this file.
| Key                    | Default  | Description |
|------------------------|----------|-------------|
| `LogRequests`          | `false`  | When set to `true`, this will display every request and XMPP message being sent by the game client. |
| `FakeFreeroamPlayers`  | `false`  | When set to `true`, this will add about 10 fake players driving around the map. |
| `nfswFilePath`         |  Empty   | This is where your valid nfsw.exe file path will be stored. Changed with the "play" command using [Command Line Commands](#command-line-commands). |

NOTE: The `FakeFreeroamPlayers` feature may be a bit buggy. Players don't appear on the map sometimes and can cause the game to become really slow. If this happens, try entering and exiting the safehouse until they appear.
# Server Editor
- `ServerEditor.exe` is forked from `soapbox-race-offline-1.9.0` then improved and modified to work with my offline server.
- You can use Server Editor to modify driver information, import drivers, export drivers, set holiday and more.
- If `ServerEditor.exe` doesn't run, you should install [.NET Framework 3.5](https://www.microsoft.com/en-gb/download/details.aspx?id=21).
# NFS World Server Emulator Setup
1) Install [NodeJS](https://nodejs.org/en/).
2) [Download](https://github.com/Lawin0129/NFS-World-Offline/archive/refs/heads/main.zip) and extract NFS World Offline to a safe location.
3) Run "start.bat", some required dependencies will be installed if it's your first time running this. Once finished, it should say "listening on port 3550".
4) Look below for the "[Launching the Game](#launching-the-game)" section.
## Launching the Game
When you have started the server, you can launch the game using one of the following methods:

### Method 1: Using The Built-in "Play" Command
1) Make sure you have a copy of NFS World game files.
2) Run the built-in "play" command using [Command Line Commands](#command-line-commands).
3) Choose the "Select" action, then locate your game client folder and select `nfsw.exe`.
4) After you picked a valid `nfsw.exe` file, it saves the path into [Configuration](#configuration).
5) Now you can simply launch the game by running "play" command again then choosing "Launch" action.

### Method 2: Using Soapbox Race World Launcher
1) [Download](https://github.com/SoapboxRaceWorld/GameLauncher_NFSW/releases/latest) and extract the launcher to a safe location.
2) Run and set up the launcher.
3) Add the server to the Soapbox Race World Launcher by the url `http://127.0.0.1:3550/Engine.svc`.
4) Select the server, enter any email and password then press login.

### Method 3: Using Launch Arguments Manually
- WARNING: I do not recommend this method if your CPU has more than 8 cores, the game will be very unstable and will most likely freeze/crash. The built-in [play command](#method-1-using-the-built-in-play-command) limits NFS World to a maximum of 8 cores.
1) Make sure you have a copy of NFS World game files.
2) Open the game client folder and locate the `nfsw.exe` file.
3) Launch the game by running the following command `nfsw.exe US http://127.0.0.1:3550/Engine.svc a 1`.

Once the game has launched, create your driver and play!
# Credits
| Name | Helped with |
| --------------- | ----------- |
| Lawin | Creator |
| soapbox-race-offline-1.9.0<br/>by berkay2578 & Nilzao | For catalog and baskets xml files,<br/>For [Server Editor](#server-editor) and XMPP message subject hash algorithm. |
