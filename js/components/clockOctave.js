
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