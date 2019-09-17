//Component aggregating a tonnetz with a selector

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

let tonnetzSelector = {
    props:{
        value:{
            type:Object
        }
    },
    data:function(){return{
        tonnetze:tonnetze3,
    }},
    computed:{
        strings: function(){return this.$root.strings}
    },
    template:`
    <div class="button-row">
        <div class="options">
            <button v-for="tonnetz in tonnetze" 
            v-on:click="$emit('input',{intervals:tonnetz,type:value.type})" 
            v-bind:class="{active:tonnetz==value.intervals}">
                {{ tonnetz.join(', ') }}
            </button>
        </div>
        <button v-on:click="$emit('input',{intervals:value.intervals,type:(value.type=='chicken'?'tonnetz':'chicken')})"
        v-bind:class="{active: value.type=='chicken'}">
            {{ strings.dual }}
        </button>
    </div>
    `
}

let tonnetzView = {
    components: {tonnetzPlan,chickenWire,dragZoomSvg,tonnetzSelector},
    props:{
        // The initial value for the Tonnetz
        initTonnetz:{
            type: Array,
            default: () => [3,4,5]
        },
        // The initial type of display
        initType:{
            type: String,
            default: 'tonnetz'
        },
        notes:{
            type:Array,
            required: true
        },
        // Should we draw the trajectory ?
        trace:{
            type:Boolean,
            default:false
        }
    },
    data: function(){return{
        // The list of all 3-interval Tonnetze
        tonnetze: tonnetze3,
        graph: {
            // The selected interval set
            intervals:tonnetze3.find(value => arrayEquals(this.initTonnetz,value)), //Find so that the arrays compare equal
            // The type of representation for the main window ('tonnetz' or 'chicken')
            type: this.initType
        },
        // Should drag and zoom be locked ?
        lock: true,
        strings:this.$root.strings,
    }},
    computed:{
        intervals: function(){
            return this.graph.intervals
        },
        type: function(){
            return this.graph.type
        },
        isConnected: function(){
            return this.intervals.reduce(gcd,12)===1;
        }
    },
    template:`
    <div class="tonnetzView">
    <drag-zoom-svg v-bind:height="600" v-bind:width="1000" :lock="lock">
        <template v-slot="slotProps">
            <tonnetz-plan v-if="type=='tonnetz'" v-bind:notes="notes" v-bind:intervals="intervals" :bounds="slotProps.bounds" :trace="trace"></tonnetz-plan>
            <chicken-wire v-else v-bind:notes="notes" :bounds="slotProps.bounds" v-bind:intervals="intervals" :trace="trace"></chicken-wire>
        </template>
    </drag-zoom-svg>

    <tonnetz-selector v-model="graph"></tonnetz-selector>
    <p class="warning" :style="isConnected ? {visibility:'hidden'} : {}">{{ strings.connected }}</p>
    </div>
    `
}

var Tonnetz_tonnetzView = true;