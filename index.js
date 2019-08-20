//Author: Corentin Guichaoua

// Vue.config.devtools = true
// Vue.config.performance = true

// Wait for libraries to be loaded
fallback.ready(function(){

// ============================================================================
// i18n Strings

const search = location.search.match(/hl=(\w*)/);
const language = search ? search[1] : 'en';

const strings = {
  en: {
    title: 'The Tonnetz',
    subtitle: 'One key – many representations',
    dual: 'Dual',
    reset: 'Reset',
    load: 'Load Midi File',
    start: 'Start Recording',
    stopRecord: 'Stop Recording',
    play: 'Play',
    stopPlay: 'Stop Playing',
    pause: 'Pause',
    rotate: 'Rotate 180°',
    translate: 'Translate',
    connected: 'This Tonnetz is non-connected and doesn’t contain every note.',
    notes: ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab']
  },
  de: {
    title: 'Das Tonnetz',
    subtitle: 'Ein Klang – viele Darstellungen',
    dual: 'Dual',
    reset: 'Zurücksetzen',
    load: 'Midi Datei Laden',
    start: 'Aufnehmen',
    stopRecord: 'Aufnahme Stoppen',
    play: 'Abspielen',
    stopPlay: 'Abspiel Stoppen',
    pause: 'Pause',
    rotate: '180° Rotieren',
    translate: 'Verschieben',
    connected: 'Dieses Tonnetz ist nicht verbunden, und enthält nicht alle Noten.',
    notes: ['A', 'B', 'H', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab']
  },
  fr: {
    title: 'Le Tonnetz',
    subtitle: 'Note unique — Représentations nombreuses',
    dual: 'Dual',
    reset: 'Réinitialiser',
    load: 'Charger des données Midi',
    start: 'Enregistrer',
    stopRecord: "Arrêter l'enregistrement",
    play: 'Lecture',
    stopPlay: 'Arrêt',
    pause: 'Pause',
    rotate: 'Rotation à 180°',
    translate: 'Translation',
    connected: "Ce Tonnetz n'est pas connexe et ne contient pas toutes les notes.",
    notes: ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab']
  },
  hi: {
    title: 'सरगम',
    subtitle: 'एक स्वर, रूप अनेक',
    dual: 'Dual',
    reset: 'Reset',
    load: 'मिडी फाइल खोलें',
    start: 'रिकॉर्डिंग शुरू करें',
    stopRecord: 'रिकॉर्डिंग ख़त्म करें',
    play: '▶️ Play',
    stopPlay: '⏹ Stop Playing',
    pause: '⏸ Pause',
    rotate: '180° पलटें',
    translate: 'अनुवाद करें',
    connected: 'इस जोड़ में सभी स्वर नहीं है.',
    notes: ['ध', 'निb', 'नि', 'सा', 'रेb', 'रे', 'गb', 'ग', 'म', 'पb', 'प', 'धb']
  }
}

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
// Misc utility functions

//Clips a value to remain between the bounds fixed by mini and maxi
function bound(value,mini,maxi){
    return Math.min(maxi,Math.max(mini,value));
}

//True modulo function (always positive for positive period)
function mod(value,period){
    return ((value%period)+period)%period
}

// create a generator function returning an
// iterator to a specified range of numbers
function* range (begin, end, interval = 1) {
    for (let i = begin; i < end; i += interval) {
        yield i;
    }
}

//Greatest common divisor
function gcd(a, b) {
    if ( ! b) {
        return a;
    }
    return gcd(b, a % b);
};

// Basic memoizer
// Warning: do not mutate returned objects as it will mutate the cache
function memo(func){
    var cache = {};
      return function(){
        var key = JSON.stringify(arguments);
        if (cache[key]){
          //console.log(cache)
          return cache[key];
        }
        else{
          val = func.apply(null, arguments);
          cache[key] = val;
          return val; 
        }
    }
  }

//Used for validation
function isSubset(a, b){
    return a.every(val => b.includes(val));
}

//Is pitch a valid Midi pitch ?
//TODO: Accept valid string identifiers too ('C#3', etc.)
function isMidiPitch(pitch){
    return pitch >= 0 && pitch < 128;
}


// ============================================================================
// Geometry constants and coordinate conversions

const xstep=Math.sqrt(3)/2 //Ratio of horizontal to vertical spacing = height of an equilateral triangle
const baseSize=50 //Base scale: height of a vartical step (in svg coordinates)

// Conversion between tonnetz coordinates and svg coordinates
const logicalToSvgX = node => node.x * xstep * baseSize;
const logicalToSvgY = node => (node.y + node.x/2) * baseSize;
const logicalToSvg = node => ({x:logicalToSvgX(node), y:logicalToSvgY(node)})


// ============================================================================
// Create the virtual keyboard
//TODO: Make a Vue component to encapsulate it 
//TODO: Use an independent bus to connect the Midi pipeline (removing the piano breaks the app)
var piano = JZZ.input.Kbd(
    {
        at:'piano', 
        from:'C3', 
        to:'B7', 
        onCreate:function() {
            this.getBlackKeys().setStyle({color:'#fff'});
        // Uncomment to add keybind hints (azerty layout)
        //TODO: handle this as a Vue component option
        //TODO: probe keyboard layout instead of static keybind
        // this.getKey('C5').setInnerHTML('<span class=inner>W</span>');
        // this.getKey('C#5').setInnerHTML('<span class=inner>S</span>');
        // this.getKey('D5').setInnerHTML('<span class=inner>X</span>');
        // this.getKey('D#5').setInnerHTML('<span class=inner>D</span>');
        // this.getKey('E5').setInnerHTML('<span class=inner>C</span>');
        // this.getKey('F5').setInnerHTML('<span class=inner>V</span>');
        // this.getKey('F#5').setInnerHTML('<span class=inner>G</span>');
        // this.getKey('G5').setInnerHTML('<span class=inner>B</span>');
        // this.getKey('G#5').setInnerHTML('<span class=inner>H</span>');
        // this.getKey('A5').setInnerHTML('<span class=inner>N</span>');
        // this.getKey('A#5').setInnerHTML('<span class=inner>J</span>');
        }
    });

// ============================================================================
// Vue components and mixins

// Empty Vue instance to act as a bus for note interaction Events
var midiBus=new Vue({});
// Provides MIDI playback on click for the slotted element
// The slotted element must be valid svg markup
let clickToPlayWrapper = {
    props: {
        pitches: { //The midi pitches to be played upon activation 
            type:Array,
            required:true,
            validator: function(pitches){
                pitches.every( isMidiPitch )
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
            default: -1
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

// Note component : a clickable circle with the note name
let noteTonnetz = {
    mixins: [activableMixin],
    template: `
        <g>
            <circle v-bind:class="{activeNode:isActive, visitedNode:semiActive}"
                r="12" v-bind:data-key="notes[0].id">
            </circle> 
            <text>
                {{ notes[0].text }}
            </text>
        </g>
        `
};

// Dichord component : a clickable line between the two notes that it contains, with a small circle for easier clicking
let dichordTonnetz = {
    mixins: [activableMixin],
    props: {
        shape:{ //Relative (Tonnetz) coordinates of the chord
            //TODO: Factorize with trichords
            type: Array,
            required: true
        }
    },
    computed: {
        coordsHTML: function (){ // Coordinates in the HTML format for lines
            return {
                x1 : 0,
                x2 : logicalToSvgX(this.shape[1]),
                y1 : 0,
                y2 : logicalToSvgY(this.shape[1])
            }
        },
        center: function (){
            return {
                x: (this.coordsHTML.x2)/2,
                y: (this.coordsHTML.y2)/2
            }
        }
    },
    template: `
    <g>
        <line v-bind:class="{activeDichord:isActive, visitedDichord:semiActive}" 
            v-bind="coordsHTML">
        </line> 
        <circle v-bind:class="{activeDichord:isActive}"
                v-bind:cx="center.x" v-bind:cy="center.y" r="2">
        </circle> 
    </g>
    `
};

// Trichord component : a clickable triangle between the three notes that it contains
let trichordTonnetz = {
    mixins: [activableMixin],
    props: {
        shape: { //Relative (Tonnetz) coordinates of the chord
            type: Array,
            required: true
        }
    },
    computed: {
        coords: function (){ // Relative SVG coordinates of the chord
            return this.shape.map(logicalToSvg);
        },
        points: function (){ // Coordinates in the HTML format for polygons
            return this.coords.map( ({x,y}) => `${x},${y}` ).join(' ')
        }
    },
    template: `
        <polygon v-bind:class="{activeTrichord:isActive, visitedTrichord:semiActive}" 
            v-bind:points="points"/>
        `
};

// Slotted component that handles the drag and zoom logic on an svg
let dragZoomSvg = {
    props: {
        height: Number, // Height of the View (before reactive scaling)
        width: Number, // Width of the View (before reactive scaling)
        scaleBounds: Object // Min and max zoom level
    },
    data: function(){return{
        //Transformation data
        tx      : 0,
        ty      : 0,
        scale   : 2,
        //Capture data
        captureMouse: false,
        clickedPos  : {x:0,y:0},
    }},
    computed: {
        transform: function(){
            return `scale(${this.scale}) translate(${this.tx} ${this.ty})`
        },
        viewbox: function(){
            return `0 0 ${this.width} ${this.height}`
        },
        bounds: function(){ //SVG coordinates of the bounds to forward to children components
            return{
                xmin:-this.tx,
                ymin:-this.ty,
                xmax:-this.tx+this.width /this.scale,
                ymax:-this.ty+this.height/this.scale,
            }
        }
    },
    methods: {
        zoomInOut: function (wheelEvent){
            var multiplier = Math.exp(-wheelEvent.deltaY/600)
            // Bound the multiplier to acceptable values
            multiplier = bound(multiplier,this.scaleBounds.mini/this.scale,
                                          this.scaleBounds.maxi/this.scale);
            if(multiplier===1){
                return //Don't bother with the rest if nothing changes
            }
            
            //Find the pointer's position in the svg referential: this will be the fixed point of the zoom

            //On Firefox, offset is relative to the DOM element from which the event is fired,
            //not that in which it is handled, so this doesn't work everywhere
            //var pointer = {x:wheelEvent.offsetX,y:wheelEvent.offsetY};
            //Workaround:
            let pointer = {x: wheelEvent.clientX - this.$el.getBoundingClientRect().left,
                           y: wheelEvent.clientY - this.$el.getBoundingClientRect().top};

            //There is probably a better way to find it
            var pointerSvg = ({x:pointer.x/this.scale-this.tx,
                               y:pointer.y/this.scale-this.ty});

            //Update translation to keep the point under the pointer in place
            this.tx = (this.tx + pointerSvg.x)/multiplier - pointerSvg.x
            this.ty = (this.ty + pointerSvg.y)/multiplier - pointerSvg.y
            this.scale = this.scale*multiplier
            return
        },
        drag: function (event){
            if (this.captureMouse){
                var dx = event.clientX - this.clickedPos.x
                var dy = event.clientY - this.clickedPos.y
                this.tx += dx / this.scale
                this.ty += dy / this.scale
                this.clickedPos = {x:event.clientX,y:event.clientY}
            }
            return
        },
        captureOn: function (event){
            this.captureMouse = true
            this.clickedPos = {x:event.clientX,y:event.clientY}
            return
        },
        captureOff: function (event){
            this.captureMouse = false
            return
        }
    },
    template: `
        <svg id="svg" class="tonnetz" 
        v-bind:width="width" v-bind:height="height" 
        v-bind:viewBox="viewbox"
        v-on:wheel.prevent="zoomInOut"
        v-on:pointerdown="captureOn"
        v-on:pointerup="captureOff"
        v-on:pointerleave="captureOff"
        v-on:pointermove="drag">
            <g ref="trans" v-bind:transform="transform">
                <slot :bounds="bounds"/>
            </g>
        </svg>
    `
}

// Slotted component that wraps the svg element and forwards bound info to the children
let staticViewSvg = {
    props: {
        height: Number,
        width: Number,
        tx : {
            type: Number,
            default: 0
        },
        ty : {
            type: Number,
            default: 0
        },
        scale: {
            type: Number,
            default: 2
        },
    },
    computed: {
        transform: function(){
            return `scale(${this.scale}) translate(${this.tx} ${this.ty})`
        },
        viewbox: function(){
            return `0 0 ${this.width} ${this.height}`
        },
        bounds: function(){
            return{
                xmin:-this.tx,
                ymin:-this.ty,
                xmax:-this.tx+this.width /this.scale,
                ymax:-this.ty+this.height/this.scale,
            }
        }
    },
    template: `
        <svg id="svg" class="tonnetz" 
        v-bind:width="width" v-bind:height="height" 
        v-bind:viewBox="viewbox" >
            <g ref="trans" v-bind:transform="transform">
                <slot :bounds="bounds"/>
            </g>
        </svg>
    `
}

// Mixin that groups the trajectory functionnality. Calls on TonnetzLike properties and methods
let traceHandler = {
    props:{
        trace: {
            type: Boolean,
            default: false
        }
    },
    data: function(){return {
        trajectory : [], // The array of the traversed note nodes. A trajectory element should be a pair of a MIDI event and its associated position
        active: [],
        visited: new Set() // The string keys of all visited nodes and chords
    }},
    computed:{
        // The array of nodes (resp dichords and trichords) to be rendered, paired with their status
        nodeStateList: function(){
            return this.nodeList.map(node => ({node,status:this.status(node)}) );
        },
        dichordStateList: function(){
            return this.dichordList.map(nodes => ({nodes,status:this.chordStatus(nodes)}) );
        },
        trichordStateList: function(){
            return this.trichordList.map(nodes => ({nodes,status:this.chordStatus(nodes)}) );
        },
        memoNode2Notes: function(){ // Memoize so the returned objects evaluate as equal and no change is detected
            this.intervals && this.notes // Force dependency so the memo's cache is emptied
            return memo(this.node2Notes);
        },
        memoShape: function(){ // Memoize so the returned objects evaluate as equal and no change is detected
            return memo(this.shape);
        }
    },
    watch:{
        trace: function(){// If trace changes, either we don't need the trajectory anymore or we start a new one.
            this.resetTrajectory();
        },
        intervals : function(){// If intervals changes, the current trajectory is no longer valid
            //TODO: recalculate a valid trajectory ?
            this.resetTrajectory();
        }
    },
    methods:{
        // Tells whether a given node is activated (2), was activated earlier (1) or is not (0), or lets the node decide (-1)
        status: function(node){
            if (this.trace){
                let isActive = this.active.some(nodeB => nodeB.x==node.x && nodeB.y==node.y);
                if(isActive){
                    return 2;
                }else{
                    if(this.visited.has(this.genKey([node]))){
                        return 1;
                    }
                    else{
                        return 0;
                    }
                }
            }else return -1; // Delegate activation control if trajectory mode is off (minimises recomputations)
        },
        // Same as above but for chords
        chordStatus: function(nodes){
            if(this.trace){
                if(nodes.every(node => this.active.some(nodeB => nodeB.x==node.x && nodeB.y==node.y))){
                    return 2;
                }else if(this.visited.has(this.genKey(nodes))){
                    return 1;
                }else{
                    return 0;
                }
            }else{
                return -1;
            }
        },
        resetTrajectory: function(){
            this.trajectory = [];
            this.active = [];
            this.visited.clear();
        },
        //Returns the node matching the note closest to the provided node
        closestNode(node,note){
            // TODO: compute closest between nodes/note sets
            // Dumb way: enumerate all neighbours up to distance 3 (max for 12 tone Tonnetze)
            const d1 = [{x:0,y:1},{x:0,y:-1},{x:1,y:0},{x:-1,y:0},{x:-1,y:1},{x:1,y:-1}]; // Neighbours of distance 1
            const d2 = [{x:0,y:2},{x:1,y:1},{x:0,y:2},{x:0,y:-2},{x:-1,y:-1},{x:-2,y:0}, //z=0
                        {x:-1,y:2},{x:-2,y:1},{x:1,y:-2},{x:2,y:-1},{x:-2,y:2},{x:2,y:-2}]; // Neighbours of distance 2
            const d3 = [{x:0,y:3},{x:1,y:2},{x:2,y:1},{x:3,y:0},{x:0,y:-3},{x:-1,y:-2},{x:-2,y:-1},{x:-3,y:0},
                        {x:-3,y:3},{x:-3,y:2},{x:-3,y:1},{x:3,y:-3},{x:3,y:-2},{x:3,y:-1},
                        {x:-2,y:3},{x:-1,y:3},{x:2,y:-3},{x:1,y:-3}]; // Neighbours of distance 3
            if(mod(this.nodesToPitches([node])[0]-57,12)==note){
                return node;
            }
            for(neighbourList of [d1,d2,d3]){ //This should be enough as no distance should exceed 3
                for(nodeOffset of neighbourList){
                    let newNode={x:node.x+nodeOffset.x,y:node.y+nodeOffset.y};
                    if(mod(this.nodesToPitches([newNode])[0]-57,12)==note){
                        return newNode;
                    }
                }
            }
            console.log("Couldn't find closest neighbour");
        },
        // Marks active chords as visited
        updateChords: function(){
            //TODO: Check only changed nodes.
            for(node of this.active){
                for(dnode of [{x:1,y:0},{x:0,y:1},{x:-1,y:1}]){
                    if(this.active.some(nodeB => nodeB.x==node.x+dnode.x && nodeB.y==node.y+dnode.y)){
                        let nodes = [node,{x:node.x+dnode.x,y:node.y+dnode.y}];
                        this.visited.add(this.genKey(nodes));
                    }
                }
                for(dnodes of [{x1:1,x2:0,y1:0,y2:1},{x1:-1,x2:0,y1:1,y2:1}]){
                    if(this.active.some(nodeB => nodeB.x==node.x+dnodes.x1 && nodeB.y==node.y+dnodes.y1) 
                    && this.active.some(nodeB => nodeB.x==node.x+dnodes.x2 && nodeB.y==node.y+dnodes.y2)){
                        let nodes = [node,{x:node.x+dnodes.x1,y:node.y+dnodes.y1},{x:node.x+dnodes.x2,y:node.y+dnodes.y2}];
                        this.visited.add(this.genKey(nodes));
                    }
                }
            }
        },
        addToTrajectory: function(pitches){
            if(this.trace){
                // First version: consider multi-pitched events as successive events
                // TODO: group midi events in close succession for processing (faster and better trajectory)
                // TODO: override position if the event comes from playing the Tonnetz
                for(pitch of pitches){
                    //Check if the note is reachable in this Tonnetz
                    let noteNumber = mod(pitch - 9,12);
                    let tonnetzGCD = this.intervals.reduce(gcd,12);
                    if(!(noteNumber%tonnetzGCD)){
                        // The reference is the last node, or (0,0) if this is the first node
                        let reference = this.trajectory.length > 0 ? this.trajectory[this.trajectory.length-1] : {x:0,y:0};
                        let node = this.closestNode(reference,noteNumber);
                        this.trajectory.push(node);
                        this.active.push(node);
                        this.visited.add(this.genKey([node]));
                    }else{
                        console.log("Unreachable note")
                    }
                }
                this.updateChords();
            }
        },
        removeActive: function(pitches){
            if(this.trace){
                for(pitch of pitches){
                    let firstMatch = this.active.findIndex(node => mod(this.nodesToPitches([node]),12) === mod(pitch,12));
                    let node = this.active[firstMatch];
                    if(firstMatch !== -1){
                        this.active.splice(firstMatch,1);
                        this.trajectory.push(node)
                    }else{
                        console.log(`Couldn't remove pitch ${pitch} from active nodes`);
                    }
                }
            }
        },
        midiDispatch: function(midiEvent){
            if(this.trace){
                let index = record.length       
                if(midiEvent.isNoteOn()){
                    this.addToTrajectory([midiEvent.getNote()]);
                }else if(midiEvent.isNoteOff()){
                    this.removeActive([midiEvent.getNote()]);
                }
            }
        }
    },
    mounted(){
        //TODO: Override for events generated from within the Tonnetz (position is known)
        piano.connect(this.midiDispatch);
        // midiBus.$on('note-on',this.addToTrajectory);
        // midiBus.$on('note-off',this.removeActive);
    }
}

// Tonnetz-like component : A large component that holds the Tonnetz or the Chicken-Wire
let tonnetzLike = {
    props: {
        notes: Array, // The notes and their status, forwarded from an upper-level
        intervals: { // The intervals from which to build the Tonnetz
            type: Array,
            default: () => [3,4,5]
        },
        bounds: { // The bounds of the drawing area
            type: Object
        }
    },
    computed: {
        // Returns the notes which fit in the drawing area
        // Actually also returns nodes which don't fit but for which a chord fits
        nodeList: function (){
            var nodes = [];
            var xmin = Math.floor(this.bounds.xmin/(baseSize*xstep))
            var xmax = Math.ceil(this.bounds.xmax/(baseSize*xstep))
            for(xi of range(xmin,xmax+1)){
                ymin = Math.floor(this.bounds.ymin/(baseSize)-xi/2)
                ymax = Math.ceil(this.bounds.ymax/(baseSize)-xi/2)
                for(yi of range(ymin,ymax+1)){
                    let node = {x:xi,y:yi};
                    nodes.push(node)
                }
            }
            return nodes;
        },
        // Returns the dichords which fit in the drawing area
        dichordList: function (){
            var nodes = [];
            //For each root
            for(node of this.nodeList){
                nodes.push([{x:node.x,y:node.y},{x:node.x+1,y:node.y  }]);
                nodes.push([{x:node.x,y:node.y},{x:node.x  ,y:node.y+1}]);
                nodes.push([{x:node.x,y:node.y},{x:node.x-1,y:node.y+1}]);
            }
            return nodes;
        },
        // Returns the triangles which fit in the drawing area
        trichordList: function (){
            var nodes = [];
            //For each root (though actually the fifth)
            for(node of this.nodeList){
                nodes.push([{x:node.x,y:node.y},{x:node.x+1,y:node.y  },{x:node.x,y:node.y+1}]);
                nodes.push([{x:node.x,y:node.y},{x:node.x-1,y:node.y+1},{x:node.x,y:node.y+1}]);
            }
            return nodes;
        }
    },
    methods: {
        // Converts an array of nodes to an array of the corresponding notes
        node2Notes: function (nodes){
            return nodes.map(node => this.notes[mod(-node.x*this.intervals[0]+node.y*this.intervals[2],12)])
        },
        // Converts an array of nodes to an array of the corresponding Midi pitches
        nodesToPitches: function(nodes){
            return nodes.map(nodeIt => 81-nodeIt.x*this.intervals[0]+nodeIt.y*(this.intervals[2]-12));
        },
        // Returns the svg transform string corresponding to a node's position
        //TODO: Rename
        position: function(node){
            let {x,y} = logicalToSvg(node)
            return `translate(${x} ${y})`
        },
        // Returns the relative shape of an array of nodes
        shape: function(nodes){
            return nodes.map(node => ({
                x:node.x-nodes[0].x,
                y:node.y-nodes[0].y
            }));
        },
        // Unique identifier for an array of nodes
        genKey: function (n){
            return n.map(function textify(node){return `${node.x},${node.y}`}).join(' ')
        }
    }
};

// Global object to store recording and its state
//TODO: Make into an true object with methods
var record = {
    startTime:undefined,
    SMF:undefined,
    recording:false
}

// Specialisation of tonnetzLike to draw a Tonnetz
let tonnetzPlan = {
    components: {
        clickToPlayWrapper,
        'note': noteTonnetz,
        'dichord': dichordTonnetz,
        'trichord': trichordTonnetz
    },
    extends: tonnetzLike,
    mixins: [traceHandler],
    //TODO: Get the template into the base component (need to control the layering of elements)
    // Might not be entirely possible, then factorise as much as possible leaving only the layer ordering
    template: `
        <g>
            <clickToPlayWrapper :transform="position(n.nodes[0])"
            v-for="n in trichordStateList" v-bind:key="genKey(n.nodes)"
            :pitches="nodesToPitches(n.nodes)">
                <trichord 
                v-bind:notes="memoNode2Notes(n.nodes)"
                v-bind:nodes="n.nodes"
                :shape="memoShape(n.nodes)"
                :forceState="n.status"
                />
            </clickToPlayWrapper>

            <clickToPlayWrapper :transform="position(n.nodes[0])"
            v-for="n in dichordStateList" v-bind:key="genKey(n.nodes)"
            :pitches="nodesToPitches(n.nodes)">
                <dichord 
                v-bind:shape="memoShape(n.nodes)"
                v-bind:notes="memoNode2Notes(n.nodes)"
                :forceState="n.status"/>
            </clickToPlayWrapper>

            <clickToPlayWrapper :transform="position(n.node)"
            v-for="n in nodeStateList" v-bind:key="genKey([n.node])"
            :pitches="nodesToPitches([n.node])">
                <note v-bind:notes="memoNode2Notes([n.node])"
                v-bind:nodes="[n.node]"
                :forceState="n.status"/>
            </clickToPlayWrapper>
        </g>
    `
}

// Utility functions
const average = arr => arr.reduce((a,b) => a + b, 0) / arr.length;

// ----------------------- Chicken Wire ---------------------------
// TODO: Lots of duplicated code: factorize !

// The chicken-wire's trichord component : a clickable circle representing the chord
let trichordChicken = {
    mixins: [activableMixin],
    props: ['notes','shape','id'],
    computed: {
        x : function (){
            return average(this.shape.map(logicalToSvgX));
        },
        y : function (){
            return average(this.shape.map(logicalToSvgY));
        },
        text: function(){
            //Is this a major or minor chord ?
            //I.E. is the matching triangle in the Tonnetz right- or left-pointed
            //TODO: This is more than just minor or major, we have to clarify
            var major = (this.shape[0].y == this.shape[1].y);
            if (major){
                return this.notes[2].text; // notes[2] is the root
            }else{
                var display = this.notes[2].text;
                return display[0].toLowerCase() + display.substring(1); //Uncapitalize the root, leave the alteration
            }
        }
    },
    template: `
        <g v-bind:id="id">
            <circle v-bind:class="{activeTrichord:isActive, visitedTrichord:semiActive}"
                v-bind:cx="x" v-bind:cy="y" r="10">
            </circle> 
            <text v-bind:x="x" v-bind:y="y" font-size="12">
                {{ text }}
            </text>
        </g>
        `
}

// The chicken-wire's dichord component: a line between the two trichords that contain the same notes,
// with a small circle for easier clicking
let dichordChicken = {
    mixins: [activableMixin],
    props: ['notes','shape'],
    computed: {
        coords: function (){
            //TODO: Simplify now that we use shapes
            //Coordinates of the reference point in the svg referential
            var x0 = logicalToSvgX(this.shape[0]);
            var y0 = logicalToSvgY(this.shape[0]);
            //Orientation of the notes axis
            var dx = logicalToSvgX(this.shape[1]) - logicalToSvgX(this.shape[0]);
            var dy = logicalToSvgY(this.shape[1]) - logicalToSvgY(this.shape[0]);
            //The rotation that sends (1,0) to (dx,dy)
            var rotate = function(point){ 
                return {x: (dx*point.x-dy*point.y), 
                        y: (dy*point.x+dx*point.y)};
            };
            //The extremities of the segment if the points were 0,0 and 1,0
            var p1 = {x:0.5,y:xstep/3};
            var p2 = {x:0.5,y:-xstep/3};
            return {
                x1 : x0+rotate(p1).x,
                x2 : x0+rotate(p2).x,
                y1 : y0+rotate(p1).y,
                y2 : y0+rotate(p2).y
            }
        },
        center: function (){
            return {
                x: (this.coords.x1 + this.coords.x2)/2,
                y: (this.coords.y1 + this.coords.y2)/2
            }
        }
    },
    template: `
    <g>
        <line v-bind:class="{activeDichord:isActive, visitedDichord:semiActive}" 
            v-bind="coords">
        </line> 
        <circle v-bind:class="{activeDichord:isActive}"
                v-bind:cx="center.x" v-bind:cy="center.y" r="2">
        </circle> 
    </g>
    `
}

// The chicken-wire's note component: A clickable hexagon located between all the chords that use that note
let noteChicken = {
    mixins: [activableMixin],
    props: ['notes','nodes'],
    computed: {
        coords: function (){
            //Coordinates of the reference point in the svg referential
            var x0 = 0 //logicalToSvgX(this.shape[0]);
            var y0 = 0 //logicalToSvgY(this.shape[0]);

            return[
                {x:x0+baseSize*xstep/3,  y:y0+baseSize/2},
                {x:x0-baseSize*xstep/3,  y:y0+baseSize/2},
                {x:x0-baseSize*2*xstep/3,y:y0},
                {x:x0-baseSize*xstep/3,  y:y0-baseSize/2},
                {x:x0+baseSize*xstep/3,  y:y0-baseSize/2},
                {x:x0+baseSize*2*xstep/3,y:y0}
            ]
        },
        points: function (){
            return this.coords.map( ({x,y}) => `${x},${y}` ).join(' ')
        }
    },
    template: `
        <polygon v-bind:class="{activeNode:isActive, visitedNode:semiActive}" 
            v-bind:points="points" v-bind:data-key="notes[0].id"/>
        `
}

// Specialisation of tonnetzLike to draw the Chickenwire Torus
let chickenWire = {
    components: {
        clickToPlayWrapper,
        'note': noteChicken,
        'dichord': dichordChicken,
        'trichord': trichordChicken
    },
    extends: tonnetzLike,
    mixins: [traceHandler],
    template: `
        <g>
            <clickToPlayWrapper :transform="position(n.node)"
            v-for="n in nodeStateList" v-bind:key="genKey([n.node])"
            :pitches="nodesToPitches([n.node])">
                <note
                v-bind:notes="node2Notes([n.node])"
                v-bind:nodes="[n.node]"
                :forceState="n.status"
                />
            </clickToPlayWrapper>

            <clickToPlayWrapper :transform="position(n.nodes[0])"
            v-for="n in dichordStateList" v-bind:key="genKey(n.nodes)"
            :pitches="nodesToPitches(n.nodes)">
                <dichord 
                v-bind:notes="node2Notes(n.nodes)"
                v-bind:shape="shape(n.nodes)"
                :forceState="n.status"/>
            </clickToPlayWrapper>
            
            <clickToPlayWrapper :transform="position(n.nodes[0])"
            v-for="n in trichordStateList" v-bind:key="genKey(n.nodes)"
            :pitches="nodesToPitches(n.nodes)">
                <trichord
                v-bind:notes="node2Notes(n.nodes)"
                v-bind:shape="shape(n.nodes)"
                :forceState="n.status"/>
            </clickToPlayWrapper>
        </g>
    `
}

// Note component : a clickable circle with the note name
let noteClock = {
    mixins: [activableMixin],
    template: `
        <g>
            <circle v-bind:class="{activeNode:isActive}" r="24" v-bind:data-key="notes[0].id">
            </circle> 
            <text>
                {{ notes[0].text }}
            </text>
        </g>
        `
}

//The circle representation
let clockOctave = {
    components:{
        clickToPlayWrapper,
        noteClock
    },
    props: {
        height: Number,
        width: Number,
        notes: Array,
        intervals: {
            type: Number,
            default: 1
        }
    },
    computed: {
        center: function(){
            return {y:this.height/2,x:this.width/2}
        },
        radius: function(){
            //TODO: Cleaner computation
            return Math.min(this.height/2,this.width/2)*0.85;
        },
        viewbox: function(){
            return `0 0 ${this.width} ${this.height}`
        },
        getCoords: function(){
            var result = [];
            for(i of range(0,12)){
                if(this.notes[mod(i*this.intervals,12)].count>0){
                    let node = mod(i*this.intervals,12);
                    result.push(this.position(node))
                }
            }
            return result;
        },
        points: function (){
            return this.getCoords.map( ({x,y}) => `${x},${y}` ).join(' ')
        },
        //Returns true if any note is active
        //TODO: Rename and repurpose as a count of active notes
        anyNote: function (){
            return this.notes.some(note => note.count>0);
        }
    },
    methods: {
        node2Notes: function (nodes){
            return nodes.map(node => this.notes[mod(node,12)])
        },
        genKey: function (n){
            return "circle_"+n[0];
        },
        nodesToPitches: function(nodes){
            let A3 = 57;
            return nodes.map(node => A3+node);
        },
        position(node){
            let theta = -2*Math.PI*(mod(this.intervals*(node-3),12)/12 - 1/4);
            return pos = {
                x: this.center.x+this.radius*Math.cos(theta),
                y: this.center.y-this.radius*Math.sin(theta)
            }
        },
        posToTransform(pos){
            return `translate(${pos.x},${pos.y})`
        }
    },
    template: `
        <svg id="svg" class="clock" 
            v-bind:width="width" v-bind:height="height" 
            v-bind:viewBox="viewbox">
            <circle v-bind:cx="center.x" v-bind:cy="center.y" v-bind:r="radius"/>
            <polygon v-if="anyNote" class=clockPolygon
                v-bind:points="points"/>
            <clickToPlayWrapper v-for="n in [0,1,2,3,4,5,6,7,8,9,10,11]" 
            :pitches="nodesToPitches([n])"
            v-bind:key="genKey([n])"
            :transform="posToTransform(position(n))" v-once>
                <note-clock
                v-bind:notes="node2Notes([n])"
                />
            </clickToPlayWrapper>
            
        </svg>
    `
}


// The App's main object, handling global concerns
var proto = new Vue({
    //TODO: break up some functions into separate components
    el: '#proto',
    components: {dragZoomSvg,tonnetzPlan,chickenWire,clockOctave,staticViewSvg},
    data: {
        // The list of all 3-interval Tonnetze
        //TODO: Move to non-reactive data
        tonnetze: [
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
        ],
        // The selected interval set
        intervals: [3,4,5],
        // The type of representation for the main window ('tonnetz' or 'chicken')
        type: 'tonnetz',
        // The list of all notes: their name and their status
        notes: (strings[language] || strings.en).notes.map( function(note_name_local, index) { 
            // use text for display and id for CSS styling
            return {text: note_name_local, id: strings.en.notes[index], count: 0};
        }),

        // List of preset songs
        //TODO: More formatted presentation
        //STRETCH: Turn into a basic song library 
        files: [
            {
                humanName:"Elton John — Your Song",
                fileName:"Midi/001_Elton_John-1.MID"
            },
            {
                humanName:"Keith Jarrett — Extract of the Köln Concert",
                fileName:"Midi/002_Keith_Jarrett.MID"
            },
            {
                humanName:"J. S. Bach — Aria of the Orchestral Suite n°3 (BWV 1068)",
                fileName:"Midi/003_Bach.MID"
            },
            {
                humanName:"The Beatles — Hey Jude",
                fileName:"Midi/004_Beatles_Hey_Jude.MID"
            },
            {
                humanName:"The Beatles — Hey Jude (Negative Harmony Revised)",
                fileName:"Midi/005_Beatles_Hey_Jude_NH-1.MID"
            },
        ],
        // Status text (obsolete)
        //TODO: check that it's safe to remove
        loadlog: "*** MIDI.js is loading soundfont... ***",
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
        player: {playing:false}, // TODO: replace by a dummy player
        // Should trajectory drawing be active?
        trace: false,
        // Is recording in progress?
        recording: false,
        // Is the modal window open?
        modal: false,
        // The localisation strings
        strings: strings[language] || strings.en
    },
    computed:{
        isConnected: function(){
            return this.intervals.reduce(gcd,12)===1;
        }
    },
    created: function(){
        //Delay connection of MIDI devices to let JZZ finish its initialisation
        let deviceUpdate=this.deviceUpdate; // This is required to bring deviceUpdate into the lambda's context
        setTimeout(function(){deviceUpdate({inputs:{added:JZZ().info().inputs}})},1000);
        //Add a watcher to connect (and disconnect) new devices to the app
        JZZ().onChange(this.deviceUpdate);

        this.ascii.connect(piano);
        piano.connect(this.synth);
        piano.connect(this.midiHandler);   
    },
    methods:{
        //Handler for JZZ device change event
        deviceUpdate: function({inputs:{added,removed}}){
            //TODO: replace log by a small info message on screen
            console.log('Updating MIDI devices');
            if(added){
                for(device of added){
                    JZZ().openMidiIn(device.name)
                      .connect(piano) // Send the keyboard's events to the virtual piano which will relay them
                      .connect(restartTimeout); // Reset the page's timeout upon input
                    console.log('Added device: ',device);
                }
            }
            if(removed){
                for(device of removed){
                    JZZ().openMidiIn(device.name).disconnect(piano);
                    console.log('Removed device: ',device);
                }
            }
            this.resetNotes(); // Connection/Disconnection can cause unbalanced note events
        },
        //Deep compare for arrays
        //TODO: Move to utils
        arrayEquals: function (a, b) {
            if (a === b) return true;
            if (a == null || b == null) return false;
            if (a.length != b.length) return false;
        
            for (var i = 0; i < a.length; ++i) {
              if (a[i] !== b[i]) return false;
            }
            return true;
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
        //Resets load message
        //TODO: should be safe to remove
        loaded: function(){
            this.loadlog = '';
        },
        //Sets the load message to standby
        //TODO: should be safe to remove
        clear: function() {
            this.stop()
            this.loadlog = 'please wait...';
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
            try {
                this.SMF = JZZ.MIDI.SMF(data);
                this.player = this.SMF.player();
                this.player.connect(piano);
                this.player.play();
                this.loadlog = name;
            } catch (e) {
                console.log(e);
                this.loadlog = e;
                throw e;
            }
        },
        // Loads a Midi File from a file on disk
        fromFile: function () {
            if (window.FileReader) {
                this.clear();
                var reader = new FileReader();
                var f = document.getElementById('file').files[0];
                reader.onload = function(e) {
                    var data = '';
                    var bytes = new Uint8Array(e.target.result);
                    data = bytes.reduce((d,byte) => d+String.fromCharCode(byte),'')
                    // for (var i = 0; i < bytes.length; i++) {
                    //     data += String.fromCharCode(bytes[i]);
                    // }
                    proto.load(data, f.name);
                }
                ;
                reader.readAsArrayBuffer(f);
            } else
                this.loadlog = 'File API is not supported in this browser.';
        },
        // Loads a distant Midi file
        fromURL: function (url) {
            this.clear();
            //var url = document.getElementById('url').value;
            try {
                var xhttp = new XMLHttpRequest();
                xhttp.onreadystatechange = function() {
                    if (this.readyState == 4) {
                        if (this.status == 200) {
                            var r = xhttp.responseText;
                            var data = '';
                            for (var i = 0; i < r.length; i++)
                                data += String.fromCharCode(r.charCodeAt(i) & 0xff);
                            proto.load(data, url);
                        } else {
                            this.loadlog = 'XMLHttpRequest error';
                        }
                    }
                }
                ;
                xhttp.overrideMimeType('text/plain; charset=x-user-defined');
                xhttp.open('GET', encodeURIComponent(url), true);
                xhttp.send();
            } catch (e) {
                this.loadlog = 'XMLHttpRequest error';
            }
        },
        // Loads the preset demo song
        fromBase64: function () {
            this.clear();
            this.load(JZZ.lib.fromBase64(data), 'Base64 data');
        },
        // Loads the recorded midi
        fromTrajectory : function () {
            //Stop playback to avoid overlapping
            if(this.player.playing){
                this.stop();
            }
            this.SMF=record.SMF;
            this.player = record.SMF.player();
            this.player.connect(piano);
            this.resetNotes();
        },
        //TODO: Fix 0.5 s slowdown
        rotate: function(){
            this.stop()
            this.rotateTrajectory(this.SMF);
            // TODO: Does the player really need to be reassigned ?
            this.player=this.SMF.player();
            this.player.connect(piano);

            this.player.play();
        },
        //TODO: Fix 0.5 s slowdown
        translate: function(translate=1){
            this.stop()
            this.translateTrajectory(this.SMF,translate);
            // TODO: Does the player really need to be reassigned ?
            this.player=this.SMF.player();
            this.player.connect(piano);

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
                piano.noteOn(0,pitch,100);
            }
        },
        noteOff: function(pitches){
            //var notes = this.node2Notes(nodes);
            for (var pitch of pitches){
                piano.noteOff(0,pitch,100);
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
        reset() {
          window.location.reload();
        }
    },
    mounted(){
        midiBus.$on('note-on',this.noteOn);
        midiBus.$on('note-off',this.noteOff);
    }
})

// Example date : 'Mary had a little lamb'
var data = '\
TVRoZAAAAAYAAQADAGRNVHJrAAAAGgD/AwtMaXR0bGUgTGFtYgD/UQMKLCsA/y8ATVRyawAAAPIA/wMF\
V29yZHMA/wEYQFRNYXJ5IFdhcyBBIExpdHRsZSBMYW1lZP8BA1xNYTL/AQNyeSAy/wEEd2FzIDL/AQJh\
IDL/AQNsaXQy/wEEdGxlIDL/AQVsYW1lLGT/AQQvTGl0Mv8BBHRsZSAy/wEFbGFtZSxk/wEEL0xpdDL/\
AQR0bGUgMv8BBWxhbWUsZP8BAy9NYTL/AQNyeSAy/wEEd2FzIDL/AQJhIDL/AQNsaXQy/wEEdGxlIDL/\
AQVsYW1lLDL/AQMvQSAy/wEDbGl0Mv8BBHRsZSAy/wEFbGFtZSAy/wEEd2FzIDL/AQRoZXIhAP8vAE1U\
cmsAAAC5AP8DBU11c2ljAMALZJBAfzJAAAA+fzI+AAA8fzI8AAA+fzI+AABAfzJAAABAfzJAAABAf1pA\
AAo+fzI+AAA+fzI+AAA+f1o+AApAfzJAAABDfzJDAABDf1pDAApAfzJAAAA+fzI+AAA8fzI8AAA+fzI+\
AABAfzJAAABAfzJAAABAf1pAAAo+fzI+AAA+fzI+AABAfzJAAAA+fzI+AAA8f2RAZABDZABIf1o8AABA\
AABDAABIAAr/LwA=';

}) // fallback.ready