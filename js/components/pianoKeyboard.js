// A wrapper component for JZZ's keyboard element
let pianoKeyboard = {
    props:{
        id:{
            type:String,
            default: 'piano'
        },
        keybinds:{
            type:Boolean,
            default: false
        }
    },
    template: `
        <div :id="id">
        </div>
    `,
    mounted: function(){
        piano = JZZ.input.Kbd(
            {
                at:this.id, 
                from:'C3', 
                to:'B7', 
                onCreate:function() {
                    this.getBlackKeys().setStyle({color:'#fff'});

                    if(this.keybinds){
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
                    }
                }
            });
        midiBus.midiThru.connect(piano);
        piano.connect(midiBus.midiThru);
    }
}

var Tonnetz_piano = true