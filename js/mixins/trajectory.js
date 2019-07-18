
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
        //TODO: Override for events generated from within the Tonnetz (position is known)
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
    }
}

var Tonnetz_trajectory = true