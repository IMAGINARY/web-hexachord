//Author: Corentin Guichaoua

// Vue.config.devtools = true
// Vue.config.performance = true

var sqrt2=1.414
var xstep=Math.sqrt(3)/2
var baseSize=50

function bound(value,mini,maxi){
    return Math.min(maxi,Math.max(mini,value));
}

//True modulo function (always positive)
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

var piano = JZZ.input.Kbd({at:'piano', from:'C3', to:'B7', onCreate:function() {
    this.getBlackKeys().setStyle({color:'#fff'});
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
    // this.getKey('B5').setInnerHTML('<span class=inner>M</span>');
    }
    });


// Empty Vue instance to act as a bus for Midi Events
var midiBus=new Vue({});
// Provides MIDI playback on click for the slotted element
// The element must be valid svg markup
let clickToPlayWrapper = {
    props: {
        pitches: {
            type:Array,
            required:true
        }
    },
    data: function (){return{
        clicked: false
    }},
    methods:{
        clickOn: function(){
            midiBus.$emit('note-on',this.pitches);
            this.clicked=true;
        },
        clickOff: function(){
            if(this.clicked){
                midiBus.$emit('note-off',this.pitches);
                this.clicked=false;
            }
        }
    },
    template:`
        <g @pointerdown="clickOn()" 
        @pointerup="clickOff()" 
        @pointerleave="clickOff()">
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
            return (this.forceState===-1 && this.notes.every(elem => elem.count > 0)) || this.forceState===2;
        },
        semiActive: function(){
            return this.forceState === 1;
        }
    }
}

// Conversion between tonnetz coordinates and svg coordinates
const logicalToSvgX = node => node.x * xstep * baseSize;
const logicalToSvgY = node => (node.y + node.x/2) * baseSize;
const logicalToSvg = node => ({x:logicalToSvgX(node), y:logicalToSvgY(node)})

// Note component : a clickable circle with the note name
let noteTonnetz = {
    mixins: [activableMixin],
    template: `
        <g>
            <circle v-bind:class="{activeNode:isActive, visitedNode:semiActive}"
                r="12" v-bind:data-key="notes[0].text">
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
        shape:{
            type: Array,
            required: true
        }
    },
    computed: {
        coords: function (){
            return {
                x1 : 0,
                x2 : logicalToSvgX(this.shape[1]),
                y1 : 0,
                y2 : logicalToSvgY(this.shape[1])
            }
        },
        center: function (){
            return {
                x: (this.coords.x2)/2,
                y: (this.coords.y2)/2
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
};

// Trichord component : a clickable triangle between the three notes that it contains
let trichordTonnetz = {
    mixins: [activableMixin],
    props: {
        shape: {
            type: Array,
            required: true
        }
    },
    computed: {
        coords: function (){
            return this.shape.map(logicalToSvg);
        },
        points: function (){
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
        height: Number,
        width: Number,
        scaleBounds: Object
    },
    data: function(){return{
        tx : 0,
        ty : 0,
        scale: 2,
        captureMouse: false,
        clickedPos: {x:0,y:0},
    }},
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
    methods: {
        zoomInOut: function (wheelEvent){
            var multiplier = Math.exp(-wheelEvent.deltaY/600)
            // Bound the multiplier to acceptable values
            multiplier = bound(multiplier,this.scaleBounds.mini/this.scale,
                                          this.scaleBounds.maxi/this.scale);
            
            //On Firefox, offset is relative to the DOM element from which the event is fired,
            //not that in which it is handled, so this doesn't work everywhere
            //var pointer = {x:wheelEvent.offsetX,y:wheelEvent.offsetY};
            let pointer = {x: wheelEvent.clientX - this.$el.getBoundingClientRect().left,
                           y: wheelEvent.clientY - this.$el.getBoundingClientRect().top};

            //There is probably a better way to find it
            var pointerSvg = ({x:pointer.x/this.scale-this.tx,
                               y:pointer.y/this.scale-this.ty});

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

// Slotted component that wraps the svg element
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

// The Tonnetz component : A large component that contains the drawing of the Tonnetz
let tonnetzLike = {
    props: {
        notes: Array,
        intervals: {
            type: Array,
            default: () => [3,4,5]
        },
        bounds: {
            type: Object
        }
    },
    computed: {
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
        trichordList: function (){
            var nodes = [];
            //For each root
            for(node of this.nodeList){
                nodes.push([{x:node.x,y:node.y},{x:node.x+1,y:node.y  },{x:node.x,y:node.y+1}]);
                nodes.push([{x:node.x,y:node.y},{x:node.x-1,y:node.y+1},{x:node.x,y:node.y+1}]);
            }
            return nodes;
        }
    },
    methods: {
        node2Notes: function (nodes){
            return nodes.map(node => this.notes[mod(-node.x*this.intervals[0]+node.y*this.intervals[2],12)])
        },
        nodesToPitches: function(nodes){
            return nodes.map(nodeIt => 81-nodeIt.x*this.intervals[0]+nodeIt.y*(this.intervals[2]-12));
        },
        position: function(node){
            let {x,y} = logicalToSvg(node)
            return `translate(${x} ${y})`
        },
        shape: function(nodes){
            return nodes.map(node => ({
                x:node.x-nodes[0].x,
                y:node.y-nodes[0].y
            }));
        },
        genKey: function (n){
            return n.map(function textify(node){return `${node.x},${node.y}`}).join(' ')
        }
    }
};

var record = {
    startTime:undefined,
    SMF:undefined,
    recording:false
}

let tonnetzPlan = {
    components: {
        clickToPlayWrapper,
        'note': noteTonnetz,
        'dichord': dichordTonnetz,
        'trichord': trichordTonnetz
    },
    extends: tonnetzLike,
    props:{
        trace: {
            type: Boolean,
            default: false
        }
    },
    data: function(){return {
        trajectory : [], // The array of the traversed note nodes. A trajectory element should be a pair of a MIDI event and its associated position
        active: [],
        visited: new Set()
    }},
    computed:{
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
        trace: function(){
            this.resetTrajectory();
        },
        intervals : function(){
            this.resetTrajectory();
        }
    },
    methods:{
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
            }else return -1;
        },
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
                        {x:-2,y:3},{x:-1,y:3},{x:2,y:-3},{x:1,y:-3}];
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
        updateChords: function(){
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
    },
    //TODO: Get the template into the base component (need to control the layering of elements)
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
            //TODO: This is more than just minor or major, we have to clarify
            var major = (this.shape[0].y == this.shape[1].y);
            if (major){
                return this.notes[2].text;
            }else{
                var display = this.notes[2].text;
                return display[0].toLowerCase() + display.substring(1);
            }
        }
    },
    template: `
        <g v-bind:id="id">
            <circle v-bind:class="{activeTrichord:isActive}"
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
        <line v-bind:class="{activeDichord:isActive}" 
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
            // return this.nodes.map(node => ({x:node.x * xstep * baseSize,
            //                                 y:(node.y + node.x/2) * baseSize
            //                               }) );
        },
        points: function (){
            return this.coords.map( ({x,y}) => `${x},${y}` ).join(' ')
        }
    },
    template: `
        <polygon v-bind:class="{activeNode:isActive}" 
            v-bind:points="points" v-bind:data-key="notes[0].text"/>
        `
}

// The chicken-wire's main component: handles the layout and structure
let chickenWire = {
    components: {
        clickToPlayWrapper,
        'note': noteChicken,
        'dichord': dichordChicken,
        'trichord': trichordChicken
    },
    extends: tonnetzLike,
    template: `
        <g>
            <clickToPlayWrapper :transform="position(n)"
            v-for="n in nodeList" v-bind:key="genKey([n])"
            :pitches="nodesToPitches([n])">
                <note
                v-bind:notes="node2Notes([n])"
                v-bind:nodes="[n]"
                />
            </clickToPlayWrapper>

            <clickToPlayWrapper :transform="position(n[0])"
            v-for="n in dichordList" v-bind:key="genKey(n)"
            :pitches="nodesToPitches(n)">
                <dichord 
                v-bind:notes="node2Notes(n)"
                v-bind:shape="shape(n)"/>
            </clickToPlayWrapper>
            
            <clickToPlayWrapper :transform="position(n[0])"
            v-for="n in trichordList" v-bind:key="genKey(n)"
            :pitches="nodesToPitches(n)">
                <trichord
                v-bind:notes="node2Notes(n)"
                v-bind:shape="shape(n)"/>
            </clickToPlayWrapper>
        </g>
    `
}

// Note component : a clickable circle with the note name
let noteClock = {
    mixins: [activableMixin],
    template: `
        <g>
            <circle v-bind:class="{activeNode:isActive}" r="12" v-bind:data-key="notes[0].text">
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
    el: '#proto',
    components: {dragZoomSvg,tonnetzPlan,chickenWire,clockOctave,staticViewSvg},
    data: {
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
        intervals: [3,4,5],
        type: 'tonnetz',
        notes: [
            {text: 'A',  count:0},
            {text: 'Bb', count:0},
            {text: 'B',  count:0},
            {text: 'C',  count:0},
            {text: 'Db', count:0},
            {text: 'D',  count:0},
            {text: 'Eb', count:0},
            {text: 'E',  count:0},
            {text: 'F',  count:0},
            {text: 'Gb', count:0},
            {text: 'G',  count:0},
            {text: 'Ab', count:0}
        ],
        loadlog: "*** MIDI.js is loading soundfont... ***",
        //TODO: Find a way to have nice output on Safari and Firefox
        synth: JZZ.synth.Tiny(),
        //synth:JZZ.synth.MIDIjs({ 
            //TODO: Use a soundfont from our own server
            //soundfontUrl: "https://raw.githubusercontent.com/mudcube/MIDI.js/master/examples/soundfont/", 
            //instrument: "acoustic_grand_piano" })
                //.or(function(){ proto.loaded(); alert('Cannot load MIDI.js!\n' + this.err()); })
                //.and(function(){ proto.loaded(); }),
        ascii: JZZ.input.ASCII({//TODO: Adapt to keyboard layout
                W:'C5', S:'C#5', X:'D5', D:'D#5', C:'E5', V:'F5',
                G:'F#5', B:'G5', H:'Ab5', N:'A5', J:'Bb5', M:'B5'
                }),
        
        //TODO: Ask which Midi controller to use instead of blindly picking the first
        keyboard: JZZ().openMidiIn(),
        player: JZZ.MIDI.SMF().player(),
        trace: false,
        recording: false,
        modal: false
    },
    computed: {
        buttonText: function(){
            if (this.player.playing) {
                return 'Stop'
            }else{
                return 'Play'
            }
        },
        recordText: function(){
            if(this.recording){
                return 'Stop recording';
            }else{
                return 'Start recording';
            }
        }
    },
    created: function(){
        this.ascii.connect(piano);
        this.keyboard.connect(piano);
        piano.connect(this.synth);
        piano.connect(this.midiHandler);   
    },
    methods:{
        arrayEquals: function (a, b) {
            if (a === b) return true;
            if (a == null || b == null) return false;
            if (a.length != b.length) return false;
        
            for (var i = 0; i < a.length; ++i) {
              if (a[i] !== b[i]) return false;
            }
            return true;
        },
        midiHandler: function (midiEvent){
            noteIndex = (midiEvent.getNote()+3) %12
            if(midiEvent.isNoteOn()){
                this.notes[noteIndex].count++;
            }else if(midiEvent.isNoteOff()){
                this.notes[noteIndex].count--;
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
        loaded: function(){
            this.loadlog = '';
        },
        clear: function() {
            if (this.player)
                this.player.stop();
            this.loadlog = 'please wait...';
            btn.disabled = true;
        },
        playStop: function() {
            if (this.player.playing) {
                this.player.stop();
            } else {
                this.resetNotes();
                this.player.play();
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
        //TODO: encapsulate this in a loader component
        load: function(data, name) {
            try {
                this.player = JZZ.MIDI.SMF(data).player();
                this.player.connect(piano);
                this.player.play();
                this.loadlog = name;
                btn.disabled = false;
            } catch (e) {
                console.log(e);
                this.loadlog = e;
                throw e;
            }
        },
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
        fromURL: function () {
            this.clear();
            var url = document.getElementById('url').value;
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
                xhttp.open('GET', 'proxy.php?url=' + encodeURIComponent(url), true);
                xhttp.send();
            } catch (e) {
                this.loadlog = 'XMLHttpRequest error';
            }
        },
        fromBase64: function () {
            this.clear();
            this.load(JZZ.lib.fromBase64(data), 'Base64 data');
        },
        fromTrajectory : function (rotate = false, translate = 0) {
            if(rotate){
                this.rotateTrajectory(record.SMF[0]);
            }
            if(translate){
                this.translateTrajectory(record.SMF[0],translate);
            }
            //Stop playback to avoid overlapping
            if(this.player.playing){
                this.player.stop();
            }
            this.player = record.SMF.player();
            this.player.connect(piano);
            this.resetNotes();
            this.player.play();
            btn.disabled = false;
        },
        //Simple version operating on pitches alone
        rotateTrajectory : function (SMFTrack) {
            //TODO: ignore drums track
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
        },
        translateTrajectory : function (SMFTrack,translate) {
            for (SME of SMFTrack){
                let note = SME.getNote();
                if(note !== undefined){
                    SME.setNote(note+translate);
                }
            }
        },
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
        recordToggle: function(){
            if(this.recording){
                replay.disabled=false;
                rotate.disabled=false;
                translate.disabled=false;
                this.recording = false;
                record.SMF[0].add(new Date().getTime() - record.startTime,JZZ.MIDI.smfEndOfTrack());
                record.recording = false;
            }else{
                replay.disabled=true;
                rotate.disabled=true;
                translate.disabled=true;
                this.recording = true;
                record.SMF = new JZZ.MIDI.SMF(0,500); // 500 tpb, 120 bpm => 1 tick per millisecond
                record.SMF.push(new JZZ.MIDI.SMF.MTrk());
                record.SMF[0].add(0,JZZ.MIDI.smfBPM(120));
                record.startTime = new Date().getTime();
                record.recording = true;
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

