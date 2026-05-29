# VRCFT-To-VRC-Blendshapes
A quick re-mapper for VRCFaceTracking to VRChat's default eye control blendshapes. This allows you to use vrc.blink_left and vrc.blink_right for eyelid tracking rather than creating new ones for VRCFT.

## Requirements
- NodeJS
- VRCFury

Import the Unity Package into your project

In A_JazzySenpai_Eyetracking_Stuff drag the "Eye Tracking Prefab" onto the root of your avatar

Install the package deps using ``npm i`` and then run index.js

If you're using Project Babble you will need to turn off ``Use Native VRC Eye Tracking`` and in the OSC settings change the send port to 9100 (or whatever you set the app to run on)
