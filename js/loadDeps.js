/* Loads libraries required by the application using fallback
First attempt to retrieve them online, otherwise load local copies */

fallback.load({
    //Vue: Main framework for reactive elements
    Vue: [
        'https://cdn.jsdelivr.net/npm/vue/dist/vue.js',
        '/lib/Vue/vue.min.js'
    ],
    //JZZ: Midi library
    JZZ: [
        'https://cdn.jsdelivr.net/npm/jzz',
        '/lib/JZZ/jzz.js'
    ],
    //JZZ.Tiny: Basic Synthetizer
    'JZZ.synth.Tiny': [
        'https://cdn.jsdelivr.net/npm/jzz-synth-tiny',
        '/lib/JZZ/JZZ.synth.Tiny.min.js'
    ],
    //JZZ.Kbd: Keyboard bindings and virtual piano keyboard
    'JZZ.input.Kbd': [
        'https://cdn.jsdelivr.net/npm/jzz-input-kbd',
        '/lib/JZZ/jzz-input-kbd.js'
    ],
    //JZZ.SMF: Standard Midi File support
    'JZZ.MIDI.SMF': [
        'https://cdn.jsdelivr.net/npm/jzz-midi-smf',
        '/lib/JZZ/jzz-midi-smf.js'
    ],
    GSAP: [
        'https://cdnjs.cloudflare.com/ajax/libs/gsap/1.18.0/TweenLite.min.js',
        '/lib/GSAP'
    ],
    'Tonnetz.utils':[
        '/js/utils.js'
    ],
    'Tonnetz.l12n':[
        '/js/l12n.js'
    ],
    'Tonnetz.clickMixins':[
        'js/mixins/clickMixins.js'
    ],
    'Tonnetz.trajectory':[
        'js/mixins/trajectory.js'
    ],
    'Tonnetz.dragZoom':[
        'js/decorators/dragZoom.js'
    ],
    'Tonnetz.piano':[
        'js/components/pianoKeyboard.js'
    ],
    'Tonnetz.loader':[
        'js/components/songLoader.js'
    ],
    'Tonnetz.tonnetzLike':[
        'js/components/tonnetzLike.js'
    ],
    'Tonnetz.clockOctave':[
        'js/components/clockOctave.js'
    ]
},{
    shim:{
        // Wait for JZZ to be loaded before loading its submodules
        'JZZ.synth.Tiny': ['JZZ'],
        'JZZ.input.Kbd': ['JZZ'],
        'JZZ.MIDI.SMF': ['JZZ']
    }
}
)