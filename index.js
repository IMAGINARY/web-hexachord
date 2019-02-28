//Author: Corentin Guichaoua

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

//Used for validation
function isSubset(a, b){
    return a.every(val => b.includes(val));
}

var piano = JZZ.input.Kbd({at:'piano', from:'C3', to:'G7', onCreate:function() {
    this.getBlackKeys().setStyle({color:'#fff'});
    this.getKey('C5').setInnerHTML('<span class=inner>W</span>');
    this.getKey('C#5').setInnerHTML('<span class=inner>S</span>');
    this.getKey('D5').setInnerHTML('<span class=inner>X</span>');
    this.getKey('D#5').setInnerHTML('<span class=inner>D</span>');
    this.getKey('E5').setInnerHTML('<span class=inner>C</span>');
    this.getKey('F5').setInnerHTML('<span class=inner>V</span>');
    this.getKey('F#5').setInnerHTML('<span class=inner>G</span>');
    this.getKey('G5').setInnerHTML('<span class=inner>B</span>');
    this.getKey('G#5').setInnerHTML('<span class=inner>H</span>');
    this.getKey('A5').setInnerHTML('<span class=inner>N</span>');
    this.getKey('A#5').setInnerHTML('<span class=inner>J</span>');
    this.getKey('B5').setInnerHTML('<span class=inner>M</span>');
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
    props: ['notes'],
    computed: {
        isActive : function(){
            return this.notes.every(elem => elem.count > 0);
        }
    }
}

// Conversion between tonnetz coordinates and svg coordinates
const logicalToSvgX = node => node.x * xstep * baseSize;
const logicalToSvgY = node => (node.y + node.x/2) * baseSize;
const logicalToSvg = node => ({x:logicalToSvgX(node), y:logicalToSvgY(node)})

// Note component : a clickable circle with the note name
Vue.component('note-node',{
    mixins: [activableMixin],
    props: {
        notes:{
            type: Array,
            required: true//,
            //validator: function(value){
            //    return isSubset(value,this.$root.notes);
            //}
        }
    },
    //TODO: Find a way to auto insert the pointer events
    template: `
        <g>
            <circle v-bind:class="{activeNode:isActive}"
                r="12">
            </circle> 
            <text>
                {{ notes[0].text }}
            </text>
        </g>
        `
})

// Dichord component : a clickable line between the two notes that it contains, with a small circle for easier clicking
Vue.component('dichord',{
    mixins: [activableMixin],
    props: {
        notes:{
            type: Array,
            required: true//,
            //validator: value => isSubset(value,this.$root.notes)
        },
        // dichordType indicates which interval is used
        shape:{
            type: Object,
            required: true//,
            //validator: [0,1,2].includes
        }
    },
    computed: {
        coords: function (){
            return {
                x1 : 0,
                x2 : logicalToSvgX(this.shape),
                y1 : 0,
                y2 : logicalToSvgY(this.shape)
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
        <line v-bind:class="{activeDichord:isActive}" 
            v-bind="coords">
        </line> 
        <circle v-bind:class="{activeDichord:isActive}"
                v-bind:cx="center.x" v-bind:cy="center.y" r="2">
        </circle> 
    </g>
    `
})

// Trichord component : a clickable triangle between the three notes that it contains
Vue.component('trichord',{
    mixins: [activableMixin],
    props: ['notes','nodes'],
    computed: {
        coords: function (){
            return this.nodes.map(node => ({x:node.x * xstep * baseSize,
                                            y:(node.y + node.x/2) * baseSize
                                          }) );
        },
        points: function (){
            return this.coords.map( ({x,y}) => `${x},${y}` ).join(' ')
        }
    },
    template: `
        <polygon v-bind:class="{activeTrichord:isActive}" 
            v-bind:points="points"/>
        `
})

// The Tonnetz component : A large component that contains the drawing of the Tonnetz and controls to drag it around
Vue.component('tonnetz-plan',{
    props: {
        height: Number,
        width: Number,
        notes: Array,
        intervals: {
            type: Array,
            default: () => [3,4,5]
        }
    },
    components: {clickToPlayWrapper},
    data: function(){return {
        tx : 0,
        ty : 0,
        scale: 2,
        captureMouse: false,
        clickedPos: {x:0,y:0},
        //size: {height: baseSize*10, width: baseSize*10},
        //TODO: Set max scale factor according to dimensions
        scaleBounds: {mini:1,maxi:5}
    }},
    computed: {
        nodeList: function (){
            var nodes = [];
            var xmin = Math.floor(-this.tx/(baseSize*xstep))
            var xmax = Math.ceil((-this.tx+this.width/this.scale)/(baseSize*xstep))
            for(xi of range(xmin,xmax+1)){
                ymin = Math.floor(-this.ty/(baseSize)-xi/2)
                ymax = Math.ceil((-this.ty+this.height/this.scale)/(baseSize)-xi/2)
                for(yi of range(ymin,ymax+1)){
                    nodes.push({x:xi,y:yi})
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
        },
        transform: function(){
            return `scale(${this.scale}) translate(${this.tx} ${this.ty})`
        },
        viewbox: function(){
            return `0 0 ${this.width} ${this.height}`
        }
    },
    methods: {
        node2Notes: function (nodes){
            return nodes.map(node => this.notes[mod(-node.x*this.intervals[0]+node.y*this.intervals[2],12)])
        },
        zoomInOut: function (wheelEvent){
            var multiplier = Math.exp(-wheelEvent.deltaY/600)
            // Bound the multiplier to acceptable values
            multiplier = bound(multiplier,this.scaleBounds.mini/this.scale,
                                          this.scaleBounds.maxi/this.scale);
            var pointer = {x:wheelEvent.offsetX,y:wheelEvent.offsetY};

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
        },
        genKey: function (n){
            return n.map(function textify(node){return `${node.x},${node.y}`}).join(' ')
        },
        nodesToPitches: function(nodes){
            return nodes.map(nodeIt => 81-nodeIt.x*this.intervals[0]+nodeIt.y*(this.intervals[2]-12));
        },
        position: function(node){
            let x = node.x * xstep * baseSize;
            let y = (node.y + node.x/2) * baseSize;
            return `translate(${x} ${y})`
        },
        //TODO: clearer handling of dichord type
        dichordType: function(nodes){
            return {
                x:nodes[1].x-nodes[0].x,
                y:nodes[1].y-nodes[0].y
            };
        }
    },
    template: `
        <svg id="svg" class="tonnetz" 
            v-bind:width="width" v-bind:height="height" 
            v-bind:viewbox="viewbox"
            v-on:wheel.prevent="zoomInOut"
            v-on:pointerdown="captureOn"
            v-on:pointerup="captureOff"
            v-on:pointerleave="captureOff"
            v-on:pointermove="drag">
            <g ref="trans" v-bind:transform="transform">
                <clickToPlayWrapper
                v-for="n in trichordList" v-bind:key="genKey(n)"
                :pitches="nodesToPitches(n)">
                    <trichord 
                    v-bind:notes="node2Notes(n)"
                    v-bind:nodes="n"
                    :pitches="nodesToPitches(n)"/>
                </clickToPlayWrapper>

                <clickToPlayWrapper :transform="position(n[0])"
                v-for="n in dichordList" v-bind:key="genKey(n)"
                :pitches="nodesToPitches(n)">
                    <dichord 
                    v-bind:shape="dichordType(n)"
                    v-bind:notes="node2Notes(n)"/>
                </clickToPlayWrapper>

                <clickToPlayWrapper :transform="position(n)"
                v-for="n in nodeList" v-bind:key="genKey([n])"
                :pitches="nodesToPitches([n])">
                    <note-node v-bind:notes="node2Notes([n])"
                    v-bind:nodes="[n]"/>
                </clickToPlayWrapper>
            </g>
        </svg>
    `

})

// Utility functions
const average = arr => arr.reduce((a,b) => a + b, 0) / arr.length;

// ----------------------- Chicken Wire ---------------------------
// TODO: Lots of duplicated code: factorize !

// The chicken-wire's trichord component : a clickable circle representing the chord
Vue.component('trichord-chicken',{
    mixins: [activableMixin],
    props: ['notes','nodes','id'],
    computed: {
        x : function (){
            return average(this.nodes.map(logicalToSvgX));
        },
        y : function (){
            return average(this.nodes.map(logicalToSvgY));
        },
        text: function(){
            //Is this a major or minor chord ?
            //TODO: This is more than just minor or major, we have to clarify
            var major = (this.nodes[0].y == this.nodes[1].y);
            if (major){
                return this.notes[2].text;
            }else{
                var display = this.notes[2].text;
                return display[0].toLowerCase() + display.substring(1);
            }
        }
    },
    //TODO: Find a way to auto insert the pointer events
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
})

// The chicken-wire's dichord component: a line between the two trichords that contain the same notes,
// with a small circle for easier clicking
Vue.component('dichord-chicken',{
    mixins: [activableMixin],
    props: ['notes','nodes'],
    computed: {
        coords: function (){
            //Coordinates of the reference point in the svg referential
            var x0 = logicalToSvgX(this.nodes[0]);
            var y0 = logicalToSvgY(this.nodes[0]);
            //Orientation of the notes axis
            var dx = logicalToSvgX(this.nodes[1]) - logicalToSvgX(this.nodes[0]);
            var dy = logicalToSvgY(this.nodes[1]) - logicalToSvgY(this.nodes[0]);
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
})

// The chicken-wire's note component: A clickable hexagon located between all the chords that use that note
Vue.component('note-chicken',{
    mixins: [activableMixin],
    props: ['notes','nodes'],
    computed: {
        coords: function (){
            //Coordinates of the reference point in the svg referential
            var x0 = logicalToSvgX(this.nodes[0]);
            var y0 = logicalToSvgY(this.nodes[0]);

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
            v-bind:points="points"/>
        `
})

// The chicken-wire's main component: handles the layout and structure
Vue.component('chicken-wire',{
    props: {
        height: Number,
        width: Number,
        notes: Array,
        intervals: {
            type: Array,
            default: () => [3,4,5]
        }
    },
    components: {clickToPlayWrapper},
    data: function(){return {
        tx : 0,
        ty : 0,
        scale: 2.5,
        captureMouse: false,
        clickedPos: {x:0,y:0},
        //size: {height: baseSize*10, width: baseSize*10},
        //TODO: Set max scale factor according to dimensions
        scaleBounds: {mini:1,maxi:5}
    }},
    computed: {
        nodeList: function (){
            var nodes = [];
            var xmin = Math.floor(-this.tx/(baseSize*xstep))
            var xmax = Math.ceil((-this.tx+this.width/this.scale)/(baseSize*xstep))
            for(xi of range(xmin,xmax+1)){
                ymin = Math.floor(-this.ty/(baseSize)-xi/2)
                ymax = Math.ceil((-this.ty+this.height/this.scale)/(baseSize)-xi/2)
                for(yi of range(ymin,ymax+1)){
                    nodes.push({x:xi,y:yi})
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
        },
        transform: function(){
            return `scale(${this.scale}) translate(${this.tx} ${this.ty})`
        },
        viewbox: function(){
            return `0 0 ${this.width} ${this.height}`
        }
    },
    methods: {
        node2Notes: function (nodes){
            return nodes.map(node => this.notes[mod(-node.x*this.intervals[0]+node.y*this.intervals[2],12)])
        },
        //TODO: Fix zoom on firefox
        zoomInOut: function (wheelEvent){
            var multiplier = Math.exp(-wheelEvent.deltaY/600)
            // Bound the multiplier to acceptable values
            multiplier = bound(multiplier,this.scaleBounds.mini/this.scale,
                                          this.scaleBounds.maxi/this.scale);
            var pointer = {x:wheelEvent.offsetX,y:wheelEvent.offsetY};

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
        },
        genKey: function (n){
            return "c_"+n.map(function textify(node){return `${node.x},${node.y}`}).join(' ')
        },
        nodesToPitches: function(nodes){
            var A5 = 81;
            return nodes.map(node => A5-node.x*this.intervals[0]+node.y*(this.intervals[2]-12));
        }
    },
    template: `
        <svg id="svg" class="tonnetz" 
            v-bind:width="width" v-bind:height="height" 
            v-bind:viewbox="viewbox"
            v-on:wheel.prevent="zoomInOut"
            v-on:pointerdown="captureOn"
            v-on:pointerup="captureOff"
            v-on:pointerleave="captureOff"
            v-on:pointermove="drag">
            <g ref="trans" v-bind:transform="transform">
                <clickToPlayWrapper 
                v-for="n in nodeList" v-bind:key="genKey([n])"
                :pitches="nodesToPitches([n])">
                    <note-chicken
                    v-bind:notes="node2Notes([n])"
                    v-bind:nodes="[n]"
                    />
                </clickToPlayWrapper>
                <clickToPlayWrapper 
                v-for="n in dichordList" v-bind:key="genKey(n)"
                :pitches="nodesToPitches(n)">
                    <dichord-chicken 
                    v-bind:notes="node2Notes(n)"
                    v-bind:nodes="n"/>
                </clickToPlayWrapper>
                <clickToPlayWrapper 
                v-for="n in trichordList" v-bind:key="genKey(n)"
                :pitches="nodesToPitches(n)">
                    <trichord-chicken 
                    v-bind:notes="node2Notes(n)"
                    v-bind:nodes="n"/>
                </clickToPlayWrapper>
            </g>
        </svg>
    `

})

// Note component : a clickable circle with the note name
Vue.component('note-clock',{
    mixins: [activableMixin],
    props: ['notes','nodes','id','center','radius','intervals'],
    computed: {
        theta: function(){
            return -2*Math.PI*(mod(this.intervals*(this.nodes[0]-3),12)/12 - 1/4);
        },
        x: function(){
            return this.center.x+this.radius*Math.cos(this.theta);
        },
        y : function (){
            return this.center.y-this.radius*Math.sin(this.theta);
        }
    },
    //TODO: Find a way to auto insert the pointer events
    template: `
        <g v-bind:id="id">
            <circle v-bind:class="{activeNode:isActive}"
                v-bind:cx="x" v-bind:cy="y" r="12">
            </circle> 
            <text v-bind:x="x" v-bind:y="y">
                {{ notes[0].text }}
            </text>
        </g>
        `
})

//The circle representation
Vue.component('clock-octave',{
    props: {
        height: Number,
        width: Number,
        notes: Array,
        intervals: {
            type: Number,
            default: 1
        }
    },
    components: {clickToPlayWrapper},
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
                    var theta = -2*Math.PI*(mod((i-3*this.intervals),12)/12 - 1/4);
                    result.push({
                        x:this.center.x+this.radius*Math.cos(theta),
                        y:this.center.y-this.radius*Math.sin(theta)
                    })
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
        }
    },
    template: `
        <svg id="svg" class="clock" 
            v-bind:width="width" v-bind:height="height" 
            v-bind:viewbox="viewbox">
            <circle v-bind:cx="center.x" v-bind:cy="center.y" v-bind:r="radius"/>
            <polygon v-if="anyNote" class=clockPolygon
                v-bind:points="points"/>
            <clickToPlayWrapper v-for="n in [0,1,2,3,4,5,6,7,8,9,10,11]" 
            :pitches="nodesToPitches([n])"
            v-bind:key="genKey([n])">
                <note-clock
                v-bind:notes="node2Notes([n])"
                v-bind:nodes="[n]"
                v-bind:center="center"
                v-bind:radius="radius"
                v-bind:intervals="intervals"/>
            </clickToPlayWrapper>
            
        </svg>
    `
})

// The App's main object, handling global concerns
var proto = new Vue({
    el: '#proto',
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
        synth: JZZ.synth.Tiny(),//JZZ.synth.MIDIjs({ 
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
        player: JZZ.MIDI.SMF().player()
    },
    computed: {
        buttonText: function(){
            if (this.player.playing) {
                return 'Stop'
            }else{
                return 'Play'
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
        midiHandler: function (event){
            noteIndex = (event.getNote()+3) %12
            if(event.isNoteOn()){
                this.notes[noteIndex].count++;
            }else if(event.isNoteOff()){
                this.notes[noteIndex].count--;
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
        //TODO: add a button to manually trigger this
        resetNotes: function(){
            for (note of this.notes){
                note.count = 0;
            }
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

