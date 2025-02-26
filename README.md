# About NFS: World
Need for Speed: World is the 15th game in the Need for Speed franchise and was a free-to-play massively multiplayer online racing game which was only available on Windows and officially launched on July 27, 2010 then shut down on July 14, 2015. It was an online-only game that combined gameplay elements from previous titles in the series such as NFS: Most Wanted (2005) and NFS: Carbon. It focused on illegal street racing, car tuning, police chases and was set in a map called Tri-Cities which was the connected metropolises of Rockport and Palmont City from previous games.

You can find out more here: [https://nfs.fandom.com/wiki/Need_for_Speed:_World](https://nfs.fandom.com/wiki/Need_for_Speed:_World)
# About this program
This program is a server emulator/backend written in Node.js for NFS World which allows you to play it.

Compatible with Node.js v14.0.0 up to the latest version.
# Features
* Achievements:
    + All original achievements included that once existed in NFS World.
    + Setting your achievement badges in achievements log.
* Drivers:
    + Creating Drivers (functionality like "name taken?" also included).
    + Deleting Drivers.
    + Changing Drivers.
    + Editing/Adding Motto.
* Powerups:
    + Using powerups.
    + Recharging/purchasing powerups from the powerup console.
* Events:
    + All original events included that once existed in NFS World.
    + Launching single player events.
        - You can also launch multiplayer-only events as single player. Select your target event and press multiplayer (this saves the event ID into memory). Now launch any single player event and the multiplayer-only event should load.
    + Pursuit heat saves on current car.
    + Pursuit heat resets to 1 if busted.
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
* Treasure Hunt
# Command Line Commands
- `> help {commandName}` - Outputs a list of commands, `commandName` parameter is optional and can be used to show more information about a specific command.
- `> holiday` - Sets the current Need for Speed World holiday type. Upon running this command, a list of holidays will be displayed where you can choose one.
- `> modloader` - Sets which SBRW server mods load when you launch the game using Soapbox Launcher. Upon running this command, a list of SBRW servers will be displayed where you can choose one along with the option to disable mods.
    + ModLoader sets the SBRW server to fetch mod info from. When you launch the game, it fetches the latest mod information from the selected SBRW server. This guarantees the mods are always up-to-date.
    + By default, no SBRW server is selected and the base game will load upon launch.
    + This does not create a duplicate of mods which means the mods directory is shared with the selected SBRW server.
    + If you've played on this selected SBRW server before, the mods should load instantly without having to re-download.
# How to use this NFS World Server Emulator
1) Install [NodeJS](https://nodejs.org/en/).
2) [Download](https://github.com/Lawin0129/NFS-World-Offline/archive/refs/heads/main.zip) and extract NFS World Offline to a safe location.
3) Run "start.bat", some required dependencies will be installed if it's your first time running this. Once finished it should say "listening on port 3550".
4) Look below for the "[Launching the Game](https://github.com/Lawin0129/NFS-World-Offline?tab=readme-ov-file#launching-the-game)" section.
## Launching the Game
When you have started the server, you can launch the game using one of the following methods:

### Method 1: Using Soapbox Race World Launcher
1) [Download](https://github.com/SoapboxRaceWorld/GameLauncher_NFSW/releases/latest) and extract the launcher to a safe location.
2) Run and set up the launcher.
3) Add the server to the Soapbox Race World Launcher by the url `http://127.0.0.1:3550/Engine.svc`.
4) Select the server, enter any email and password then press login.

### Method 2: Using Launch Arguments
1) Open the game client folder and locate the `nfsw.exe` file.
2) Launch the game by running the following command `nfsw.exe US http://127.0.0.1:3550/Engine.svc a 1`.

Once the game has launched, create your driver and play!
# Credits
| Name | Helped with |
| --------------- | ----------- |
| Lawin | Creator |
| soapbox-race-offline-1.9.0<br/>by berkay2578 & Nilzao | For catalog and baskets xml files |
