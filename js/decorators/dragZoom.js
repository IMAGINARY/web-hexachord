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

var Tonnetz_dragZoom = true