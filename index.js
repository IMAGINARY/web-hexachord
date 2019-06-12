//Author: Corentin Guichaoua

// Vue.config.devtools = true
// Vue.config.performance = true


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
    connected: 'This Tonnetz is non-connected and doesn’t contain every note.'
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
    connected: 'Dieses Tonnetz ist nicht verbunden, und enthält nicht alle Noten.'
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
    connected: "Ce Tonnetz n'est pas connexe et ne contient pas toutes les notes."
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
function isMidiPitch(pitch){
    return (pitch >= 0 && pitch < 128) || (JZZ.MIDI.noteValue(pitch) !== undefined);
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
// Vue components and mixins

//TODO: Restructure to avoid having to forward declare it.
var piano; //Variable to hold the virtual piano (built later once JZZ is loaded)
var midiBus; //Variable to hold the bus for upgoing midiEvents (built once Vue is loaded)
var proto; //Variable to hold the main app Object (built once everything is loaded)

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

// Note component : a clickable circle with the note name
let noteTonnetz = {
    mixins: [activableMixin],
    template: `
        <g class="tonnetzNote">
            <circle v-bind:class="{activeNode:isActive, visitedNode:semiActive}"
                v-bind:data-key="notes[0].text">
            </circle> 
            <text>
                {{ notes[0].text }}
            </text>
        </g>
        `
};


// Utility functions
const average = arr => arr.reduce((a,b) => a + b, 0) / arr.length;

// Common code to all chord components
let chord = {
    mixins: [activableMixin],
    props: {
        shape:{ //Relative (Tonnetz) coordinates of the chord
            type: Array,
            required: true
        }
    },
    computed: {
        coords: function (){ // Relative SVG coordinates of the chord's notes
            return this.shape.map(logicalToSvg);
        },
        center: function (){ // The barycenter of the coordinates
            return {x:average(this.coords.map(({x}) => x)),
                    y:average(this.coords.map(({y}) => y))}
        }
    }
}

// Dichord component : a clickable line between the two notes that it contains, with a small circle for easier clicking
let dichordTonnetz = {
    extends: chord,
    computed: {
        coordsHTML: function (){ // Repackages coordinates in the HTML/SVG format for lines
            return {
                x1 : this.coords[0].x,
                x2 : this.coords[1].x,
                y1 : this.coords[0].y,
                y2 : this.coords[1].y
            }
        }
    },
    template: `
    <g class="tonnetzDichord">
        <line v-bind:class="{activeDichord:isActive, visitedDichord:semiActive}" 
            v-bind="coordsHTML">
        </line> 
        <circle v-bind:class="{activeDichord:isActive}"
                v-bind:cx="center.x" v-bind:cy="center.y">
        </circle> 
    </g>
    `
};

// Trichord component : a clickable triangle between the three notes that it contains
let trichordTonnetz = {
    extends: chord,
    computed: {
        points: function (){ // Coordinates in the HTML format for polygons
            return this.coords.map( ({x,y}) => `${x},${y}` ).join(' ')
        }
    },
    template: `
        <polygon v-bind:class="{activeTrichord:isActive, visitedTrichord:semiActive}" 
            class="tonnetzTrichord"
            v-bind:points="points"/>
        `
};

// FIXME: Don't prevent scroll when the view is locked
// Slotted component that handles the drag and zoom logic on an svg
let dragZoomSvg = {
    props: {
        height: Number, // Height of the View (before reactive scaling)
        width: Number, // Width of the View (before reactive scaling)
        scaleBounds: {
            type: Object, // Min and max zoom level
            default: () => ({mini: 1, maxi: 2})
        },
        lock: { // Flag for deactivating DragNZoom functions
            type: Boolean,
            default: false
        }
    },
    data: function(){return{
        //TODO: Refactor all coordinates changes into a unified system
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
    watch:{
        lock: this.captureOff
    },
    methods: {
        zoomInOut: function (wheelEvent){
            if(this.lock) return; //Ignore if locked

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
            if(this.lock) return // Ignore if locked
            this.captureMouse = true
            this.clickedPos = {x:event.clientX,y:event.clientY}
            return
        },
        captureOff: function (event){
            this.captureMouse = false
            return
        },
        // Centers the view to the (SVG) coordinates specified
        // TODO: Finer logic for camera panning (move if moving close to the edges)
        panTo: function(targetPosition){
            if(targetPosition.x > this.bounds.xmin && targetPosition.x < this.bounds.xmax
             &&targetPosition.y > this.bounds.ymin && targetPosition.y < this.bounds.ymax)
            {
                return
            }else{
                //TODO: Animate transition
                newPos = {
                    tx:- targetPosition.x + this.width/this.scale/2,
                    ty:- targetPosition.y + this.height/this.scale/2
                };
                TweenLite.to(this,1,newPos);
            }
        }
    },
    mounted(){
        this.$on('pan',this.panTo);
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
                        this.$parent.$emit('pan',logicalToSvg(node));
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
    },
    subtemplateNote:`
            <clickToPlayWrapper :transform="position(n.nodes[0])"
            v-for="n in trichordStateList" v-bind:key="genKey(n.nodes)"
            :pitches="nodesToPitches(n.nodes)">
                <trichord 
                v-bind:notes="memoNode2Notes(n.nodes)"
                v-bind:nodes="n.nodes"
                :shape="memoShape(n.nodes)"
                :forceState="n.status"
                />
    </clickToPlayWrapper>`,
    subtemplateDichord:`
            <clickToPlayWrapper :transform="position(n.nodes[0])"
            v-for="n in dichordStateList" v-bind:key="genKey(n.nodes)"
            :pitches="nodesToPitches(n.nodes)">
                <dichord 
                v-bind:shape="memoShape(n.nodes)"
                v-bind:notes="memoNode2Notes(n.nodes)"
                :forceState="n.status"/>
    </clickToPlayWrapper>`,
    subtemplateTrichord:`
            <clickToPlayWrapper :transform="position(n.node)"
            v-for="n in nodeStateList" v-bind:key="genKey([n.node])"
            :pitches="nodesToPitches([n.node])">
                <note v-bind:notes="memoNode2Notes([n.node])"
                v-bind:nodes="[n.node]"
                :forceState="n.status"/>
    </clickToPlayWrapper>`
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
    template: `
        <g>
            ${tonnetzLike.subtemplateNote}
            ${tonnetzLike.subtemplateDichord}
            ${tonnetzLike.subtemplateTrichord}    
        </g>
    `
}

// ----------------------- Chicken Wire ---------------------------
// TODO: Lots of duplicated code: factorize !

// The chicken-wire's trichord component : a clickable circle representing the chord
let trichordChicken = {
    extends: chord,
    props: ['id'],
    computed: {
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
        <g v-bind:id="id" class=chickenTrichord>
            <circle v-bind:class="{activeTrichord:isActive, visitedTrichord:semiActive}"
                v-bind:cx="center.x" v-bind:cy="center.y">
            </circle> 
            <text v-bind:x="center.x" v-bind:y="center.y">
                {{ text }}
            </text>
        </g>
        `
}

// The chicken-wire's dichord component: a line between the two trichords that contain the same notes,
// with a small circle for easier clicking
let dichordChicken = {
    extends: chord,
    computed: {
        coordsHTML: function (){
            //Orientation of the notes axis
            let dx = this.coords[1].x - this.coords[0].x;
            let dy = this.coords[1].y - this.coords[0].y;
            //The rotation that sends (1,0) to (dx,dy)
            let rotate = function(point){ 
                return {x: (dx*point.x-dy*point.y), 
                        y: (dy*point.x+dx*point.y)};
            };
            //The extremities of the segment if the points were 0,0 and 1,0
            const p1 = {x:0.5,y:xstep/3};
            const p2 = {x:0.5,y:-xstep/3};
            return {
                x1 : rotate(p1).x,
                x2 : rotate(p2).x,
                y1 : rotate(p1).y,
                y2 : rotate(p2).y
            }
        }
    },
    template: `
    <g class="chickenDichord">
        <line v-bind:class="{activeDichord:isActive, visitedDichord:semiActive}" 
            v-bind="coordsHTML">
        </line> 
        <circle v-bind:class="{activeDichord:isActive}"
                v-bind:cx="center.x" v-bind:cy="center.y">
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
            return[
                {x:+baseSize*xstep/3,  y:+baseSize/2},
                {x:-baseSize*xstep/3,  y:+baseSize/2},
                {x:-baseSize*2*xstep/3,y:0},
                {x:-baseSize*xstep/3,  y:-baseSize/2},
                {x:+baseSize*xstep/3,  y:-baseSize/2},
                {x:+baseSize*2*xstep/3,y:0}
            ]
        },
        points: function (){
            return this.coords.map( ({x,y}) => `${x},${y}` ).join(' ')
        }
    },
    template: `
        <polygon v-bind:class="{activeNode:isActive, visitedNode:semiActive}" class="chickenNote" 
            v-bind:points="points" v-bind:data-key="notes[0].text"/>
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
        ${tonnetzLike.subtemplateTrichord}
        ${tonnetzLike.subtemplateDichord}   
        ${tonnetzLike.subtemplateNote} 
        </g>
    `
}

// Note component : a clickable circle with the note name
let noteClock = {
    mixins: [activableMixin],
    template: `
        <g class=noteClock>
            <circle v-bind:class="{activeNode:isActive}" v-bind:data-key="notes[0].text">
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
        nodeRadius: {
            type:Number,
            default:24
        },
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
            const nodeRadius = 24;
            const nodeStrokeWidth = 2; //TODO: dynamically adjust values according to the style sheet
            return Math.min(this.height/2,this.width/2) - nodeRadius - nodeStrokeWidth/2;
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
        //Returns the number of active notes
        noteCount: function (){
            return this.notes.reduce( (count,note) => (note.count>0 ? count+1 : count),0);
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
            <polygon v-if="noteCount>1" class=clockPolygon
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


// Wait for libraries to be loaded
fallback.ready(function(){

    // ============================================================================
// Create the virtual keyboard

//TODO: Make a Vue component to encapsulate it 
//TODO: Use an independent bus to connect the Midi pipeline (removing the piano breaks the app)
piano = JZZ.input.Kbd(
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


// Empty Vue instance to act as a bus for note interaction Events
midiBus=new Vue({});


// The App's main object, handling global concerns
proto = new Vue({
    //TODO: break up some functions into separate components
    el: '#proto',
    components: {dragZoomSvg,tonnetzPlan,chickenWire,clockOctave},
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
        allStrings: strings,
        // The picked locale
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
            } catch (e) {
                console.log(e);
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
                console.log('File API is not supported in this browser.');
        },
        // Loads a distant Midi file
        fromURL: function (url) {
            if(this.player.playing){
                this.stop();
            }
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
                        }else{
                            console.log("Couldn't execute xhttp request.");
                        }
                    }
                }
                ;
                xhttp.overrideMimeType('text/plain; charset=x-user-defined');
                xhttp.open('GET', encodeURIComponent(url), true);
                xhttp.send();
            } catch (e) {
                console.log("Couldn't execute xhttp request.");
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