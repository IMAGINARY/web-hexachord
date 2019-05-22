#!/bin/bash
# Caches required libraries to local disk for offline access (or if the cdn fails)

mkdir -p lib/JZZ lib/Vue

curl https://cdn.jsdelivr.net/npm/vue/dist/vue.min.js > lib/Vue/vue.min.js
curl https://cdn.jsdelivr.net/npm/jzz > lib/JZZ/jzz.js
curl https://cdn.jsdelivr.net/npm/jzz-synth-tiny > lib/JZZ/JZZ.synth.Tiny.min.js
curl https://cdn.jsdelivr.net/npm/jzz-input-kbd > lib/JZZ/jzz-input-kbd.js
curl https://cdn.jsdelivr.net/npm/jzz-midi-smf > lib/JZZ/jzz-midi-smf.js
