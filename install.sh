#!/bin/bash

# build css
sass /g/Code/blades/scss/style.scss /g/Code/blades/styles/blades.css

# install system to foundry
rm -rf /c/users/orens/AppData/local/FoundryVTT/Data/systems/until-the-curtain-falls/*
cp -r /g/Code/blades/* /c/users/orens/AppData/local/FoundryVTT/Data/systems/until-the-curtain-falls