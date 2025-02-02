# About NFS: World
Need for Speed: World is the 15th game in the Need for Speed franchise and was a free-to-play massively multiplayer online racing game which was only available on Windows and officially launched on July 27, 2010 then shut down on July 14, 2015. It was an online-only game that combined gameplay elements from previous titles in the series such as NFS: Most Wanted (2005) and NFS: Carbon. It focused on illegal street racing, car tuning, police chases and was set in a map called Tri-Cities which was the connected metropolises of Rockport and Palmont City from previous games.

You can find out more here: [https://nfs.fandom.com/wiki/Need_for_Speed:_World](https://nfs.fandom.com/wiki/Need_for_Speed:_World)
# About this program
This program is a server emulator/backend written in Node.js for NFS World which allows you to play it.
# Features
* Achievements:
    + All original achievements included that once existed in NFS World.
    + Setting your achievement badges in achievements log.
* Drivers:
    + Creating Drivers (functionality like "name taken?" also included).
    + Deleting Drivers.
    + Changing Drivers.
    + Editing/Adding Motto.
* Events:
    + All original events included that once existed in NFS World.
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
- `> holiday` - Sets the current Need for Speed World holiday type. Upon running this command, a list of holidays will be outputted where you can choose one.
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
| soapbox-race-offline-1.9.0<br/>by berkay2578 & Nilzao | For catalog and baskets xml files |
