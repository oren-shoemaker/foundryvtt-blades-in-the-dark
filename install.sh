#!/bin/bash

# build css
sass /g/Code/blades/scss/style.scss /g/Code/blades/styles/blades.css

# build packs
for name in abilities classes homelands backgrounds lifestyles gear spells; do
    fvtt package pack --in /g/Code/blades/packs/source/$name --out /g/Code/blades/packs -n $name
done

# install system to foundry
rm -rf /c/users/orens/AppData/local/FoundryVTT/Data/systems/until-the-curtain-falls/*
cp -r /g/Code/blades/* /c/users/orens/AppData/local/FoundryVTT/Data/systems/until-the-curtain-falls