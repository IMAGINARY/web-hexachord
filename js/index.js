//Author: Corentin Guichaoua

// Vue.config.devtools = true
// Vue.config.performance = true


//TODO: Add credit info, with paper to cite



// ============================================================================

// Reload the screen after 2 minutes of inactivity.
let timeout = null;
function restartTimeout() {
  clearTimeout(timeout);
//   timeout = setTimeout(() => window.location.reload(), 1000 * 120); // 2 mins
}
document.addEventListener('touchdown', restartTimeout);
document.addEventListener('mousemove', restartTimeout);
//An additional listener is added upon connecting a Midi Input

// ============================================================================
// Geometry constants and coordinate conversions

const xstep=Math.sqrt(3)/2 //Ratio of horizontal to vertical spacing = height of an equilateral triangle
const baseSize=50 //Base scale: height of a vartical step (in svg coordinates)

// Conversion between tonnetz coordinates and svg coordinates
const logicalToSvgX = node => node.x * xstep * baseSize;
const logicalToSvgY = node => (node.y + node.x/2) * baseSize;
const logicalToSvg = node => ({x:logicalToSvgX(node), y:logicalToSvgY(node)})


// ============================================================================
// Vue components and mixins

//TODO: Restructure to avoid having to forward declare it.
var piano; //Variable to hold the virtual piano (built later once JZZ is loaded)
//var midiBus; //Variable to hold the bus for upgoing midiEvents (built once Vue is loaded)
var proto; //Variable to hold the main app Object (built once everything is loaded)



// Global object to store recording and its state
//TODO: Make into an true object with methods
var record = {
    startTime:undefined,
    SMF:undefined,
    recording:false
}

// Wait for libraries to be loaded
fallback.ready(function(){

// The App's main object, handling global concerns
proto = new Vue({
    //TODO: break up some functions into separate components
    el: '#proto',
    components: {clockOctave,songLoader,pianoKeyboard,playRecorder,tonnetzView,languageSelector},
    data: {
        // The list of all 3-interval Tonnetze
        //TODO: Move to non-reactive data
        tonnetze: tonnetze3,
        // The selected interval set
        intervals: tonnetze3[9],
        // The type of representation for the main window ('tonnetz' or 'chicken')
        type: 'tonnetz',
        // The list of all notes: their name and their status
        notes: [
            {text: 'A',  count:0},
            {text: 'A♯', count:0},
            {text: 'B',  count:0},
            {text: 'C',  count:0},
            {text: 'C♯', count:0},
            {text: 'D',  count:0},
            {text: 'D♯', count:0},
            {text: 'E',  count:0},
            {text: 'F',  count:0},
            {text: 'F♯', count:0},
            {text: 'G',  count:0},
            {text: 'G♯', count:0}
        ],

        // Synthetiser engine
        //TODO: Find a way to have nice output on Safari and Firefox
        synth: JZZ.synth.Tiny(),
        //synth:JZZ.synth.MIDIjs({ 
            //TODO: Use a soundfont from our own server
            //soundfontUrl: "https://raw.githubusercontent.com/mudcube/MIDI.js/master/examples/soundfont/", 
            //instrument: "acoustic_grand_piano" })
                //.or(function(){ proto.loaded(); alert('Cannot load MIDI.js!\n' + this.err()); })
                //.and(function(){ proto.loaded(); }),
        // Azerty keyboard bindings
        ascii: JZZ.input.ASCII({//TODO: Adapt to keyboard layout
                W:'C5', S:'C#5', X:'D5', D:'D#5', C:'E5', V:'F5',
                G:'F#5', B:'G5', H:'Ab5', N:'A5', J:'Bb5', M:'B5'
                }),
        
        // Should trajectory drawing be active?
        trace: false,
        // The localisation strings
        allStrings: strings,
        // The picked locale
        language: language || en
    },
    computed:{
        complementNotes: function(){
            return this.notes.map(note => ({text:note.text, count:note.count?0:1}));
        },
        strings: function(){
            return strings[this.language]
        }
    },
    created: function(){
        //Delay connection of MIDI devices to let JZZ finish its initialisation
        let deviceUpdate=this.deviceUpdate; // This is required to bring deviceUpdate into the lambda's context
        setTimeout(function(){deviceUpdate({inputs:{added:JZZ().info().inputs}})},1000);
        //Add a watcher to connect (and disconnect) new devices to the app
        JZZ().onChange(this.deviceUpdate);
    },
    methods:{
        //Handler for JZZ device change event
        deviceUpdate: function({inputs:{added,removed}}){
            //TODO: replace log by a small info message on screen
            console.log('Updating MIDI devices');
            if(added){
                for(device of added){
                    JZZ().openMidiIn(device.name)
                      .connect(midiBus.midiThru) // Send the keyboard's events to the midi bus which will relay them
                      .connect(restartTimeout); // Reset the page's timeout upon input
                    console.log('Added device: ',device);
                }
            }
            if(removed){
                for(device of removed){
                    JZZ().openMidiIn(device.name).disconnect(midiBus.midiThru);
                    console.log('Removed device: ',device);
                }
            }
            this.resetNotes(); // Connection/Disconnection can cause unbalanced note events
        },
        
        //Handler for Midi events coming from JZZ
        midiHandler: function (midiEvent){
            noteIndex = (midiEvent.getNote()+3) %12
            if(midiEvent.isNoteOn()){
                this.notes[noteIndex].count++;
            }else if(midiEvent.isNoteOff()){
                if(this.notes[noteIndex].count > 0){
                    this.notes[noteIndex].count--;
                }else{
                    console.log('Warning: ignored unbalanced noteOff event', midiEvent);
                }
            }
        },
        resetNotes: function(){
            for (note of this.notes){
                note.count = 0;
            }
        },
        traceToggle: function(){
            this.trace = !this.trace;
        },
        // Handlers for playback events fired from the app
        noteOn: function(pitches){
            //var notes = this.node2Notes(nodes);
            for (var pitch of pitches){
                midiBus.midiThru.noteOn(0,pitch,100);
            }
        },
        noteOff: function(pitches){
            //var notes = this.node2Notes(nodes);
            for (var pitch of pitches){
                midiBus.midiThru.noteOff(0,pitch,100);
            }
        },
        // Hard reset for the whole page
        // TODO: switch language without reloading
        reset(option) {
            if(option){
                window.location.search = '?hl='+option;
                console.log(window.location)
            }
            else{
                window.location.reload();
            }
        }
    },
    mounted(){
        //Handle midiBus events
        midiBus.$on('note-on',this.noteOn);
        midiBus.$on('note-off',this.noteOff);

        //Connect the Midi
        this.ascii.connect(midiBus.midiThru);
        midiBus.midiThru.connect(this.synth);
        midiBus.midiThru.connect(this.midiHandler);   
    }
})

}) // fallback.ready