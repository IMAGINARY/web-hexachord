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

Vue.component('note-node',{
    props: ['note','node'],
    computed: {
        x : function (){
            return this.node.x * xstep * baseSize;
        },
        y : function (){
            return (this.node.y + this.node.x/2) * baseSize;
        },
        isActive : function(){
            return this.note.count > 0;
        }
    },
    template: `
        <g>
            <circle v-bind:class="{activeNode:isActive}" 
                v-bind:cx="x" v-bind:cy="y" r="12">
            </circle> 
            <text v-bind:x="x" v-bind:y="y">
                {{ note.text }}
            </text>
        </g>
        `
})

Vue.component('dichord',{
    props: ['notes','nodes'],
    computed: {
        coords: function (){
            return {
                x1 : this.nodes[0].x * xstep * baseSize,
                x2 : this.nodes[1].x * xstep * baseSize,
                y1 : (this.nodes[0].y + this.nodes[0].x/2) * baseSize,
                y2 : (this.nodes[1].y + this.nodes[1].x/2) * baseSize
            }
        },
        isActive: function(){
            //return this.notes[0].isActive && this.notes[1].isActive;
            return this.notes.every(elem => elem.count > 0);
        }
    },
    template: `
        <line v-bind:class="{activeDichord:isActive}" 
            v-bind="coords">
        </line> 
        `
})

Vue.component('trichord',{
    props: ['notes','nodes'],
    computed: {
        coords: function (){
            return this.nodes.map(node => ({x:node.x * xstep * baseSize,
                                            y:(node.y + node.x/2) * baseSize
                                          }) );
        },
        points: function (){
            return this.coords.map( ({x,y}) => `${x},${y}` ).join(' ')
        },
        isActive: function(){
            //return this.notes[0].isActive && this.notes[1].isActive;
            return this.notes.every(elem => elem.count > 0);
        }
    },
    template: `
        <polygon v-bind:class="{activeTrichord:isActive}" 
            v-bind:points="points"/>
        `
})

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
    data: function(){return {
        tx : 0,
        ty : 0,
        scale: 1,
        captureMouse: false,
        clickedPos: {x:0,y:0},
        //size: {height: baseSize*10, width: baseSize*10},
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
            var multiplier = Math.exp(wheelEvent.wheelDelta/600)
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
        }
    },
    template: `
        <svg id="svg" class="tonnetz" 
            v-bind:width="width" v-bind:height="height" 
            v-bind:viewbox="viewbox"
            v-on:wheel.prevent="zoomInOut"
            v-on:mousedown="captureOn"
            v-on:mouseup="captureOff"
            v-on:mouseleave="captureOff"
            v-on:mousemove="drag">
            <g ref="trans" v-bind:transform="transform">
                <trichord v-for="n in trichordList"
                    v-bind:key="genKey(n)"
                    v-bind:notes="node2Notes(n)"
                    v-bind:nodes="n"/>
                <dichord v-for="n in dichordList"
                    v-bind:key="genKey(n)"
                    v-bind:notes="node2Notes(n)"
                    v-bind:nodes="n"/>
                <note-node v-for="n in nodeList" 
                    v-bind:key="genKey([n])"
                    v-bind:note="node2Notes([n])[0]"
                    v-bind:node="n"/>
            </g>
        </svg>
    `

})

var piano = JZZ.input.Kbd({at:'piano', from:'C5', to:'B5', onCreate:function() {
    this.getBlackKeys().setStyle({color:'#fff'});
    this.getKey('C5').setInnerHTML('<span class=inner>Z</span>');
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
            {text: 'F#', count:0},
            {text: 'G',  count:0},
            {text: 'G#', count:0}
        ],
        loadlog: "*** MIDI.js is loading soundfont... ***",
        
        synth: JZZ.synth.MIDIjs({ 
            soundfontUrl: "https://raw.githubusercontent.com/mudcube/MIDI.js/master/examples/soundfont/", 
            instrument: "acoustic_grand_piano" })
                .or(function(){ proto.loaded(); alert('Cannot load MIDI.js!\n' + this.err()); })
                .and(function(){ proto.loaded(); }),  
        ascii: JZZ.input.ASCII({
                W:'C5', S:'C#5', X:'D5', D:'D#5', C:'E5', V:'F5',
                G:'F#5', B:'G5', H:'Ab5', N:'A5', J:'Bb5', M:'B5'
                }),
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
        this.keyboard.connect(piano)
        piano.connect(this.synth);
        piano.connect(this.midiHandler)   
    },
    methods:{
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
        resetNotes: function(){
            for (note of this.notes){
                note.count = 0;
            }
        },
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
        }
    }

})






// Mary had a little lamb
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

