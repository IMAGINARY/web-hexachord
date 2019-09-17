let playRecorder = {
    components: {songLoader},
    data: function(){return{
        // The Midi player provided by JZZ
        player: {playing:false, play:noop, pause:noop, stop: noop, resume:noop},
        // Is recording in progress?
        recording: false,
        // Is the modal window open?
        modal: false,
        startTime:undefined,
        SMF:undefined,
        recording:false
    }},
    computed:{
        strings: function(){return this.$root.strings}
    },
    methods:{
        resetNotes: function(){
            this.$emit('reset-notes');
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
        },
        // Loads a Midi File from its byte representation
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
            this.SMF=this.SMF;
            this.player = this.SMF.player();
            this.player.connect(midiBus.midiThru);
            this.resetNotes();
        },
        rotate: function(){
            this.stop()
            this.rotateTrajectory(this.SMF);
            // Does the player really need to be reassigned ?
            this.player=this.SMF.player();
            this.player.connect(midiBus.midiThru);

            this.player.play();
        },
        translate: function(translate=1){
            this.stop()
            this.translateTrajectory(this.SMF,translate);
            // Does the player really need to be reassigned ?
            this.player=this.SMF.player();
            this.player.connect(midiBus.midiThru);

            this.player.play();
        },
        //Simple version operating on pitches alone
        rotateTrajectory : function (SMF) {
            for (SMFTrack of SMF){
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
        // Toggles recording and performs setup and unwinding of the recording
        recordToggle: function(){
            if(this.recording){
                this.recording = false;
                this.SMF[0].add(new Date().getTime() - this.startTime,JZZ.MIDI.smfEndOfTrack());
                this.recording = false;
                this.stop();
                this.fromTrajectory();
            }else{
                this.recording = true;
                this.SMF = new JZZ.MIDI.SMF(0,500); // 500 tpb, 120 bpm => 1 tick per millisecond
                this.SMF.push(new JZZ.MIDI.SMF.MTrk());
                this.SMF[0].add(0,JZZ.MIDI.smfBPM(120));
                this.startTime = new Date().getTime();
                this.recording = true;
            }
        },
        midiHandler: function(midiEvent){
            if(this.recording){
                if(midiEvent.isNoteOn()){
                    this.SMF[0].add(new Date().getTime()-this.startTime,JZZ.MIDI.noteOn(midiEvent.getChannel(),midiEvent.getNote(),midiEvent[2]))
                }else if(midiEvent.isNoteOff()){
                    this.SMF[0].add(new Date().getTime()-this.startTime,JZZ.MIDI.noteOff(midiEvent.getChannel(),midiEvent.getNote()));
                }else if(midiEvent.ff!==0x51){ // Ignore tempo events which mess with timing
                    this.SMF[0].add(new Date().getTime()-this.startTime,midiEvent);
                }
            }
        },
        download: function(){
            let str = this.SMF.dump(); // MIDI file dumped as a string
            let b64 = JZZ.lib.toBase64(str); // convert to base-64 string

            let uri = 'data:audio/midi;base64,' + b64; // data URI
            var element = document.createElement('a');
            element.setAttribute('href', uri);
            element.setAttribute('download', 'export.mid');

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
        }
    },
    mounted: function(){
        midiBus.connect(this.midiHandler);
    },
    template: `
        <div class="record" v-cloak>
            <button id=load v-on:click='modal = true'>{{ strings.load }}</button>
            <button v-show="SMF" id=btn v-on:click='playPause'> {{ player.playing ? strings.pause : strings.play }} </button>
            <button v-show="player.playing" id=stop @click="stop">{{ strings.stopPlay }}</button>
            <button id=recordButton @click='recordToggle'>{{ recording ? strings.stopRecord : strings.start }}</button>
            <button v-show="SMF" id=rotate @click='rotate'>{{ strings.rotate }}</button>
            <button v-show="SMF" id=translate @click='translate(1)'>{{ strings.translate }}</button>
            <button v-show="SMF" id=export @click='download'>{{ strings.export }}</button>
            <song-loader v-show="modal" @load="load" @cancel="modal=false" file-browser></song-loader>
        </div>
    `
}

var Tonnetz_playRecorder = true