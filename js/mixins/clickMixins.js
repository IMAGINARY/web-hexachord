// Mixins used in various components

// Provides MIDI playback on click for the slotted element
// The slotted element must be valid svg markup
let clickToPlayWrapper = {
    props: {
        pitches: { //The midi pitches to be played upon activation 
            type:Array,
            required:true,
            validator: function(pitches){
                return pitches.every( isMidiPitch )
            }
        }
    },
    data: function (){return{
        clicked: false
    }},
    methods:{
        clickOn: function(){
            if(!this.clicked){
                this.clicked=true;
                midiBus.$emit('note-on',this.pitches);
            }
        },
        clickOff: function(){
            if(this.clicked){
                this.clicked=false;
                midiBus.$emit('note-off',this.pitches);
            }
        },
        enter: function(event){
            if(event.pressure!==0){//Pointer is down
                this.clickOn();
            }
        }
    },
    template:`
        <g @pointerdown="clickOn()" 
        @pointerup="clickOff()"
        @pointerenter="enter" 
        @pointerleave="clickOff()"
        @touchstart.prevent
        @touchmove.prevent
        @touchend.prevent>
            <slot/>
        </g>
    `
}

// Provides the isActive check
// Must still be used in the template to have any effect
var activableMixin = {
    props: {
        notes:{
            type: Array,
            required: true
        },
        forceState:{ // -1, 0, 1, 2 for free, inactive, traversed and active respectively
            type: Number,
            default: -1,
            validator: n => [-1,0,1,2].includes(n)
        }
    },
    computed: {
        isActive : function(){
            return (this.forceState===-1 && this.notes.every(elem => elem.count > 0)) // State is free and notes are active
                || this.forceState===2; // or state is forced active
        },
        semiActive: function(){
            return this.forceState === 1;
        }
    }
}

var Tonnetz_mixins = true