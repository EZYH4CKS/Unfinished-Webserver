# My Unfinished Web Server

This is the unfinished web server that I was working on in 2024. 

This web server was supposed to do a few things. The end goal was a "server hoster" for my best friend's old friend. 

# Functionality

 - When a client connects to the server, the server had a "heartbeat" which would give the website the correct server time for the timer at the top of the website.
 - When the timer hits zero it would deactivate the current "live" game server and enable all the clients to vote for a new game server to launch. To give some examples of game servers: a Minecraft server, a Terraria server, a V-Rising server, etc. All these game servers were ran locally on his server PC with the end goal of this running on there as well.
 - You could upload your Minecraft skin to the web server where it would assign it an ID and you could access the file remotely (without any authentication since I was still inexperienced)
 - It had the ability to "ping" Minecraft server to see player counts etc.
 - I tried to create Python program that would act as the "Manager" of the Web Server. Unfortunately, this program went missing and I can't seem to find it. This program would control all the settings of the Web Server remotely through the use of a password. If you read through the code, my way of ensuring security was horrible...

# Key Points
- I didn't know the first thing about authentication and/or proper security measures.
- I didn't really know what I wanted to do with this project. I kind of just went with whatever came to mind.
- I did all of this in the span of a week and a half. 
- I didn't really try my best LOL
