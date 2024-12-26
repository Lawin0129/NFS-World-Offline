# About NFS: World
Need for Speed: World was originally released in 2010 and shutdown in 2015.
It was a multiplayer racing game that was published by Electronic Arts and co-developed by EA Black Box. It was the first freemium MMORG (Massively Multiplayer Online Racing Game) in the Need for Speed franchise and was available on Windows. The game combined gameplay elements from previous titles in the series, such as NFS: Most Wanted and NFS: Carbon, with MMO features. It focused on illegal street racing, car tuning, and police chases, and was set in a map called Tri-City, which was a combination of Rockport and Palmont cities from previous games.

You can find out more here: [https://nfs.fandom.com/wiki/Need_for_Speed:_World](https://nfs.fandom.com/wiki/Need_for_Speed:_World)
# About this program
This program is a server emulator/backend written in Node.js for NFS World which allows you to play it.
# Features
* Achievements:
    + All original achievements that once existed in nfs world.
    + Setting your achievement badges in achievements log.
* Drivers:
    + Creating Drivers (functionality like "name taken?" also included).
    + Deleting Drivers.
    + Changing Drivers.
    + Editing/Adding Motto.
* Events:
    + All original events that once existed in nfs world.
    + Launching single player events.
    + Pursuit heat saves on current car.
    + Pursuit heat resets to 1 if busted.
    + Original Car Durability Loss:
        - Sprints: -5% Durability Loss.
        - Circuits: -5% Durability Loss.
        - Pursuits: -5% Durability Loss.
        - Team Escapes: -5% Durability Loss.
        - Drags: -2% Durability Loss.
* Cars:
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
- `> holiday {type}` - Sets the current Need for Speed World holiday type.
# Issues
* Powerups WILL NOT work due to unfinished XMPP server.
* Launching using launch args will not work as it gives "Error Code 7", you will have to use the Soapbox Race World Launcher (do not disable the proxy).
# How to use this nfs world server emulator?
1) Install [NodeJS](https://nodejs.org/en/).
2) Download and Extract NFS World Offline to a safe location.
3) Run "install_packages.bat" to install all the required modules.
4) Run "start.bat", if there is no errors, it should work.
5) Add the server to the Soapbox Race World Launcher by the url "http://localhost:3550/Engine.svc".
6) Select the server, enter any email and password then press login.
7) Once the game has launched, create your driver and play!
# Credits
| Name | Helped with |
| --------------- | ----------- |
| Lawin | Creator |
| soapbox-race-offline-1.9.0<br/>by berkay2578 & Nilzao | For catalog and baskets files |
