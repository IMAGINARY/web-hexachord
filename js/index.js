//Author: Corentin Guichaoua

// Vue.config.devtools = true
// Vue.config.performance = true


//TODO: Add credit info, with paper to cite



// ============================================================================

// Reload the screen after 2 minutes of inactivity.
let timeout = null;
function restartTimeout() {
  clearTimeout(timeout);
  timeout = setTimeout(() => window.location.reload(), 1000 * 120); // 2 mins
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

let tonnetze3 = [
            [1,1,10],
            [1,2,9],
            [1,3,8],
            [1,4,7],
            [1,5,6],
            [2,2,8],
            [2,3,7],
            [2,4,6],
            [2,5,5],
            [3,4,5],
            [3,3,6],
            [4,4,4]
];

// The App's main object, handling global concerns
proto = new Vue({
    //TODO: break up some functions into separate components
    el: '#proto',
    components: {dragZoomSvg,tonnetzPlan,chickenWire,clockOctave,songLoader,pianoKeyboard,playRecorder},
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
        
        // The currently loaded Midi file handler
        SMF: undefined,
        // The Midi player provided by JZZ
        player: {playing:false, play:noop, pause:noop, stop: noop, resume:noop}, // TODO: replace by a dummy player
        // Should trajectory drawing be active?
        trace: false,
        // Is recording in progress?
        recording: false,
        // Is the modal window open?
        modal: false,
        // The localisation strings
        allStrings: strings,
        // The picked locale
        strings: strings[language] || strings.en
    },
    computed:{
        isConnected: function(){
            return this.intervals.reduce(gcd,12)===1;
        },
        complementNotes: function(){
            return this.notes.map(note => ({text:note.text, count:1-note.count}));
        }
    },
    created: function(){
        //Delay connection of MIDI devices to let JZZ finish its initialisation
        let deviceUpdate=this.deviceUpdate; // This is required to bring deviceUpdate into the lambda's context
        setTimeout(function(){deviceUpdate({inputs:{added:JZZ().info().inputs}})},1000);
        //Add a watcher to connect (and disconnect) new devices to the app
        JZZ().onChange(this.deviceUpdate);
        
        this.ascii.connect(midiBus.midiThru);
        midiBus.midiThru.connect(this.synth);
        midiBus.midiThru.connect(this.midiHandler);   
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
            if(record.recording){
                if(midiEvent.isNoteOn()){
                    record.SMF[0].add(new Date().getTime()-record.startTime,JZZ.MIDI.noteOn(midiEvent.getChannel(),midiEvent.getNote(),midiEvent[2]))
                }else if(midiEvent.isNoteOff()){
                    record.SMF[0].add(new Date().getTime()-record.startTime,JZZ.MIDI.noteOff(midiEvent.getChannel(),midiEvent.getNote()));
                }else if(midiEvent.ff!==0x51){ // Ignore tempo events which mess with timing
                    record.SMF[0].add(new Date().getTime()-record.startTime,midiEvent);
                }
            }
        },
        //Toggles playback
        playPause: function() {
            if (this.player.playing) {
                this.player.pause();
            }else if(this.player.paused){
                this.player.resume();
            }else{
                this.resetNotes();
                this.player.play();
            }
        },
        // Stops playback
        stop: function(){
            if(this.player){
                this.player.stop(); 
            }
            setTimeout(this.resetNotes,10); // Reset in a timer in case some timers could not be cleared
            //This can occur when some events'handling are queued behind this function
            //TODO: Find if there is a way to clear queued events to handle this more cleanly
        },
        resetNotes: function(){
            for (note of this.notes){
                note.count = 0;
            }
        },
        traceToggle: function(){
            this.trace = !this.trace;
        },
        // Loads a Midi File from its byte representation
        //TODO: encapsulate this in a loader component
        load: function(data, name) {
            this.modal=false;
            this.resetNotes();
            if(this.player.playing){
                this.stop();
            }
            try {
                this.SMF = JZZ.MIDI.SMF(data);
                this.player = this.SMF.player();
                this.player.connect(midiBus.midiThru);
                this.player.play();
            } catch (e) {
                console.log(e);
                throw e;
            }
        },
        // Loads the recorded midi
        fromTrajectory : function () {
            //Stop playback to avoid overlapping
            if(this.player.playing){
                this.stop();
            }
            this.SMF=record.SMF;
            this.player = record.SMF.player();
            this.player.connect(midiBus.midiThru);
            this.resetNotes();
        },
        //TODO: Fix 0.5 s slowdown
        rotate: function(){
            this.stop()
            this.rotateTrajectory(this.SMF);
            // TODO: Does the player really need to be reassigned ?
            this.player=this.SMF.player();
            this.player.connect(midiBus.midiThru);

            this.player.play();
        },
        //TODO: Fix 0.5 s slowdown
        translate: function(translate=1){
            this.stop()
            this.translateTrajectory(this.SMF,translate);
            // TODO: Does the player really need to be reassigned ?
            this.player=this.SMF.player();
            this.player.connect(midiBus.midiThru);

            this.player.play();
        },
        //Simple version operating on pitches alone
        rotateTrajectory : function (SMF) {
            for (SMFTrack of SMF){
                //TODO: ignore drums track since midi pitch has a different meaning there
                let symmetryCenter = undefined;
                for (SME of SMFTrack){
                    let note = SME.getNote();
                    if(note !== undefined){
                        if (symmetryCenter === undefined){
                            symmetryCenter = note;
                        }else{
                            noteIntervalClass = mod(2*(symmetryCenter - note),12)
                            // If the interval is a fifth or more, take the descending interval instead
                            if(noteIntervalClass > 6){  
                                note += noteIntervalClass-12
                            }else{
                                note += noteIntervalClass
                            }
                        }
                        SME.setNote(note);
                    }
                }
            }
        },
        // Transposes a recording by a given number of semitones
        translateTrajectory : function (SMF,translate) {
            for (SMFTrack of SMF){
                for (SME of SMFTrack){
                    let note = SME.getNote();
                    if(note !== undefined){
                        SME.setNote(note+translate);
                    }
                }
            }
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
        // Toggles recording and performs setup and unwinding of the recording
        recordToggle: function(){
            if(this.recording){
                this.recording = false;
                record.SMF[0].add(new Date().getTime() - record.startTime,JZZ.MIDI.smfEndOfTrack());
                record.recording = false;
                this.stop();
                this.fromTrajectory();
            }else{
                this.recording = true;
                record.SMF = new JZZ.MIDI.SMF(0,500); // 500 tpb, 120 bpm => 1 tick per millisecond
                record.SMF.push(new JZZ.MIDI.SMF.MTrk());
                record.SMF[0].add(0,JZZ.MIDI.smfBPM(120));
                record.startTime = new Date().getTime();
                record.recording = true;
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